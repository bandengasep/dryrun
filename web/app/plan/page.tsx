"use client";

// "Your interview, compiled" — Paper artboard "plan — your interview, compiled".
//
// Two artifacts on one page, and the order matters: the gaps render the instant
// you arrive, because /api/compile already produced them, and the questions
// compile in the background from those same gaps. That is why compile is two
// calls instead of one — the diff is a first-class result, not an intermediate,
// and a failed plan compile never re-buys the parses.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Gap, InterviewQuestion, SessionPlan } from "@dryrun/core";
import { useSession, useSessionDispatch, gapForQuestion } from "../lib/session-state";
import { countByKind, KIND_ORDER, KIND_PLURAL } from "../lib/receipts";
import { ROUTE_READY } from "../lib/routes";
import { ensureMockFlagFromUrl, mockEnabled, mockPlan, MockBanner } from "../lib/mock";
import GapCard from "../components/GapCard";
import QuestionCard from "../components/QuestionCard";
import ReceiptsDrawer from "../components/ReceiptsDrawer";
import styles from "./plan.module.css";

type PlanStatus =
  | { phase: "idle" }
  | { phase: "compiling" }
  | { phase: "ready" }
  // `grounding` is a 422 from the guard: the model tried to ship a question
  // citing a gap that doesn't exist and was refused. That is the system working,
  // so it gets its own copy rather than a generic failure.
  | { phase: "error"; message: string; kind: "grounding" | "generic" };

export default function PlanScreen() {
  const router = useRouter();
  const { compile, plan } = useSession();
  const dispatch = useSessionDispatch();

  const [status, setStatus] = useState<PlanStatus>({ phase: "idle" });
  const [openGapId, setOpenGapId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ gap: Gap; question: InterviewQuestion } | null>(null);

  // React 19 Strict Mode mounts effects twice in dev; without this the plan
  // compiles twice and we pay for it twice.
  const requested = useRef(false);

  // Read after mount only — the server has no sessionStorage, so reading the
  // flag during the first client render would disagree with the server's
  // always-false render and trip a hydration mismatch. Also latches ?mock=1
  // in case this page is the mock entry point (e.g. a shared link).
  //
  // `mockReady` gates the auto-compile effect below on this resolving first.
  // Without it, the auto-compile effect's own mount pass fires in the same
  // commit as this one but reads the pre-update `mock = false` closure — the
  // `requested` ref latches on that first pass, so it would call the real
  // /api/plan fetch once and never retry with the correct (mock) branch.
  const [mock, setMock] = useState(false);
  const [mockReady, setMockReady] = useState(false);
  useEffect(() => {
    ensureMockFlagFromUrl();
    setMock(mockEnabled());
    setMockReady(true);
  }, []);

  const compilePlan = useCallback(async () => {
    if (!compile) return;
    setStatus({ phase: "compiling" });

    // Offline demo mode: synthesize the plan client-side by keyword overlap
    // instead of POSTing /api/plan — no network, no model call.
    if (mock) {
      try {
        dispatch({ type: "plan/set", plan: mockPlan(compile) });
        setStatus({ phase: "ready" });
      } catch (e) {
        setStatus({
          phase: "error",
          message: e instanceof Error ? e.message : String(e),
          kind: "generic",
        });
      }
      return;
    }

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compile),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus({
          phase: "error",
          message: typeof body?.error === "string" ? body.error : `The plan service returned ${res.status}.`,
          kind: body?.kind === "grounding" ? "grounding" : "generic",
        });
        return;
      }
      dispatch({ type: "plan/set", plan: body.plan as SessionPlan });
      setStatus({ phase: "ready" });
    } catch (e) {
      setStatus({
        phase: "error",
        message: e instanceof Error ? e.message : String(e),
        kind: "generic",
      });
    }
  }, [compile, dispatch, mock]);

  useEffect(() => {
    if (!mockReady) return;
    if (!compile || plan || requested.current) return;
    if (compile.gaps.length === 0) return;
    requested.current = true;
    void compilePlan();
  }, [compile, plan, compilePlan, mockReady]);

  const retry = () => {
    requested.current = true;
    void compilePlan();
  };

  // Nothing compiled yet — arriving here directly, or after the tab's storage
  // was cleared.
  if (!compile) {
    return (
      <main className="app-main">
        <div className={styles.content}>
          <p className="kicker">Session plan</p>
          <h1 className={`display-2 ${styles.title}`}>Nothing compiled yet</h1>
          <p className={`lead ${styles.subtitle}`}>
            A plan is built from a job description and a resume. Start there and this page fills
            itself in.
          </p>
          <button onClick={() => router.push("/compile")} className="btn btn-primary btn-lg">
            Compile your interview →
          </button>
        </div>
      </main>
    );
  }

  const counts = countByKind(compile.gaps);
  const questions = plan?.questions ?? [];

  return (
    <main className="app-main">
      <div className={styles.content}>
        {mock && <MockBanner />}

        <header className={styles.header}>
          <p className="kicker">
            Session plan · compiled from {compile.gaps.length}{" "}
            {compile.gaps.length === 1 ? "gap" : "gaps"}
          </p>
          <h1 className={styles.title}>Your interview, compiled</h1>
          <p className={styles.subtitle}>
            {compile.jd.lines.length} requirement lines · {compile.resume.lines.length} evidence
            lines · every row below cites both documents
          </p>
        </header>

        {/* The count strip replaces the readiness bar that used to live on
            /results. Same slot, but these numbers are counted from gaps that
            each carry two citations, where the bar's 65% was a constant. */}
        <div className={styles.countStrip}>
          {KIND_ORDER.map((kind) => (
            <div key={kind} className={styles.stat}>
              <span className={`${styles.statDot} ${styles[kind]}`} aria-hidden="true" />
              <span className={styles.statNumber}>{counts[kind]}</span>
              <span className={styles.statLabel}>{KIND_PLURAL[kind]}</span>
            </div>
          ))}
        </div>

        {compile.gaps.length === 0 ? (
          <section className={styles.notice}>
            <h2 className={styles.noticeTitle}>Not enough signal in these documents</h2>
            <p className={styles.noticeBody}>
              The diff found no requirement in the job description that your resume either misses
              or under-evidences. That usually means one of the two documents was too short to
              read — a fuller JD or resume gives it something to compare.
            </p>
            <p className={styles.noticeBody}>
              We won&apos;t invent gaps to fill this page.
            </p>
            <button onClick={() => router.push("/compile")} className="btn btn-outline btn-sm">
              Edit your inputs
            </button>
          </section>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>The gaps behind it</h2>
                <span className={styles.sectionNote}>every row cites both documents</span>
              </div>
              <div className={styles.list}>
                {compile.gaps.map((gap) => (
                  <GapCard
                    key={gap.id}
                    gap={gap}
                    compile={compile}
                    expanded={openGapId === gap.id}
                    onToggle={() => setOpenGapId(openGapId === gap.id ? null : gap.id)}
                  />
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>The questions you&apos;ll face</h2>
                <span className={styles.sectionNote}>
                  {status.phase === "ready" || plan
                    ? `${questions.length} question${questions.length === 1 ? "" : "s"} · each one traceable to a gap`
                    : "compiling from the gaps above"}
                </span>
              </div>

              {status.phase === "error" ? (
                <div className={styles.errorBox} role="alert">
                  <p className={styles.errorTitle}>
                    {status.kind === "grounding"
                      ? "A question was rejected for citing a gap that doesn't exist."
                      : "The questions didn't compile."}
                  </p>
                  <p className={styles.errorMessage}>{status.message}</p>
                  <p className={styles.errorHint}>
                    {status.kind === "grounding"
                      ? "The grounding guard refused to display it. Retrying re-runs only the question compile — your gaps above are untouched."
                      : "Retrying re-runs only the question compile — the parses above aren't bought again."}
                  </p>
                  <button onClick={retry} className="btn btn-outline btn-sm">
                    Retry the plan
                  </button>
                </div>
              ) : plan ? (
                <div className={styles.list}>
                  {questions.map((question) => {
                    const gap = gapForQuestion(plan, question);
                    // Unreachable in practice — compileSessionPlan throws on an
                    // unknown gapId. Rendering nothing rather than a
                    // receipt-less question is the client-side half of that
                    // guard: a bug must never become a fabricated citation.
                    if (!gap) return null;
                    return (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        gap={gap}
                        compile={compile}
                        onViewReceipts={() => setDrawer({ gap, question })}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className={styles.list} aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={styles.skeleton} />
                  ))}
                  <p className={styles.skeletonNote}>
                    Compiling one question per gap — typically under 20 seconds.
                  </p>
                </div>
              )}
            </section>

            {plan && questions.length > 0 && (
              <div className={styles.footer}>
                <span className={styles.footerNote}>
                  {questions.length} question{questions.length === 1 ? "" : "s"} compiled · nothing
                  is scored, in the session or after it
                  {!ROUTE_READY.session && " · the rehearsal room isn't in this build yet"}
                </span>
                <button
                  onClick={() => router.push("/session")}
                  disabled={!ROUTE_READY.session}
                  className="btn btn-primary btn-lg btn-shadow"
                >
                  Start the session →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ReceiptsDrawer
        gap={drawer?.gap ?? null}
        question={drawer?.question ?? null}
        compile={compile}
        onClose={() => setDrawer(null)}
      />
    </main>
  );
}
