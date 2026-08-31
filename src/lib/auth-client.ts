// The Better Auth client -- Feature 1003, auth + roles.
//
// Every state-changing auth call (sign in, sign out, request/apply a
// password reset) goes through this one client. It talks to the backend's
// /api/auth/* handler only -- decision 1: one auth brain, server-side, the
// frontend a credentialed fetch away from it. Nothing here duplicates a rule
// Better Auth already enforces (password length, token expiry, no
// enumeration) -- the backend is the source of truth for all of it.
"use client";

import { createAuthClient } from "better-auth/client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const authClient = createAuthClient({
  baseURL: `${apiUrl}/api/auth`,
  fetchOptions: { credentials: "include" },
});
