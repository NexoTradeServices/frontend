// Feature 3006 -- when the enquiry page shows the form and when it shows only
// the "call us" Alert strip.
//
// reCAPTCHA is a gate on the live site: with no key there, the form takes
// nothing. The live site is the Vercel production deployment, read from
// VERCEL_ENV -- never NODE_ENV: CI's browser tests serve a production build
// with no site key, and must keep showing the form.

export interface EnquiriesOpenInput {
  /** From the backend's form-data: false when it has no reCAPTCHA secret on the live site. */
  takingEnquiries: boolean | undefined;
  /** NEXT_PUBLIC_RECAPTCHA_SITE_KEY */
  siteKey: string | undefined;
  /** VERCEL_ENV -- "production" only on the live site. */
  vercelEnv: string | undefined;
}

export function enquiriesOpen({ takingEnquiries, siteKey, vercelEnv }: EnquiriesOpenInput): boolean {
  if (takingEnquiries === false) return false;
  if (vercelEnv === "production" && !siteKey?.trim()) return false;
  return true;
}
