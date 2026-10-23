export const CATEGORIES = [
  "Infrastructure",
  "Hostel",
  "Academics",
  "Canteen",
  "Transport",
  "Library",
  "IT and WiFi",
  "Safety",
  "Other",
];
export const PRIORITIES = ["low", "medium", "high", "critical"];
export const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label || v;
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(date).toLocaleDateString();
}

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const ROLE_OPTIONS = ["student", "staff", "admin"];
