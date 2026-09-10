// Trade card icons -- the frozen Request A Job style reference (25-27 Aug
// 2026). Same three paths that reference drew for Plumbing, Electrical and
// Air conditioning; anything else falls back to a plain dot so a future
// trade never renders a blank card.
export function TradeIcon({ trade }: { trade: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (trade === "Plumbing") {
    return (
      <svg {...common} className="mx-auto mb-1.5 h-5 w-5 text-ink">
        <path d="M12 2c-4 5.2-7 9.3-7 12.8A7 7 0 0 0 19 14.8C19 11.3 16 7.2 12 2z" />
      </svg>
    );
  }
  if (trade === "Electrical") {
    return (
      <svg {...common} className="mx-auto mb-1.5 h-5 w-5 text-ink">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    );
  }
  if (trade === "Air conditioning") {
    return (
      <svg {...common} className="mx-auto mb-1.5 h-5 w-5 text-ink">
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" />
        <line x1="4.2" y1="16.5" x2="19.8" y2="7.5" />
      </svg>
    );
  }
  return (
    <svg {...common} className="mx-auto mb-1.5 h-5 w-5 text-ink">
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
