"use client";

// The one place client-held session state lives.
//
// The API routes are stateless by design (AGENTS.md rule 3): nothing about a
// rehearsal is written server-side until the user presses "Save & share". That
// makes the browser the only thing holding {compile, plan, transcript, debrief},
// and every request re-sends the slice it needs.
//
// Persistence is sessionStorage, not localStorage, on purpose. sessionStorage is
// per-tab and dies with the tab, which is exactly the honest version of the
// claim we make on screen: refreshing mid-journey doesn't lose your work, and
// closing the tab does. localStorage would quietly keep someone's resume on a
// shared machine indefinitely.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  CompileResult,
  DebriefReport,
  SessionPlan,
  TranscriptTurn,
  type Gap,
  type InterviewQuestion,
} from "@dryrun/core";
import { ROUTE_READY } from "./routes";

export const SESSION_STORAGE_KEY = "dryrun-session-v1";

export type SessionState = {
  /** Parsed JD + resume + gaps. The output of /api/compile. */
  compile: CompileResult | null;
  /** The compiled interview. The output of /api/plan. */
  plan: SessionPlan | null;
  /** The rehearsal so far, oldest turn first. Re-sent on every /api/session/turn. */
  transcript: TranscriptTurn[];
  /** The output of /api/debrief. */
  debrief: DebriefReport | null;
};

const EMPTY: SessionState = {
  compile: null,
  plan: null,
  transcript: [],
  debrief: null,
};

export type SessionAction =
  /** A compile finished. Invalidates everything downstream of it. */
  | { type: "compile/set"; compile: CompileResult }
  /** A plan compiled. Invalidates the transcript and debrief it would have described. */
  | { type: "plan/set"; plan: SessionPlan }
  | { type: "transcript/append"; turn: TranscriptTurn }
  /** Replace the last turn — used while an interviewer reply streams in. */
  | { type: "transcript/replaceLast"; turn: TranscriptTurn }
  | { type: "debrief/set"; debrief: DebriefReport }
  | { type: "reset" }
  /** Rehydration from sessionStorage. Never persisted back on its own. */
  | { type: "hydrate"; state: SessionState };

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    // Both setters clear what they invalidate rather than leaving it stale.
    // A debrief quoting a transcript from a plan you've since recompiled would
    // display receipts that point at nothing — the one failure the whole
    // product is built to avoid.
    case "compile/set":
      return { compile: action.compile, plan: null, transcript: [], debrief: null };
    case "plan/set":
      return { ...state, plan: action.plan, transcript: [], debrief: null };
    case "transcript/append":
      return { ...state, transcript: [...state.transcript, action.turn], debrief: null };
    case "transcript/replaceLast": {
      if (state.transcript.length === 0) {
        return { ...state, transcript: [action.turn], debrief: null };
      }
      const transcript = state.transcript.slice(0, -1);
      transcript.push(action.turn);
      return { ...state, transcript, debrief: null };
    }
    case "debrief/set":
      return { ...state, debrief: action.debrief };
    case "reset":
      return EMPTY;
    case "hydrate":
      return action.state;
  }
}

/**
 * Rebuild a session from whatever was in storage.
 *
 * Validated rather than trusted for the same reason /api/plan re-validates its
 * body: the blob was written by some earlier build and made a round trip
 * through storage, and a half-shaped plan would produce questions whose
 * receipts resolve to nothing. Anything malformed drops back to an empty
 * session — losing state is recoverable, rendering a broken receipt is not.
 *
 * Composed from core's exported schemas by hand rather than with a z.object()
 * wrapper, because zod is core's dependency and web/ deliberately doesn't carry
 * it (AGENTS.md rule 9).
 */
function parsePersisted(raw: unknown): SessionState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;

  let compile: CompileResult | null = null;
  if (o.compile != null) {
    const parsed = CompileResult.safeParse(o.compile);
    if (!parsed.success) return null;
    compile = parsed.data;
  }

  let plan: SessionPlan | null = null;
  if (o.plan != null) {
    const parsed = SessionPlan.safeParse(o.plan);
    if (!parsed.success) return null;
    plan = parsed.data;
  }

  if (!Array.isArray(o.transcript)) return null;
  const transcript: TranscriptTurn[] = [];
  for (const turn of o.transcript) {
    const parsed = TranscriptTurn.safeParse(turn);
    if (!parsed.success) return null;
    transcript.push(parsed.data);
  }

  // Unlike compile/plan/transcript, a malformed debrief drops only itself: it
  // is downstream of the transcript rather than a prerequisite for it, so
  // there is no reason a stale or hand-edited debrief blob should cost the
  // user their whole session.
  let debrief: DebriefReport | null = null;
  if (o.debrief != null) {
    const parsed = DebriefReport.safeParse(o.debrief);
    debrief = parsed.success ? parsed.data : null;
  }

  return { compile, plan, transcript, debrief };
}

function readStoredSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage can be unavailable outright (Safari private mode, blocked
    // third-party contexts). The app works fine without persistence.
    return null;
  }
  if (!raw) return null;
  try {
    return parsePersisted(JSON.parse(raw));
  } catch {
    return null;
  }
}

const StateContext = createContext<SessionState>(EMPTY);
const DispatchContext = createContext<Dispatch<SessionAction>>(() => {});

export function SessionStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY);

  // Hydrate after mount, not during render: the server has no sessionStorage,
  // so seeding the initial state from it would make the first client render
  // disagree with the server's HTML.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readStoredSession();
    if (stored) dispatch({ type: "hydrate", state: stored });
  }, []);

  useEffect(() => {
    // Don't write before the first read, or the empty initial state would
    // overwrite a perfectly good stored session during the mount tick.
    if (!hydrated.current) return;
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded (a long transcript with timed words) or storage blocked.
      // In-memory state is unaffected; only refresh-resume is lost.
    }
  }, [state]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(StateContext);
}

export function useSessionDispatch(): Dispatch<SessionAction> {
  return useContext(DispatchContext);
}

/**
 * Which stages the user can currently reach. Drives the Navbar: a stage with no
 * state behind it is shown disabled rather than hidden, because the four stages
 * are the shape of the product and hiding them would hide what it does.
 *
 * Two things have to be true to reach a stage — the state it needs exists, and
 * its route is actually in this build. Without the second condition, enabling a
 * tab the moment its state appears would offer the user a 404.
 */
export type StageAvailability = {
  plan: boolean;
  session: boolean;
  debrief: boolean;
};

export function useStageAvailability(): StageAvailability {
  const { compile, plan, transcript } = useSession();
  return useMemo(
    () => ({
      plan: compile !== null,
      session: plan !== null && ROUTE_READY.session,
      debrief: transcript.some((t) => t.role === "candidate") && ROUTE_READY.debrief,
    }),
    [compile, plan, transcript],
  );
}

/**
 * Resolve a question's `gapId` to the gap it cites. Returns null if the chain is
 * broken — callers render nothing rather than a receipt-less question, mirroring
 * the server-side grounding guard. In practice compileSessionPlan makes this
 * unreachable; it is here so a bug can never become a fabricated citation.
 */
export function gapForQuestion(
  plan: SessionPlan,
  question: InterviewQuestion,
): Gap | null {
  return plan.gaps.find((g) => g.id === question.gapId) ?? null;
}
