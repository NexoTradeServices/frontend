// Server-side session read -- Feature 1003, auth + roles.
//
// The portal-root pages are server components: they read who is logged in
// once, server-side, by forwarding the incoming request's cookies to the
// backend's GET /api/me (credentialed fetch, decision 1) -- no client-side
// flash of the wrong state.
import { cookies } from "next/headers";

export type Role = "customer" | "contractor" | "ops" | "owner";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${apiUrl}/api/me`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });

  if (res.status !== 200) return null;
  return (await res.json()) as SessionUser;
}
