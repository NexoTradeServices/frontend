// Feature 1015 -- the frontend's outside-service keys announce themselves.
//
// Both keys are NEXT_PUBLIC_ values, baked in when the app is built, so they are
// checked when the config loads: at `next build` (the Vercel build log) and at
// `next dev` start. A warning never fails the build.

/** The warning lines for the keys missing from this env, in a fixed order. */
export function startupWarnings(env: Record<string, string | undefined>): string[] {
  const lines: string[] = [];
  if (!env.NEXT_PUBLIC_GOOGLE_PLACES_KEY?.trim()) {
    lines.push("places: NEXT_PUBLIC_GOOGLE_PLACES_KEY is not set -- address fields cannot look up addresses until it is");
  }
  if (!env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim()) {
    lines.push("recaptcha: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set -- web enquiries are not bot-checked until it is");
  }
  return lines;
}

/** Log them. Never throws, never exits. */
export function logStartupWarnings(env: Record<string, string | undefined>): void {
  for (const line of startupWarnings(env)) console.warn(line);
}
