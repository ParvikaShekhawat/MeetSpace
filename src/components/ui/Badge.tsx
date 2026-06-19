import { cn } from "@/lib/utils";

const variants = {
  default: "bg-slate-100 text-slate-700",
  brand: "bg-brand-100 text-brand-800",
  sky: "bg-sky-100 text-sky-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: keyof typeof variants }> = {
    SCHEDULED: { label: "Scheduled", variant: "sky" },
    IN_PROGRESS: { label: "In Progress", variant: "warning" },
    COMPLETED: { label: "Completed", variant: "success" },
  };
  const config = map[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
