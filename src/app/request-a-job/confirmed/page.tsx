// /request-a-job/confirmed -- Feature 3001, enquiry form to job created.
// AC4: the JOB reference and "we'll call you shortly" -- no "Set a
// password" offer, that ships with 3004. The reference travels in the
// query string from the form's own POST response; nothing here is fetched
// by job reference, so there is no way to enumerate someone else's job.
export const metadata = {
  title: "Request received",
};

export default async function RequestAJobConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col items-center justify-center px-5 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success-bg">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-brand-success"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-ink">We&apos;ve got it.</h1>
      <p className="mb-5 text-sm text-secondary-text">We&apos;ll call you shortly to confirm a time.</p>
      {ref ? (
        <div className="rounded-md border border-hairline bg-ground px-3 py-1.5 font-heading text-[15px] font-extrabold tracking-[0.02em] text-ink">
          {ref}
        </div>
      ) : null}
    </main>
  );
}
