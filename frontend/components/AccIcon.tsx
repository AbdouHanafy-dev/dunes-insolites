/** Small line icons for the accommodation pages (24x24, stroke = currentColor). */
const PATHS: Record<string, React.ReactNode> = {
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M17 14c2.5 0 4 1.8 4 4.5" />
    </>
  ),
  bed: (
    <>
      <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
      <circle cx="7" cy="11" r="1.6" />
    </>
  ),
  shower: (
    <>
      <path d="M5 4h6a4 4 0 0 1 4 4v1" />
      <path d="M11 9h8M13 12v1M16 12v1M19 12v1M13 16v1M16 16v1M19 16v1" />
    </>
  ),
  meal: (
    <>
      <path d="M6 3v8M4 3v5a2 2 0 0 0 4 0V3M6 11v10" />
      <path d="M16 3c-2 1.5-3 4-3 7h3v11M16 3v7" />
    </>
  ),
  cup: (
    <>
      <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
      <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v4" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1" />
    </>
  ),
  snow: (
    <>
      <path d="M12 2v20M4 6.5l16 11M20 6.5l-16 11" />
      <path d="M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" />
    </>
  ),
  tea: (
    <>
      <path d="M5 10h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5v-4z" />
      <path d="M15 11h2a2 2 0 0 1 0 4h-2M8 3c0 1.5 1.5 1.5 1.5 3M12 3c0 1.5 1.5 1.5 1.5 3" />
    </>
  ),
  sun: (
    <>
      <path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 5V3M4.5 8.5 3 7M19.5 8.5 21 7" />
    </>
  ),
  board: (
    <>
      <path d="M5 19 19 5M4 15l5 5M15 4l5 5" />
      <path d="M6 12l6 6" />
    </>
  ),
  bread: (
    <>
      <ellipse cx="12" cy="13" rx="9" ry="6" />
      <path d="M8 12h.01M12 10h.01M16 12h.01M12 15h.01" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  fire: (
    <>
      <path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.7.7-2.7 1.5-3.5.2 1 .8 1.6 1.5 1.8C11 7.8 11.5 5.5 12 3z" />
      <path d="M8 21h8" />
    </>
  ),
  star: (
    <>
      <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z" />
    </>
  ),
  camp: (
    <>
      <path d="M2 20 12 4l10 16H2zM12 20v-6M9 20l3-6 3 6" />
    </>
  ),
  check: <path d="m5 12 4.5 4.5L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  dune: <path d="M2 19c3-6 6-9 9-9 2 0 3 2 5 2 2 0 4-1 6-3M2 19h20" />,
  helmet: (
    <>
      <path d="M4 15a8 8 0 0 1 16 0v2H4v-2z" />
      <path d="M4 15h9l2-4h5M9 17v2h6v-2" />
    </>
  ),
  camel: (
    <>
      <path d="M3 18v-6c0-1 1-2 2-2s2 1 2 3v-3c0-1.5 1-3 2.5-3S12 8 12 9.5V12l3-1 2-4 2 1-1.5 3.5V18" />
      <path d="M3 18h3M9 18h3M15 18h4" />
    </>
  ),
  glasses: (
    <>
      <circle cx="6.5" cy="14" r="3.5" />
      <circle cx="17.5" cy="14" r="3.5" />
      <path d="M10 14h4M3 14 5 8M21 14l-2-6" />
    </>
  ),
  shirt: <path d="M8 4 3 7l2 4 3-1v10h8V10l3 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 5.500 8 4z" />,
  shoe: <path d="M3 17v-4l4-1 3-4 3 3 5 1.500a3 3 0 0 1 2 3V17H3zM3 20h18" />,
  drop: <path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z" />,
  camera: (
    <>
      <path d="M4 8h3l1.500-2.500h7L17 8h3v11H4V8z" />
      <circle cx="12" cy="13" r="3.500" />
    </>
  ),
  car: (
    <>
      <path d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2h3v-2M17 16v2h3v-2" />
      <circle cx="8" cy="13" r=".8" />
      <circle cx="16" cy="13" r=".8" />
    </>
  ),
  shield: <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3zM9 12l2 2 4-4" />,
  home: <path d="M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6" />,
  chat: <path d="M4 5h16v11H9l-5 4V5z" />,
  hand: <path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 12V4.5a1.5 1.5 0 0 1 3 0V12M14 12V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-3.5a1.5 1.5 0 0 1 2.5-1.6L8 14" />,
};

export default function AccIcon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.check}
    </svg>
  );
}
