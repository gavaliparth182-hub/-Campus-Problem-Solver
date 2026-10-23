import { cap, statusLabel } from "../constants.js";

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{statusLabel(status)}</span>;
}

export function PriorityTag({ priority }) {
  return <span className={`prio prio-${priority}`}>{cap(priority)} priority</span>;
}

export function EscalatedFlag() {
  return <span className="badge escalated">Escalated</span>;
}
