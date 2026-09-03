// The shared wordmark -- Feature 1014, brand strings go to config.
//
// Layout shells: "the wordmark is the display name from the config home ...
// in Archivo 900 letterspaced uppercase; an ampersand in the name takes the
// accent colour, nothing else is styled." One component; the gate shell,
// the portal placeholder and the ops shell all render this instead of their
// own copy of the markup.
//
// Decision 6: `name` is null when the identity read failed upstream -- the
// slot renders empty, never a literal fallback.
export function Wordmark({ name }: { name: string | null }) {
  if (!name) return null;

  const parts = name.split("&");
  return (
    <span className="font-heading text-xs font-black tracking-[0.14em] text-white uppercase">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <span className="text-brand-accent">&amp;</span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
