import * as React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ActionButtonProps extends ButtonProps {
  actionType?: "default" | "delete" | "restore" | "edit" | "download" | "view";
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, actionType = "default", ...props }, ref) => {
    let typeClass = "hover:bg-muted-foreground/10 hover:text-foreground"; // default

    if (actionType === "delete") {
      typeClass = "hover:bg-destructive/10 hover:text-destructive";
    } else if (actionType === "restore") {
      typeClass = "hover:bg-emerald-500/10 hover:text-emerald-500";
    } else if (actionType === "edit") {
      typeClass = "hover:bg-blue-500/10 hover:text-blue-500";
    } else if (actionType === "download") {
      typeClass = "hover:bg-violet-500/10 hover:text-violet-500";
    } else if (actionType === "view") {
      typeClass = "hover:bg-cyan-500/10 hover:text-cyan-500";
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 shrink-0 text-muted-foreground transition-colors", typeClass, className)}
        {...props}
      />
    )
  }
)
ActionButton.displayName = "ActionButton"
