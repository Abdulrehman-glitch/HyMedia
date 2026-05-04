interface StatusBadgeProps {
  label: string;
  tone?: "success" | "warning" | "neutral" | "danger";
}

export default function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={"badge badge-" + tone}>{label}</span>;
}
