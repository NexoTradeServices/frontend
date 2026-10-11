// The Focused shell's layout file -- Feature 1018; Templates / Shells.
//
// One layout over every one-task page: the enquiry form and its
// confirmation, the link pages (Respond, Approve), forgot and set-a-new
// password. The Top bar carries the Wordmark only; no footer, no sidebar.
import type { ReactNode } from "react";
import { FocusedShell } from "@/components/frame/focused-shell";
import { getDisplayName } from "@/lib/identity";

export default async function FocusedLayout({ children }: { children: ReactNode }) {
  const displayName = await getDisplayName();
  return <FocusedShell displayName={displayName}>{children}</FocusedShell>;
}
