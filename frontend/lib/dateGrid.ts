// Shared hand-rolled calendar-grid math for DatePicker and DateRangePicker —
// no date library, since the site had none and this is a dozen lines.

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso: string, days: number): string {
  const d = fromISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

// Monday-first 6x7 grid, including the leading/trailing days of the
// adjacent months so every week row stays full.
export function buildGrid(monthStart: Date): Date[] {
  const jsWeekday = monthStart.getDay(); // 0=Sun..6=Sat
  const leading = (jsWeekday + 6) % 7; // days since Monday
  const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - leading);
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
}
