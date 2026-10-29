// Set a password helpers for the browser tests -- Feature 3004, guest to account.
//
// The real link only exists inside a delivered email, which a browser test cannot read. The
// backend's non-production hook (backend/src/test-data/routes.ts) hands back the path of the Set a
// new password page for the latest Set your password email sent to a customer labelled as test data.
import { expect, type APIRequestContext } from "@playwright/test";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

/** The customer asks for a link (as the Set a password page does), and the path of the link she is sent. */
export async function askForSetPasswordLink(request: APIRequestContext, email: string): Promise<string> {
  const asked = await request.post(`${apiUrl}/api/account/set-password-request`, { data: { email } });
  expect(asked.status()).toBe(200);
  let path = "";
  await expect
    .poll(
      async () => {
        const res = await request.post(`${apiUrl}/api/test-data/customers/set-password-link`, { data: { email } });
        path = res.status() === 200 ? ((await res.json()) as { path: string }).path : "";
        return path;
      },
      { timeout: 20_000, intervals: [500] },
    )
    .not.toBe("");
  return path;
}
