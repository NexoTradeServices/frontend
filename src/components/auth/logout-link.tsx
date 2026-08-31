// Log out -- Feature 1003, auth + roles (AC10).
//
// Deletes the Session row server-side (Better Auth's own /api/auth/sign-out)
// then refreshes so the portal root re-renders as the gate.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { TextLinkButton } from "./buttons";

export function LogoutLink() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await authClient.signOut();
    router.refresh();
  }

  return (
    <TextLinkButton disabled={loading} onClick={() => void handleClick()}>
      Log out
    </TextLinkButton>
  );
}
