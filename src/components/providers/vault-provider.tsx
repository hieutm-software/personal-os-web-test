"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface VaultContextType {
  masterPassword: string | null;
  setMasterPassword: (pwd: string | null) => void;
  clearVaultMemory: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [masterPassword, setMasterPassword] = useState<string | null>(null);

  const clearVaultMemory = () => {
    setMasterPassword(null);
  };

  return (
    <VaultContext.Provider value={{ masterPassword, setMasterPassword, clearVaultMemory }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
