// The shared wordmark -- Feature 1014, brand strings go to config.
//
// Atoms / Text and links, Wordmark: "heading font, 900, uppercase,
// letterspaced; the '&' in the business name in brand-accent. on-ink on
// ink; ink on ground in the Footer." One component; every frame piece that
// shows it renders this and nothing else draws its own copy of the markup.
//
// Decision 6: `name` is null when the identity read failed upstream -- the
// slot renders empty, never a literal fallback.
export function Wordmark({ name, onGround = false }: { name: string | null; onGround?: boolean }) {
  if (!name) return null;

  const parts = name.split("&");
  return (
    <span
      className={`font-heading text-xs font-black tracking-[0.14em] uppercase ${onGround ? "text-ink" : "text-on-ink"}`}
    >
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <span className="text-brand-accent">&amp;</span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
