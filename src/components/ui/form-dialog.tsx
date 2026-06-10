import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  submitText?: string;
  submitDisabled?: boolean;
  cancelText?: string;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormDialog({
  isOpen,
  onOpenChange,
  title,
  onSubmit,
  isSubmitting = false,
  submitText = "Save",
  submitDisabled = false,
  cancelText = "Cancel",
  error,
  children,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "sm:max-w-xl card-aura-responsive border-premium-border p-6 sm:p-8 rounded-2xl shadow-2xl",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-4">{children}</div>
          
          {error && (
            <div className="text-sm font-medium text-destructive mt-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end mt-8 gap-3">
            <Button
              type="button"
              variant="premium-outline"
              className="px-5 py-2.5"
              onClick={() => onOpenChange(false)}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
