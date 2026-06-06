import { STATUS_LABELS, type Status } from "../types";

const COLOR_VAR: Record<Status, string> = {
  considering: "var(--st-considering)",
  shortlisted: "var(--st-shortlisted)",
  contacted: "var(--st-contacted)",
  quoted: "var(--st-quoted)",
  booked: "var(--st-booked)",
  passed: "var(--st-passed)",
};

export function StatusPill({ status }: { status?: Status }) {
  if (!status) return null;
  return (
    <span className="pill" style={{ color: COLOR_VAR[status] }}>
      {STATUS_LABELS[status]}
    </span>
  );
}
