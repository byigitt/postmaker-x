import * as React from "react";
import { cn } from "../../lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
} as const;

function getGradient(percentage: number): string {
  if (percentage >= 80) return "from-green-600 to-green-400";
  if (percentage >= 60) return "from-yellow-600 to-yellow-400";
  if (percentage >= 40) return "from-orange-600 to-orange-400";
  return "from-red-600 to-red-400";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    { className, value, max = 100, showValue = false, size = "md", ...props },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div className={cn("w-full", className)} {...props}>
        <div
          ref={ref}
          className={cn(
            "w-full bg-zinc-700 rounded-full overflow-hidden",
            sizeClasses[size]
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              "bg-gradient-to-r",
              getGradient(percentage)
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <div className="flex justify-between mt-1">
            <span
              className={cn(
                "text-sm font-medium",
                (getGradient(percentage).split(" ")[0] ?? "from-red-600").replace("from-", "text-")
              )}
            >
              {Math.round(percentage)}%
            </span>
            <span className="text-xs text-zinc-500">
              {value}/{max}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
