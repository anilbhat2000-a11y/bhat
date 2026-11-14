import type { IconName } from "./nav";

// Simple 24px line icons, drawn inline so the portal needs no icon font or internet.
const PATHS: Record<IconName, string> = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-6h4v6",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  users: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5",
  layers: "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
  check: "M9 11.5l2.5 2.5L17 8.5M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2",
  inbox: "M3 13h5l1.5 3h5l1.5-3h5M5.5 5h13L21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  megaphone: "M3 10v4h3l7 4V6L6 10zM16 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  shield: "M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6zM9 12l2 2 4-4",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M21 21l-5-5",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12M8.5 14 7 22l5-3 5 3-1.5-8",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  id: "M3 5h18v14H3zM7 15.5a2.5 2.5 0 0 1 5 0M9.5 11.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5M14.5 10H18M14.5 14H18",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
