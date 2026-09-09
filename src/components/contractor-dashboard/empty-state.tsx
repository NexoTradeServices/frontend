// AC5 -- Empty states (frontend conventions): icon + one line, never a
// blank page. No action here: there is nothing for a contractor to do to
// bring a job on.
export function EmptyDashboard() {
  return (
    <div className="rounded-[9px] border border-hairline bg-surface px-4 py-7.5 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-hairline bg-ground text-lg text-muted-text"
      >
        &#9788;
      </div>
      <p className="mx-auto max-w-[30ch] text-secondary-text">
        Nothing on your list right now. We&apos;ll email and text you the moment a job comes your way.
      </p>
    </div>
  );
}
