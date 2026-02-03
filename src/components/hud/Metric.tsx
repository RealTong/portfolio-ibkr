import { cn } from "@/lib/utils";

type MetricSize = "sm" | "md" | "lg" | "xl";
type MetricColor = "default" | "success" | "warning" | "error";

export type MetricProps = {
  label: string;
  value: string | number;
  size?: MetricSize;
  color?: MetricColor;
  className?: string;
};

const sizeClasses: Record<MetricSize, string> = {
  sm: "hud-value-sm",
  md: "hud-value-md",
  lg: "hud-value-lg",
  xl: "hud-value-xl",
};

const colorClasses: Record<MetricColor, string> = {
  default: "",
  success: "text-hud-success",
  warning: "text-hud-warning",
  error: "text-hud-error",
};

export function Metric({
  label,
  value,
  size = "lg",
  color = "default",
  className,
}: MetricProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="hud-label mb-1">{label}</span>
      <span className={cn(sizeClasses[size], colorClasses[color])}>{value}</span>
    </div>
  );
}

export type MetricInlineProps = {
  label: string;
  value: string | number;
  color?: MetricColor;
  valueClassName?: string;
  className?: string;
};

export function MetricInline({
  label,
  value,
  color = "default",
  valueClassName,
  className,
}: MetricInlineProps) {
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="hud-label">{label}</span>
      <span className={cn("hud-value-sm", valueClassName || colorClasses[color])}>
        {value}
      </span>
    </div>
  );
}

