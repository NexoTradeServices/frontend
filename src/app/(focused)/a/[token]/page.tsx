// The respond page -- Feature 4003, accept / decline.
// Architecture & Routing / Page inventory: `/a/<token>`, no login -- the
// token in the path is the permission (Passwordless capability links, ADR
// 0004). The page reads the link server-side, so a dead link renders its
// reason on first paint, never a flash of the job.
import { Container } from "@/components/frame/container";
import { DeadLinkCard, UnavailableCard } from "@/components/respond/respond-cards";
import { RespondView } from "@/components/respond/respond-view";
import type { RespondRead } from "@/components/respond/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = { robots: { index: false, follow: false } };

export default async function RespondPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let read: RespondRead | null = null;
  try {
    const res = await fetch(`${apiUrl}/api/respond/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (res.status === 200 || res.status === 404 || res.status === 410) {
      read = (await res.json()) as RespondRead;
    }
  } catch {
    read = null;
  }

  // Page map: the link page is Medium; a dead link is the Narrow message page.
  return (
    <Container width={read !== null && read.state === "open" ? "medium" : "narrow"}>
      {read === null ? (
        <UnavailableCard />
      ) : read.state === "open" ? (
        <RespondView token={token} job={read} />
      ) : (
        <DeadLinkCard dead={read} />
      )}
    </Container>
  );
}
