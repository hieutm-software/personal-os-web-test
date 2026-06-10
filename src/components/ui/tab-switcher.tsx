import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface TabSwitcherProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tabs: TabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
}

export function TabSwitcher<T extends string = string>({
  tabs,
  value,
  onValueChange,
  className,
  ...props
}: TabSwitcherProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center w-fit max-w-full overflow-x-auto hide-scrollbar bg-black/5 dark:bg-black/20 p-1 rounded-lg border border-premium-border",
        className
      )}
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = value === tab.value;
        return (
          <Button
            key={tab.value}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "whitespace-nowrap flex items-center gap-1.5",
              isActive ? "active-tab-aura" : "inactive-tab-aura"
            )}
          >
            {tab.icon}
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
