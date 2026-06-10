import { Suspense } from "react";
import { TasksData } from "./tasks-data";
import { TasksSkeleton } from "./tasks-skeleton";

// Shell renders immediately; TasksData streams in via Suspense.
// Auth check happens inside TasksData (Server Component).
export default function TasksPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <Suspense fallback={<TasksSkeleton />}>
          <TasksData />
        </Suspense>
      </div>
    </div>
  );
}
