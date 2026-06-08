import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PageLayout({ className, children, ...props }: PageLayoutProps) {
  return (
    <div
      className={cn("flex flex-col h-full bg-background overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  )
}
