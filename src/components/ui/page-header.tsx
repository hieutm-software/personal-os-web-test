import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  tabs?: PageTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  tabs,
  activeTab,
  onTabChange,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("shrink-0 border-b border-border bg-card/50 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full", className)} {...props}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 w-full sm:w-auto">
        {title && (
          <div className="flex items-center gap-2">
            {title}
          </div>
        )}
        
        {tabs && tabs.length > 0 && (
          <div className="flex bg-muted/50 p-1 rounded-full overflow-x-auto max-w-full hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
