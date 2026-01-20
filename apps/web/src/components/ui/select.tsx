import * as React from "react";
import { cn } from "../../lib/utils";

function getOptionStyles(disabled?: boolean, highlighted?: boolean): string {
  if (disabled) return "text-zinc-600 cursor-not-allowed";
  if (highlighted) return "bg-zinc-700 text-zinc-100";
  return "text-zinc-300 hover:bg-zinc-700/50";
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      className,
      options,
      value,
      placeholder = "Select an option",
      label,
      helperText,
      error,
      disabled = false,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const selectRef = React.useRef<HTMLDivElement>(null);
    const listboxRef = React.useRef<HTMLUListElement>(null);
    const selectId = id || React.useId();
    const listboxId = `${selectId}-listbox`;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    const selectedOption = options.find((opt) => opt.value === value);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        if (!isOpen) {
          const selectedIndex = options.findIndex((opt) => opt.value === value);
          setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }
      }
    };

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            const option = options[highlightedIndex];
            if (option && !option.disabled) {
              handleSelect(option.value);
            }
          } else {
            setIsOpen(true);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < options.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          }
          break;
        case "Escape":
          setIsOpen(false);
          break;
        case "Tab":
          setIsOpen(false);
          break;
      }
    };

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          selectRef.current &&
          !selectRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    React.useEffect(() => {
      if (isOpen && listboxRef.current && highlightedIndex >= 0) {
        const highlightedElement = listboxRef.current.children[
          highlightedIndex
        ] as HTMLElement;
        highlightedElement?.scrollIntoView({ block: "nearest" });
      }
    }, [highlightedIndex, isOpen]);

    return (
      <div className={cn("w-full", className)} {...props}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div ref={selectRef} className="relative">
          <button
            ref={ref as React.Ref<HTMLButtonElement>}
            id={selectId}
            type="button"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            disabled={disabled}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full h-10 px-3 rounded-lg text-sm text-left",
              "bg-zinc-800 border border-zinc-700",
              "flex items-center justify-between gap-2",
              "transition-colors duration-150",
              "focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
              selectedOption ? "text-zinc-100" : "text-zinc-500"
            )}
          >
            <span className="truncate">
              {selectedOption?.label || placeholder}
            </span>
            <svg
              className={cn(
                "w-4 h-4 text-zinc-400 transition-transform duration-150",
                isOpen && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isOpen && (
            <ul
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-activedescendant={
                highlightedIndex >= 0
                  ? `${selectId}-option-${highlightedIndex}`
                  : undefined
              }
              className={cn(
                "absolute z-50 w-full mt-1 py-1",
                "bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg",
                "max-h-60 overflow-auto",
                "animate-in fade-in-0 zoom-in-95 duration-150"
              )}
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${selectId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer",
                    "transition-colors duration-75",
                    option.value === value && "text-blue-400",
                    getOptionStyles(option.disabled, highlightedIndex === index)
                  )}
                >
                  <span className="flex items-center gap-2">
                    {option.label}
                    {option.value === value && (
                      <svg
                        className="w-4 h-4 ml-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                </li>
              ))}
            </ul>
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

Select.displayName = "Select";

export { Select };
