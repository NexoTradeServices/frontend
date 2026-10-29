// Payments -- Feature 6010. No longer a page of its own (6010 UAT): what she paid is the Paid tag on Invoices and
// what was refunded is the Refunds section under the invoice list. An old link lands on Invoices.
import { redirect } from "next/navigation";

export default function AccountPaymentsPage(): never {
  redirect("/account/invoices");
}
