import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// BaseModal — shared modal wrapper for form dialogs across Tasks, Calendar, etc.
//
// Usage (controlled):
//   <BaseModal isOpen={open} onOpenChange={setOpen} title="Create Task" onSubmit={handleSubmit}>
//     <Input ... />
//   </BaseModal>
//
// Usage (uncontrolled, with trigger):
//   <BaseModal title="Create Task" trigger={<Button>Open</Button>} onSubmit={handleSubmit}>
//     <Input ... />
//   </BaseModal>

interface BaseModalProps {
  /** Dialog title displayed in the header. */
  title: string;
  /** Optional subtitle / description shown below the title. */
  description?: string;
  /** Controlled open state. Omit when using trigger-based (uncontrolled) mode. */
  isOpen?: boolean;
  /** Called when the dialog open state changes (controlled mode). */
  onOpenChange?: (open: boolean) => void;
  /** Optional trigger element. When provided, the dialog runs in uncontrolled mode. */
  trigger?: React.ReactNode;
  /** Form submit handler — wraps children in a <form>. */
  onSubmit?: (e: React.FormEvent) => void;
  /** Whether the form is currently submitting (disables buttons). */
  isSubmitting?: boolean;
  /** Label for the primary action button. */
  submitText?: string;
  /** Disable the primary action button independently. */
  submitDisabled?: boolean;
  /** Label for the cancel button. */
  cancelText?: string;
  /** Optional error node rendered above the footer. */
  error?: React.ReactNode;
  /** Custom footer — replaces the default Cancel / Submit button row. */
  footer?: React.ReactNode;
  /** Modal content (form fields, etc.). */
  children: React.ReactNode;
  /** Extra className for DialogContent. */
  className?: string;
  /**
   * When true, the DialogTitle is visually hidden (sr-only) and no header block
   * is rendered. Use this when the dialog content provides its own custom header.
   */
  hideTitle?: boolean;
}

export function BaseModal({
  title,
  description,
  isOpen,
  onOpenChange,
  trigger,
  onSubmit,
  isSubmitting = false,
  submitText = "Save",
  submitDisabled = false,
  cancelText = "Cancel",
  error,
  footer,
  children,
  className,
  hideTitle = false,
}: BaseModalProps) {
  const inner = (
    <DialogContent
      aria-describedby={description ? undefined : undefined}
      className={cn(
        "sm:max-w-xl card-aura-responsive border-premium-border p-6 sm:p-8 rounded-2xl shadow-2xl",
        className
      )}
    >
      <DialogHeader className={hideTitle ? "sr-only" : undefined}>
        <DialogTitle className="text-2xl font-semibold tracking-tight">
          {title}
        </DialogTitle>
        {!hideTitle && description && (
          <DialogDescription>{description}</DialogDescription>
        )}
      </DialogHeader>

      {onSubmit ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-4">{children}</div>

          {error && (
            <div className="text-sm font-medium text-destructive mt-2">
              {error}
            </div>
          )}

          {footer ?? (
            <div className="flex items-center justify-end mt-8 gap-3">
              <Button
                type="button"
                variant="premium-outline"
                className="px-5 py-2.5"
                onClick={() => onOpenChange?.(false)}
                disabled={isSubmitting}
              >
                {cancelText}
              </Button>
              <Button
                type="submit"
                variant="premium"
                className="px-6 py-2.5"
                disabled={isSubmitting || submitDisabled}
              >
                {isSubmitting ? "Saving..." : submitText}
              </Button>
            </div>
          )}
        </form>
      ) : (
        // No form — render children + optional footer as-is
        <>
          <div className="space-y-4">{children}</div>
          {error && (
            <div className="text-sm font-medium text-destructive mt-2">
              {error}
            </div>
          )}
          {footer}
        </>
      )}
    </DialogContent>
  );

  if (trigger) {
    // Uncontrolled (trigger) mode
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {inner}
      </Dialog>
    );
  }

  // Controlled mode
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {inner}
    </Dialog>
  );
}
