// The account offer under the review card -- Feature 3004, guest to account.
//
// One Caption line with a Link, by who is looking (design, Guest by default):
//   guest                          -> "Want to track all your jobs? Set a password"  -> /set-password
//   has a login, not logged in     -> "Log in to see all your jobs"                  -> /account
//   logged in                      -> "Go to your jobs"                              -> /account
// The first two come from the review read; "logged in" is the browser's own session.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { ReviewAccount } from "./types";

const linkClass = "underline underline-offset-2";

export function ReviewAccountOffer({ account }: { account: ReviewAccount }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (account !== "has_login") return;
    let live = true;
    authClient
      .getSession()
      .then((result) => {
        const role = (result.data?.user as { role?: string } | undefined)?.role;
        if (live) setLoggedIn(role === "customer");
      })
      .catch(() => {
        if (live) setLoggedIn(false);
      });
    return () => {
      live = false;
    };
  }, [account]);

  return (
    <p className="mt-4 text-center text-caption text-muted-text" data-testid="review-account-offer">
      {account === "guest" ? (
        <>
          Want to track all your jobs?{" "}
          <Link href="/set-password" className={linkClass}>
            Set a password
          </Link>
        </>
      ) : loggedIn === true ? (
        <Link href="/account" className={linkClass}>
          Go to your jobs
        </Link>
      ) : (
        <Link href="/account" className={linkClass}>
          Log in to see all your jobs
        </Link>
      )}
    </p>
  );
}
