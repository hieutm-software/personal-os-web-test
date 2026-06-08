"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

type DialogContextType = {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, options?: ConfirmOptions | string) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialogs() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialogs must be used within a DialogProvider");
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogState, setDialogState] = useState<{
    type: "alert" | "confirm";
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  }>({
    type: "alert",
    title: "",
    message: "",
  });

  const resolverRef = useRef<((value: boolean | void) => void) | null>(null);

  const alert = useCallback((message: string, title: string = "Alert") => {
    return new Promise<void>((resolve) => {
      setDialogState({ type: "alert", title, message });
      setIsOpen(true);
      resolverRef.current = () => resolve();
    });
  }, []);

  const confirm = useCallback((message: string, options?: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      let title = "Confirm";
      let confirmText = "OK";
      let cancelText = "Cancel";
      let variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" = "default";

      if (typeof options === "string") {
        title = options;
      } else if (options) {
        if (options.title) title = options.title;
        if (options.confirmText) confirmText = options.confirmText;
        if (options.cancelText) cancelText = options.cancelText;
        if (options.variant) variant = options.variant;
      }

      setDialogState({ type: "confirm", title, message, confirmText, cancelText, variant });
      setIsOpen(true);
      resolverRef.current = resolve as (value: boolean | void) => void;
    });
  }, []);

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolverRef.current) {
      if (dialogState.type === "confirm") {
        resolverRef.current(value);
      } else {
        resolverRef.current();
      }
      resolverRef.current = null;
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleClose(false);
      }}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{dialogState.title}</DialogTitle>
            <DialogDescription>
              {dialogState.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            {dialogState.type === "confirm" && (
              <Button
                variant="ghost"
                onClick={() => handleClose(false)}
              >
                {dialogState.cancelText || "Cancel"}
              </Button>
            )}
            <Button
              variant={dialogState.variant || "default"}
              onClick={() => handleClose(true)}
            >
              {dialogState.confirmText || "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}
