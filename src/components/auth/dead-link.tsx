// Dead link -- Feature 1003, auth + roles (AC6, AC7).
//
// Expired or already-used, both land here: one page, the fix as the primary
// action. Confirmed live on the Portal Login Gate style reference.
import { MessageCard } from "@/components/ui/message-card";
import { TextLink } from "./buttons";

// Feature 9001: the one shared Message card, with today's words.
export function DeadLink() {
  return (
    <MessageCard
      title="This link has expired"
      primary={{ label: "Email me a fresh link", href: "/forgot-password" }}
      link={<TextLink href="/">Back to log in</TextLink>}
    >
      Reset links work once and expire after an hour
    </MessageCard>
  );
}
