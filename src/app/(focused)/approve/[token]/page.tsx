// The approve page -- Feature 6003, settlement run.
// Architecture & Routing / Page inventory: `/approve/<token>`, no login -- the token in the path
// is the permission (Passwordless capability links, ADR 0004). The page reads the link
// server-side, like `/a/<token>`, so a dead link renders its reason on first paint and the
// invoice never flashes before it.
import { Container } from "@/components/frame/container";
import { ApproveUnavailableCard, DeadApproveCard } from "@/components/settlements/approve-cards";
import { ApproveView } from "@/components/settlements/approve-view";
import type { ApproveRead } from "@/components/settlements/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = { robots: { index: false, follow: false } };

export default async function ApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let read: ApproveRead | null = null;
  try {
    const res = await fetch(`${apiUrl}/api/approve/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (res.status === 200 || res.status === 404 || res.status === 410) {
      read = (await res.json()) as ApproveRead;
    }
  } catch {
    read = null;
  }

  // Page map: the link page is Medium; a dead link is the Narrow message page.
  return (
    <Container width={read !== null && read.state === "open" ? "medium" : "narrow"}>
      {read === null ? (
        <ApproveUnavailableCard />
      ) : read.state === "open" ? (
        <ApproveView token={token} read={read} />
      ) : (
        <DeadApproveCard dead={read} />
      )}
    </Container>
  );
}
