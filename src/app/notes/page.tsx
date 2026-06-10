import { Suspense } from "react";
import { NotesData } from "./notes-data";
import { NotesSkeleton } from "./notes-skeleton";

export default function NotesPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <Suspense fallback={<NotesSkeleton />}>
          <NotesData />
        </Suspense>
      </div>
    </div>
  );
}
