import * as React from "react";
import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClasses = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500/50 active:bg-blue-700",
  secondary:
    "bg-zinc-700 text-zinc-100 hover:bg-zinc-600 focus:ring-zinc-500/50 active:bg-zinc-800",
  ghost:
    "bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus:ring-zinc-500/50",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus:ring-red-500/50 active:bg-red-700",
} as const;

const sizeClasses = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
} as const;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading && <Spinner size={size === "lg" ? "md" : "sm"} />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
