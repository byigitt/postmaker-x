import * as React from "react";
import { cn } from "../../lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

function Modal({ open, onClose, children, className }: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          "relative z-50 w-full max-w-lg mx-4",
          "bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "focus:outline-none",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

Modal.displayName = "Modal";

export interface ModalHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "px-6 py-4 border-b border-zinc-700 flex items-center justify-between",
          className
        )}
        {...props}
      />
    );
  }
);

ModalHeader.displayName = "ModalHeader";

export interface ModalTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

const ModalTitle = React.forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn("text-lg font-semibold text-zinc-100", className)}
        {...props}
      />
    );
  }
);

ModalTitle.displayName = "ModalTitle";

export interface ModalCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const ModalClose = React.forwardRef<HTMLButtonElement, ModalCloseProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
          className
        )}
        aria-label="Close"
        {...props}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    );
  }
);

ModalClose.displayName = "ModalClose";

export interface ModalContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("px-6 py-4", className)} {...props} />
    );
  }
);

ModalContent.displayName = "ModalContent";

export interface ModalFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "px-6 py-4 border-t border-zinc-700 flex items-center justify-end gap-3",
          className
        )}
        {...props}
      />
    );
  }
);

ModalFooter.displayName = "ModalFooter";

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalContent,
  ModalFooter,
};
