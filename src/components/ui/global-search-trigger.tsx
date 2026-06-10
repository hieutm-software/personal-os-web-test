"use client";

import { Search } from "lucide-react";

export function GlobalSearchTrigger() {
  return (
    <div 
      className="relative flex-1 md:w-72 group" 
      onClick={() => document.dispatchEvent(new CustomEvent("open-command-palette"))}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      <input 
        type="text" 
        placeholder="Search tasks, notes..." 
        readOnly
        className="w-full cursor-pointer bg-premium-dark border border-premium-border rounded-full pl-10 pr-16 py-1.5 text-sm focus:outline-none group-hover:ring-1 group-hover:ring-indigo-500 transition-all placeholder:text-zinc-600"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border border-premium-border pointer-events-none">
        <span>⌘</span><span>K</span>
      </div>
    </div>
  );
}
