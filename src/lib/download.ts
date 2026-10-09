// Saving a file the API sends -- Feature 6003 (the payout run's CSV).
//
// The download needs the session, so a plain link will not do: the page asks for the file with its
// cookie and hands the browser the bytes. The file's name is the API's (Content-Disposition).
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

/** The file name in a Content-Disposition header, or the fallback. */
export function fileNameFrom(disposition: string | null, fallback: string): string {
  const match = disposition === null ? null : /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

/** Fetch `path` on the API with the session and save the response as a file. Throws when the API refuses. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`${apiUrl}${path}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`download failed: ${String(res.status)}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileNameFrom(res.headers.get("content-disposition"), fallbackName);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
