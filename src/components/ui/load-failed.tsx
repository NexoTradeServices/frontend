"use client";

// A page whose data could not be read -- Feature 1018; "Try again" by Feature 9001.
//
// Before the frame, a failed read of a page's data drew the wrong-portal
// card, which told the person something false. Now the gate is the Portal
// shell's and a failed read says what it is, in one Message card: the title,
// the line, and the one Primary "Try again" that loads the page again
// (Pages / Whole-page rules). The shell around it stays.
import { Container } from "@/components/frame/container";
import { MessageCard } from "@/components/ui/message-card";

export function LoadFailed() {
  return (
    <Container width="narrow">
      <MessageCard title="This page didn't load" primary={{ label: "Try again", onClick: () => window.location.reload() }}>
        Try again in a moment.
      </MessageCard>
    </Container>
  );
}
