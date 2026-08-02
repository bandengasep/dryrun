"use client";

// The rehearsal state machine.
//
// The API route (/api/session/turn) is stateless — every request re-sends the
// whole {plan, transcript, questionIndex}. This hook is the client half of
// that contract: it owns which question we're on, how many follow-ups have
// been used, and the streaming buffer for the reply in flight.
//
// questionIndex and followupsUsed are DELIBERATELY not their own pieces of
// state — they are derived from the transcript on every render (see
// `deriveQuestionIndex` / `countInterviewerTurns` below), because the
// transcript is what survives a refresh (sessionStorage) and a second,
// independently-mutated counter is exactly the kind of thing that drifts from
// it. The one piece of protocol that does NOT survive a refresh is the model's
// suggested `action` for the turn most recently in flight — it is never
// written into the transcript (see core's session module), so a refresh that
// lands between a candidate's answer and the interviewer's next line resumes
// by re-asking at the same question index rather than guessing what the model
// would have said. See `mount effect` below for the exact rule.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_FOLLOWUPS,
  streamingReply,
  type InterviewQuestion,
  type SessionPlan,
  type TranscriptTurn,
  type TurnAction,
} from "@dryrun/core";
import { useSession, useSessionDispatch } from "../lib/session-state";
import { readSSE } from "../lib/stream";
import { ensureMockFlagFromUrl, mockEnabled, mockTurn } from "../lib/mock";

export type SessionPhase = "asking" | "awaiting_answer" | "wrapped" | "error";

export interface ProviderInfo {
  name: string;
  model: string;
  failover: boolean;
}

export interface UsageInfo {
  provider: string;
  model: string;
  usage: unknown;
}

export interface InterviewSession {
  plan: SessionPlan | null;
  transcript: TranscriptTurn[];
  phase: SessionPhase;
  currentQuestionIndex: number;
  currentQuestion: InterviewQuestion | null;
  followupsUsed: number;
  maxFollowups: number;
  /** Cleaned (sentinel-stripped) text of the reply streaming in right now. */
  streamingText: string;
  provider: ProviderInfo | null;
  usage: UsageInfo | null;
  error: string | null;
  draft: string;
  setDraft: (value: string) => void;
  sendAnswer: () => void;
  retry: () => void;
  isMock: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reveal a mock reply in 2-3 chunks so the offline demo still reads as a
 * stream rather than text appearing all at once.
 */
async function revealMockReply(
  text: string,
  onChunk: (buffer: string) => void,
): Promise<void> {
  const words = text.split(" ");
  const chunkCount = Math.min(3, Math.max(1, words.length));
  const chunkSize = Math.ceil(words.length / chunkCount);
  let buffer = "";
  for (let i = 0; i < words.length; i += chunkSize) {
    await sleep(120);
    const piece = words.slice(i, i + chunkSize).join(" ");
    buffer = buffer ? `${buffer} ${piece}` : piece;
    onChunk(buffer);
  }
  // Degenerate case: an empty reply never enters the loop above, but the
  // caller still expects at least one chunk callback.
  if (text === "") onChunk("");
}

/** How many interviewer turns exist for a given question so far. */
function countInterviewerTurns(transcript: TranscriptTurn[], questionId: string): number {
  return transcript.filter((t) => t.role === "interviewer" && t.questionId === questionId).length;
}

/**
 * The active question index: the highest plan index that has any transcript
 * turn against it. Turns only ever accumulate against increasing indices
 * (the client never rewinds a session), so "highest index touched" is always
 * "the question we're on" — including right after a refresh.
 */
function deriveQuestionIndex(plan: SessionPlan, transcript: TranscriptTurn[]): number {
  let idx = 0;
  for (let i = 0; i < plan.questions.length; i++) {
    if (transcript.some((t) => t.questionId === plan.questions[i].id)) idx = i;
  }
  return idx;
}

export function useInterviewSession(): InterviewSession {
  const { plan, transcript } = useSession();
  const dispatch = useSessionDispatch();

  const [phase, setPhase] = useState<SessionPhase>("asking");
  const [streamBuffer, setStreamBuffer] = useState("");
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isMock, setIsMock] = useState(false);

  // Generation counter: guards against a stale request (an aborted retry, a
  // strict-mode double effect) applying its result after a newer one has
  // already taken over.
  const genRef = useRef(0);
  const pendingRef = useRef<{ index: number; transcript: TranscriptTurn[] } | null>(null);
  const mountedKickoff = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Leaving the rehearsal retires every turn still in flight. Without this a
  // stalled stream — the very case someone walks away from — lands its `meta`
  // after they have gone and appends an interviewer turn nobody ever saw; and
  // because `transcript/append` nulls the debrief, a turn arriving after the
  // debrief compiled leaves that page permanently blank (its compile effect
  // latches once and will not re-run). Bumping the generation makes every
  // in-flight handler stale; the abort stops the work as well as its effects.
  //
  // The kickoff latch is released here too, and it has to be: StrictMode's
  // dev remount runs this cleanup between the two effect passes, and the latch
  // is a ref that survives it. Retiring the request without releasing the
  // latch would abort the opening question and never ask another one.
  useEffect(() => {
    return () => {
      genRef.current++;
      abortRef.current?.abort();
      mountedKickoff.current = false;
    };
  }, []);

  // ?mock=1 sticks for the rest of the tab session — set the flag before
  // anything else runs so the very first turn request already sees it.
  useEffect(() => {
    ensureMockFlagFromUrl();
    setIsMock(mockEnabled());
  }, []);

  const requestTurn = useCallback(
    async (index: number, baseTranscript: TranscriptTurn[]) => {
      if (!plan) return;
      const gen = ++genRef.current;
      const stale = () => gen !== genRef.current;

      pendingRef.current = { index, transcript: baseTranscript };
      setPhase("asking");
      setStreamBuffer("");
      setProvider(null);
      setUsage(null);
      setError(null);

      const finishTurn = (reply: string, action: TurnAction) => {
        const question = plan.questions[index];
        if (!question) return;

        const priorCount = countInterviewerTurns(baseTranscript, question.id);
        const followupsUsedSoFar = Math.max(0, priorCount - 1);

        const turn: TranscriptTurn = {
          role: "interviewer",
          questionId: question.id,
          text: reply,
          mode: "text",
          videoId: null,
          timedWords: null,
        };
        dispatch({ type: "transcript/append", turn });
        const transcriptAfter = [...baseTranscript, turn];

        const isLast = index === plan.questions.length - 1;

        if (action === "wrap_up") {
          setPhase("wrapped");
          return;
        }

        // Either the model said to advance, or it asked for a follow-up we've
        // already used up our cap on — both resolve the same way: move on.
        if (action === "advance" || followupsUsedSoFar >= MAX_FOLLOWUPS) {
          if (isLast) {
            setPhase("wrapped");
          } else {
            void requestTurn(index + 1, transcriptAfter);
          }
          return;
        }

        setPhase("awaiting_answer");
      };

      if (mockEnabled()) {
        const { reply, action } = mockTurn(plan, baseTranscript, index);
        await revealMockReply(reply, (buffer) => {
          if (!stale()) setStreamBuffer(buffer);
        });
        if (stale()) return;
        finishTurn(reply, action);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/session/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, transcript: baseTranscript, questionIndex: index }),
          signal: controller.signal,
        });
        if (stale()) return;

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (stale()) return;
          setError(
            typeof body?.error === "string"
              ? body.error
              : `The interviewer service returned ${res.status}.`,
          );
          setPhase("error");
          return;
        }

        let metaSeen = false;
        let sawError = false;

        await readSSE(res, {
          provider: (data: ProviderInfo) => {
            if (!stale()) setProvider(data);
          },
          delta: (data: { text: string }) => {
            if (stale()) return;
            setStreamBuffer((b) => b + data.text);
          },
          usage: (data: UsageInfo) => {
            if (!stale()) setUsage(data);
          },
          meta: (data: { action: TurnAction; reply: string }) => {
            metaSeen = true;
            if (stale()) return;
            finishTurn(data.reply, data.action);
          },
          done: () => {},
          error: (data: { message?: string }) => {
            sawError = true;
            if (stale()) return;
            setError(data.message ?? "The interviewer stream failed.");
            setPhase("error");
          },
        });

        if (stale()) return;
        if (!metaSeen && !sawError) {
          // The stream closed without a `meta` or `error` event — per the
          // shared SSE contract, that is itself a failure, never a success.
          setError("The interviewer stream ended before completing.");
          setPhase("error");
        }
      } catch (e) {
        // An abort is this screen going away, not a turn that failed.
        if (stale() || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    },
    [plan, dispatch],
  );

  // Kick off exactly once per mounted plan: either the opening question (empty
  // transcript), a resume of an in-flight answer (last turn is the candidate's
  // — the meta that would have followed it was never persisted, so the only
  // honest move is to ask again), or picking the conversation back up where an
  // interviewer turn is already waiting for a reply.
  useEffect(() => {
    if (!plan) return;
    if (mountedKickoff.current) return;
    mountedKickoff.current = true;

    if (transcript.length === 0) {
      void requestTurn(0, transcript);
      return;
    }
    const last = transcript[transcript.length - 1];
    if (last.role === "candidate") {
      const idx = deriveQuestionIndex(plan, transcript);
      void requestTurn(idx, transcript);
    } else {
      setPhase("awaiting_answer");
    }
    // Deliberately mount-only: requestTurn and transcript are read at their
    // value at mount time, not re-run as the transcript grows from the
    // session's own subsequent turns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const currentQuestionIndex = useMemo(
    () => (plan ? deriveQuestionIndex(plan, transcript) : 0),
    [plan, transcript],
  );
  const currentQuestion = plan ? (plan.questions[currentQuestionIndex] ?? null) : null;
  const followupsUsed = useMemo(() => {
    if (!currentQuestion) return 0;
    return Math.max(0, countInterviewerTurns(transcript, currentQuestion.id) - 1);
  }, [transcript, currentQuestion]);

  // streamingReply withholds any tail that could still resolve into the META
  // sentinel — including a partial one mid-delta — so wire protocol never
  // flashes. The meta frame's cleaned reply reconciles the turn at stream end.
  const streamingText = useMemo(() => streamingReply(streamBuffer), [streamBuffer]);

  const sendAnswer = useCallback(() => {
    if (!plan) return;
    if (phase !== "awaiting_answer") return;
    const text = draft.trim();
    if (!text) return;
    const question = plan.questions[currentQuestionIndex];
    if (!question) return;

    const turn: TranscriptTurn = {
      role: "candidate",
      questionId: question.id,
      text,
      mode: "text",
      videoId: null,
      timedWords: null,
    };
    dispatch({ type: "transcript/append", turn });
    const newTranscript = [...transcript, turn];
    setDraft("");
    void requestTurn(currentQuestionIndex, newTranscript);
  }, [plan, phase, draft, currentQuestionIndex, dispatch, transcript, requestTurn]);

  const retry = useCallback(() => {
    if (!pendingRef.current) return;
    const { index, transcript: base } = pendingRef.current;
    void requestTurn(index, base);
  }, [requestTurn]);

  return {
    plan,
    transcript,
    phase,
    currentQuestionIndex,
    currentQuestion,
    followupsUsed,
    maxFollowups: MAX_FOLLOWUPS,
    streamingText,
    provider,
    usage,
    error,
    draft,
    setDraft,
    sendAnswer,
    retry,
    isMock,
  };
}
