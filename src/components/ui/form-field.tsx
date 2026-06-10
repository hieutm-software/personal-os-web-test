import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, children, className, ...props }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-destructive px-1">{error}</p>
      )}
    </div>
  );
}
