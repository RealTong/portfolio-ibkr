import { cn } from "@/lib/utils";

type StatusType = "active" | "warning" | "error" | "inactive";

export type StatusIndicatorProps = {
  status: StatusType;
  label?: string;
  pulse?: boolean;
  className?: string;
};

const statusColors: Record<StatusType, string> = {
  active: "bg-hud-success",
  warning: "bg-hud-warning",
  error: "bg-hud-error",
  inactive: "bg-hud-dim",
};

export function StatusIndicator({
  status,
  label,
  pulse = false,
  className,
}: StatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className={cn("h-2 w-2 rounded-full", statusColors[status])} />
        {pulse && status === "active" && (
          <div
            className={cn(
              "absolute inset-0 h-2 w-2 rounded-full animate-ping opacity-75",
              statusColors[status],
            )}
          />
        )}
      </div>
      {label && <span className="hud-label">{label}</span>}
    </div>
  );
}

export type StatusBarProps = {
  items: Array<{
    label: string;
    value: string | number;
    status?: StatusType;
  }>;
  className?: string;
};

export function StatusBar({ items, className }: StatusBarProps) {
  return (
    <div className={cn("flex items-center gap-6", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {item.status && (
            <div className={cn("h-1.5 w-1.5 rounded-full", statusColors[item.status])} />
          )}
          <span className="hud-label">{item.label}</span>
          <span className="hud-value-sm">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

