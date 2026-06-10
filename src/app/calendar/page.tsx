import { Suspense } from "react";
import { CalendarData } from "./calendar-data";
import { CalendarSkeleton } from "./calendar-skeleton";

export default function CalendarPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarData />
        </Suspense>
      </div>
    </div>
  );
}
