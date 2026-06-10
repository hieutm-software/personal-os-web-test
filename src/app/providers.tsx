"use client";

import { AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";
import { DialogProvider } from "@/components/providers/dialog-provider";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

interface ProvidersProps {
  children: ReactNode;
  messages: AbstractIntlMessages;
  locale: string;
  timeZone: string;
}

// ----------------------------------------------------------------------------
// GLOBAL PROVIDER
// Enforces strictly 3 themes: Dark, Light, System.
// Custom HEX accent color override has been removed in favour of the premium
// CSS variable system defined in globals.css.
// ----------------------------------------------------------------------------

export function Providers({ children, messages, locale, timeZone }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange={true}
      >
        <DialogProvider>
          {children}
        </DialogProvider>
      </NextThemesProvider>
    </NextIntlClientProvider>
  );
}
