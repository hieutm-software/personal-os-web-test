import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortIconProps {
  active: boolean;
  direction: "asc" | "desc";
  className?: string;
}

export function SortIcon({ active, direction, className }: SortIconProps) {
  if (!active) {
    return (
      <ChevronDown
        className={cn(
          "w-3.5 h-3.5 opacity-0 group-hover:opacity-30 transition-opacity",
          className
        )}
      />
    );
  }
  
  return direction === "asc" ? (
    <ChevronUp className={cn("w-3.5 h-3.5 text-indigo-500", className)} />
  ) : (
    <ChevronDown className={cn("w-3.5 h-3.5 text-indigo-500", className)} />
  );
}
