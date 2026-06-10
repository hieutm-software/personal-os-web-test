import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center px-4", className)}>
      <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-zinc-400" />
      </div>
      <h3 className="text-lg font-medium text-premium-text">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-500 mt-1 max-w-sm">
          {description}
        </p>
      )}
    </div>
  );
}
