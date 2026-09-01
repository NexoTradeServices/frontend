// Toggle switch -- frontend-conventions.md, Components / Toggle switch.
//
// On/off: filled accent orange when on, a neutral track when off. Confirmed
// live on Base UX Elements and drawn again for the GST switch on the Ops
// Portal Shell style reference, 01 Sep 2026 -- the neutral track color
// (#cfd4da) comes from that reference; there is no named token for an
// off-state track yet.
export function ToggleSwitch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${
        checked ? "bg-brand-accent" : "bg-[#cfd4da]"
      }`}
    >
      <span
        className={`absolute top-[2px] size-[18px] rounded-full bg-white transition-[left] ${
          checked ? "left-5" : "left-[2px]"
        }`}
      />
    </button>
  );
}
