import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-9 rounded-md border-input bg-white/80 dark:bg-black/40 px-3 py-1 text-base shadow-sm focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
        form:
          "rounded-xl border-black/[0.08] dark:border-premium-border bg-white/90 dark:bg-black/20 px-4 py-3 text-sm font-medium text-premium-text shadow-sm focus:border-indigo-500/50 focus:bg-white dark:focus:bg-premium-dark focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-zinc-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        style={{ accentColor: "var(--primary)" }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
