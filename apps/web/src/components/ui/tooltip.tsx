import * as React from "react";
import { cn } from "../../lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  delayMs?: number;
  className?: string;
}

const arrowClasses = {
  top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-zinc-700",
  bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-zinc-700",
  left: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-transparent border-b-transparent border-r-transparent border-l-zinc-700",
  right: "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-transparent border-b-transparent border-l-transparent border-r-zinc-700",
} as const;

const positionClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
} as const;

function Tooltip({
  content,
  children,
  side = "top",
  delayMs = 200,
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = React.useId();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = () => {
    setIsOpen(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative inline-flex">
      {React.cloneElement(children, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
        "aria-describedby": isOpen ? tooltipId : undefined,
      })}
      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute z-50 px-3 py-1.5 text-sm text-zinc-100 bg-zinc-700 rounded-lg shadow-lg",
            "whitespace-nowrap pointer-events-none",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            positionClasses[side],
            className
          )}
        >
          {content}
          <span
            className={cn(
              "absolute w-0 h-0 border-[6px]",
              arrowClasses[side]
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

Tooltip.displayName = "Tooltip";

export { Tooltip };
