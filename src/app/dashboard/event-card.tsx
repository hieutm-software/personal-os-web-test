"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, AlignLeft } from "lucide-react";
import { Event } from "@/lib/db/schema";

export function EventCard({ event }: { event: Event }) {
  const [isOpen, setIsOpen] = useState(false);
  const startDate = new Date(event.startTime!);

  const startEmpty = startDate.getSeconds() === 1;
  const endEmpty = !event.endTime || new Date(event.endTime).getSeconds() === 1;

  let timeDisplay = "";
  if (startEmpty && endEmpty) {
    timeDisplay = "All Day";
  } else {
    const startStr = startEmpty ? "--:--" : startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const endStr = endEmpty ? "--:--" : new Date(event.endTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    timeDisplay = `${startStr} - ${endStr}`;
  }

  return (
    <>
      <div 
        className="flex gap-4 group cursor-pointer items-start" 
        onClick={() => setIsOpen(true)}
        suppressHydrationWarning
      >
        <div className="w-12 h-12 rounded-xl bg-indigo-500/5 dark:bg-premium-dark border border-indigo-500/20 dark:border-premium-border flex flex-col items-center justify-center shrink-0 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 leading-none mb-1">
            {startDate.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-lg font-black leading-none text-premium-text">
            {startDate.getDate()}
          </span>
        </div>
        <div className="flex flex-col gap-1 w-full justify-center min-h-[3rem] min-w-0">
          <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
            {event.title || "Untitled Event"}
          </h3>
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            {startEmpty && endEmpty ? (
              <span className="font-medium text-indigo-500 dark:text-indigo-400">All Day</span>
            ) : (
              <span>{timeDisplay}</span>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-[600px] w-11/12 max-h-[85vh] overflow-y-auto bg-premium-dark border-premium-border shadow-2xl backdrop-blur-xl"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-premium-text break-words break-all pr-8">
              {event.title || "Untitled Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-1">
                <Clock className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-300">
                  {format(startDate, "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {timeDisplay}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-1">
                <AlignLeft className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-300 mb-1">Description</p>
                <div className="text-sm text-zinc-400 bg-white/5 p-3 rounded-lg border border-white/5 whitespace-pre-wrap break-words break-all sm:break-words">
                  {event.description ? event.description : <span className="italic opacity-50">No description provided.</span>}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
