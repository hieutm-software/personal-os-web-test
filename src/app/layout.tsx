import { Shell } from "@/components/layout/shell";
import type { Metadata } from "next";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Self-hosted monolithic productivity engine.",
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
            <Shell isAuthenticated={isAuthenticated}>{children}</Shell>
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
