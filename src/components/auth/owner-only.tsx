// Owner only -- Feature 1018, the frontend frame (Authentication & Security).
//
// An ops login (Mike) is in his own portal but at a page that is the owner's:
// the Portal frame stays and the page shows one Message card in the Narrow
// container. Replaces the Focused-frame "Wrong portal" card these pages drew.
import { Container } from "@/components/frame/container";
import { MessageCard } from "@/components/ui/message-card";
import type { SessionUser } from "@/lib/session";

export function OwnerOnly({ user }: { user: SessionUser | null }) {
  return (
    <Container width="narrow">
      <MessageCard title="Owner only" primary={{ label: "Go to Jobs", href: "/ops/jobs" }}>
        {user ? `You're logged in as ${user.name}. ` : ""}This page is for the owner&apos;s login.
      </MessageCard>
    </Container>
  );
}
