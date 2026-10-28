// Server-side reads for the customer portal -- Feature 6010.
//
// The portal pages are server components: each reads `/api/account/...` with the visitor's own cookie,
// so what a customer sees is only ever what the API says is hers. A record that is not hers answers 404.
import { cookies } from "next/headers";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function accountGet<T>(path: string): Promise<{ status: number; data: T | null }> {
  const cookieStore = await cookies();
  try {
    const res = await fetch(`${apiUrl}/api/account${path}`, { headers: { cookie: cookieStore.toString() }, cache: "no-store" });
    return { status: res.status, data: res.status === 200 ? ((await res.json()) as T) : null };
  } catch {
    return { status: 0, data: null };
  }
}
