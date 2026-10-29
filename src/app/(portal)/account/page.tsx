// Customer portal root -- Feature 1003, auth + roles; Feature 6010, customer portal.
// Architecture & Routing / The doors: `/account`, login required (customer). The login gate and the
// wrong-portal card are the Portal shell's; a logged-in customer lands on Jobs.
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (user === null) return null;
  redirect("/account/jobs");
}
