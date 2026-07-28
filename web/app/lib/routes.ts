/**
 * Which downstream surfaces actually exist in this build.
 *
 * This is a build-order gate, NOT a feature flag — there is nothing to
 * configure and no runtime that reads it. The four-stage Navbar and the /plan
 * CTA both point at stages the product genuinely has, and until a stage's route
 * is merged, pointing at it means shipping a 404 on `main`. Flipping a boolean
 * here is the whole handover: when web/app/session/page.tsx lands, set
 * `session: true` in the same commit and delete nothing else.
 *
 * (`NEXT_PUBLIC_ENABLE_VIDEO` is the opposite thing and lives in env, because
 * it is a real runtime decision that survives the Wednesday go/no-go.)
 */
export const ROUTE_READY = {
  session: true,
  debrief: true,
} as const;
