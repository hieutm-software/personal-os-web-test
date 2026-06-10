import { Suspense } from "react";
import { VaultData } from "./vault-data";
import { VaultSkeleton } from "./vault-skeleton";

export const metadata = {
  title: "Vault | Personal OS",
};

export default function VaultPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <Suspense fallback={<VaultSkeleton />}>
          <VaultData />
        </Suspense>
      </div>
    </div>
  );
}
