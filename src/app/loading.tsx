import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center min-h-[50vh] opacity-0 animate-[fade-in_0.5s_ease-out_0.2s_forwards]">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      <p className="mt-4 text-sm text-zinc-500 font-medium tracking-tight">Loading...</p>
    </div>
  );
}
