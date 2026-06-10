import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"

export interface TimePickerProps {
  value?: string // HH:mm format (e.g. "14:30")
  onChange?: (val: string) => void
  placeholder?: string
  className?: string
}

export function TimePicker({ value, onChange, placeholder = "Select time", className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse current value
  let initialHour = "12"
  let initialMinute = "00"
  if (value) {
    const [h, m] = value.split(":")
    if (h && m) {
      initialHour = h
      initialMinute = m
    }
  }

  const [hour, setHour] = React.useState(initialHour)
  const [minute, setMinute] = React.useState(initialMinute)

  // Sync parent value to local state
  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      if (h && m) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHour(h);
         
        setMinute(m);
      }
    } else {
      setHour("12");
      setMinute("00");
    }
  }, [value])

  const handleSelect = (h: string, m: string) => {
    setHour(h)
    setMinute(m)
    if (onChange) {
      onChange(`${h}:${m}`)
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!value) return "";
    const [h, m] = value.split(":");
    if (!h || !m) return "";
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-white/90 dark:bg-black/20 border-black/[0.08] dark:border-premium-border text-premium-text shadow-sm hover:bg-white dark:hover:bg-premium-dark",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={4} className="w-auto p-0 bg-white/90 dark:bg-premium-dark border border-black/[0.08] dark:border-premium-border shadow-xl backdrop-blur-xl" align="start">
        <div className="flex h-48 w-48 divide-x divide-black/[0.08] dark:divide-premium-border">
          {/* Hours Column */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
            <div className="flex flex-col p-1">
              {hours.map((h) => (
                <Button
                  key={h}
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelect(h, minute);
                  }}
                  className={cn(
                    "rounded-sm px-2 py-1 h-8 text-sm justify-center hover:bg-primary/20 hover:text-primary",
                    hour === h ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-premium-text"
                  )}
                >
                  {h}
                </Button>
              ))}
            </div>
          </div>
          {/* Minutes Column */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
            <div className="flex flex-col p-1">
              {minutes.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelect(hour, m);
                  }}
                  className={cn(
                    "rounded-sm px-2 py-1 h-8 text-sm justify-center hover:bg-primary/20 hover:text-primary",
                    minute === m ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-premium-text"
                  )}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-2 border-t border-black/[0.08] dark:border-premium-border bg-black/5 dark:bg-black/20 flex gap-2">
          <Button type="button" size="sm" variant="ghost" className="flex-1" onClick={(e) => { 
            e.preventDefault(); 
            setHour(""); 
            setMinute(""); 
            if (onChange) onChange(""); 
            setOpen(false); 
          }}>
            Clear
          </Button>
          <Button type="button" size="sm" className="flex-1" onClick={(e) => { e.preventDefault(); setOpen(false); }}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
