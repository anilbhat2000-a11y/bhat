// Simple decorative drawings for empty states (inline SVG, brand colours, no external files).
export function Illustration({ name }: { name: "calendar" | "team" | "award" }) {
  const common = { width: 180, height: 120, viewBox: "0 0 180 120", "aria-hidden": true as const, className: "illustration" };
  if (name === "calendar") {
    return (
      <svg {...common}>
        <ellipse cx="90" cy="108" rx="62" ry="7" fill="var(--surface-2)" />
        <rect x="45" y="22" width="90" height="78" rx="10" fill="var(--surface)" stroke="var(--brand-blue)" strokeWidth="3" />
        <rect x="45" y="22" width="90" height="20" rx="10" fill="var(--brand-blue)" />
        <rect x="62" y="14" width="6" height="16" rx="3" fill="var(--brand-green)" />
        <rect x="112" y="14" width="6" height="16" rx="3" fill="var(--brand-green)" />
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
          <rect key={`${r}-${c}`} x={57 + c * 18} y={52 + r * 15} width="12" height="9" rx="2" fill={r === 1 && c === 2 ? "var(--brand-teal)" : "var(--surface-2)"} />
        )))}
        <circle cx="138" cy="86" r="18" fill="var(--surface)" stroke="var(--brand-teal)" strokeWidth="3" />
        <path d="M138 76v11l7 5" stroke="var(--brand-teal)" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "award") {
    return (
      <svg {...common}>
        <ellipse cx="90" cy="108" rx="50" ry="7" fill="var(--surface-2)" />
        <path d="M74 66l-10 38 14-7 8 12 8-30z M106 66l10 38-14-7-8 12-8-30z" fill="var(--brand-teal)" />
        <circle cx="90" cy="50" r="32" fill="var(--surface)" stroke="var(--brand-blue)" strokeWidth="4" />
        <path d="M90 33l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="var(--brand-green)" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <ellipse cx="90" cy="108" rx="70" ry="7" fill="var(--surface-2)" />
      <rect x="58" y="70" width="64" height="34" rx="4" fill="var(--surface)" stroke="var(--brand-blue)" strokeWidth="3" />
      <rect x="66" y="76" width="48" height="22" rx="2" fill="var(--accent-soft)" />
      {[[40, "var(--brand-green)"], [90, "var(--brand-blue)"], [140, "var(--brand-teal)"]].map(([x, color]) => (
        <g key={String(x)}>
          <circle cx={Number(x)} cy="34" r="12" fill={String(color)} />
          <path d={`M${Number(x) - 18} 74c0-14 8-24 18-24s18 10 18 24`} fill={String(color)} opacity="0.85" />
        </g>
      ))}
    </svg>
  );
}
