import * as React from "react";

import { cn } from "@/lib/utils";

export type PanelProps = React.ComponentProps<"div"> & {
  title?: string;
  titleRight?: React.ReactNode;
  noPadding?: boolean;
};

export function Panel({
  className,
  title,
  titleRight,
  noPadding = false,
  children,
  ...props
}: PanelProps) {
  return (
    <div className={cn("hud-panel flex flex-col", className)} {...props}>
      {(title || titleRight) && (
        <div className="flex items-center justify-between gap-3 border-b border-hud-line px-4 py-2 shrink-0">
          {title && <span className="hud-label">{title}</span>}
          {titleRight && (
            typeof titleRight === "string" || typeof titleRight === "number" ? (
              <span className="hud-value-sm">{titleRight}</span>
            ) : (
              titleRight
            )
          )}
        </div>
      )}
      <div className={cn("flex-1 min-h-0", noPadding ? "" : "p-3")}>
        {children}
      </div>
    </div>
  );
}
