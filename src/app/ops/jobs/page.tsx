// The job queue -- Feature 4001, ops job queue and job detail.
// Architecture & Routing / Page inventory: `/ops/jobs`, ops + owner -- the
// portal root `/ops` lands here after login.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { JobQueue } from "@/components/jobs/job-queue";
import type { QueueResult } from "@/components/jobs/types";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function JobsPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/jobs?status=open&limit=50`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const initial = (await res.json()) as QueueResult;

  return (
    <PortalShell
      user={user}
      active="jobs"
      title="Jobs"
      subtitle="Open work - new enquiries first, oldest waiting at the top."
      displayName={displayName}
    >
      <JobQueue initial={initial} />
    </PortalShell>
  );
}
