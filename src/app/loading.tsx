import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-full w-full flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
    </div>
  );
}
