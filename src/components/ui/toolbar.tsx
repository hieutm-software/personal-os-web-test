import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  search?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Toolbar({ search, actions, className, ...props }: ToolbarProps) {
  return (
    <div 
      className={cn("flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 lg:px-8 border-b border-border bg-background/50", className)} 
      {...props}
    >
      <div className="flex-1 w-full sm:max-w-xs">
        {search}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full sm:w-auto">
        {actions}
      </div>
    </div>
  )
}
