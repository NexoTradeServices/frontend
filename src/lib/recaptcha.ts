// reCAPTCHA v3 -- Feature 3001, enquiry form to job created.
//
// Invisible: no widget, no challenge. A script loads once, and a fresh
// token is minted on submit (execute()). Identity & Access / Authentication
// & Security: the token is verified SERVER-SIDE against the threshold
// constant; this file only ever mints it. When the key is missing or the
// script fails to load, execute() resolves undefined -- the caller submits
// with no token, which the backend treats exactly like an unreachable check
// (never a block -- "outside services degrade, never block").
"use client";

const SCRIPT_ID = "google-recaptcha-script";

interface GoogleRecaptchaNamespace {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: GoogleRecaptchaNamespace;
  }
}

function loadScript(siteKey: string): Promise<GoogleRecaptchaNamespace> {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha) {
      window.grecaptcha.ready(() => resolve(window.grecaptcha as GoogleRecaptchaNamespace));
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => {
        window.grecaptcha?.ready(() => resolve(window.grecaptcha as GoogleRecaptchaNamespace));
      });
      existing.addEventListener("error", () => reject(new Error("recaptcha script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.addEventListener("load", () => {
      window.grecaptcha?.ready(() => resolve(window.grecaptcha as GoogleRecaptchaNamespace));
    });
    script.addEventListener("error", () => reject(new Error("recaptcha script failed to load")));
    document.head.appendChild(script);
  });
}

/**
 * A fresh token for `action`, or undefined when the site key is missing or
 * the script/call fails -- never throws, the caller always has something to
 * submit with.
 */
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return undefined;
  try {
    const grecaptcha = await loadScript(siteKey);
    return await grecaptcha.execute(siteKey, { action });
  } catch {
    return undefined;
  }
}
