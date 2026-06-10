import { Shell } from "@/components/layout/shell";
import type { Metadata } from "next";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { Providers } from "./providers";
import { CommandPalette } from "@/components/ui/command-palette";
import { PWARegister } from "@/components/layout/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Self-hosted monolithic productivity engine.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Personal OS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const timeZone = await getTimeZone();

  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.has("session");

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} select-none`}>
        <NuqsAdapter>
          <Providers locale={locale} messages={messages} timeZone={timeZone}>
            <PWARegister />
            <CommandPalette />
            <Shell isAuthenticated={isAuthenticated}>{children}</Shell>
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
