import { Suspense } from "react";
import { DocumentsData } from "./documents-data";
import { DocumentsSkeleton } from "./documents-skeleton";

export const metadata = {
  title: "Documents | Personal OS",
};

export default function DocumentsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <Suspense fallback={<DocumentsSkeleton />}>
          <DocumentsData />
        </Suspense>
      </div>
    </div>
  );
}
