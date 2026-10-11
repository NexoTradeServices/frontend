// Log out -- Feature 1003, auth + roles (AC10).
//
// Deletes the Session row server-side (Better Auth's own /api/auth/sign-out)
// then refreshes so the portal root re-renders as the gate.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { TextLinkButton } from "./buttons";

// `onInk`: the Sidebar and the Menu drawer draw it as a small on-ink-text link,
// 44px tall -- the gate's own text link colour would not read on ink.
export function LogoutLink({ onInk = false }: { onInk?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await authClient.signOut();
    router.refresh();
  }

  if (onInk) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleClick()}
        className="flex min-h-11 w-full items-center text-small font-semibold text-on-ink-text underline underline-offset-2"
      >
        Log out
      </button>
    );
  }

  return (
    <TextLinkButton disabled={loading} onClick={() => void handleClick()}>
      Log out
    </TextLinkButton>
  );
}
