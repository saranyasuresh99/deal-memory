const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-06-15" -> "15 Jun 2026" (string-based, so no timezone surprises)
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function formatUsd(v: number | null): string | null {
  return v === null ? null : "$" + v.toLocaleString("en-US");
}

export function agoText(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "2026-07-10" -> "Fri" (computed from the date string itself, never from the system clock)
export function weekday(iso: string): string {
  return WEEKDAYS[new Date(iso.slice(0, 10) + "T00:00:00Z").getUTCDay()];
}

// "2026-07-15" -> "15 Jul"
export function formatShort(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : iso;
}

// 95000 -> "$95k", 440000 -> "$440k", 1250000 -> "$1.3M"
export function formatUsdShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
}
