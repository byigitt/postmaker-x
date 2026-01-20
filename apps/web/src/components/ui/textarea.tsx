import * as React from "react";
import { cn } from "../../lib/utils";

function getCountColor(charCount: number, maxLength?: number): string {
  if (maxLength && charCount >= maxLength) return "text-red-400";
  if (maxLength && charCount >= maxLength * 0.9) return "text-yellow-400";
  return "text-zinc-500";
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  maxLength?: number;
  showCount?: boolean;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      maxLength,
      showCount = false,
      autoResize = false,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const charCount = typeof value === "string" ? value.length : 0;

    const handleResize = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea && autoResize) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [autoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      handleResize();
    };

    React.useEffect(() => {
      handleResize();
    }, [value, handleResize]);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={setRefs}
            id={inputId}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            className={cn(
              "w-full min-h-[100px] px-3 py-2.5 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500",
              "bg-zinc-800 border border-zinc-700",
              "transition-colors duration-150 resize-y",
              "focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              autoResize && "resize-none overflow-hidden",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
              showCount && "pb-8",
              className
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            {...props}
          />
          {showCount && (
            <div
              className={cn(
                "absolute bottom-2 right-3 text-xs",
                getCountColor(charCount, maxLength)
              )}
              aria-live="polite"
            >
              {charCount}
              {maxLength && `/${maxLength}`}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-zinc-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
