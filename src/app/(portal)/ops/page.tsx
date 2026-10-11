// Operations portal root -- Feature 1003, auth + roles.
// Architecture & Routing / The doors: `/ops`, login required (ops; the owner
// role unlocks the owner-only sections inside it -- both share this door).
//
// Feature 4001, plan decision 11: the queue is ops' dashboard, so a login that
// reaches this page is sent straight to /ops/jobs, server-side. Feature 1018:
// the Portal shell's login gate draws the login card (logged out) or the
// wrong-portal card (another role) at this same URL and never renders this
// page then; a good login re-renders the layout, which renders it, and it
// lands on the queue.
import { redirect } from "next/navigation";

export default function OpsPage() {
  redirect("/ops/jobs");
}
