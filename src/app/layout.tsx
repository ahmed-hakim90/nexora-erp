import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { cookies } from "next/headers";

import { PlatformFeedbackProvider } from "@/platform/feedback/public-api";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  directionForLocale,
  htmlLangForLocale,
  parseLocale,
} from "@/platform/localization/public-api";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Nexora Platform",
  description: "Modular enterprise business platform foundation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? DEFAULT_LOCALE);
  const direction = directionForLocale(locale);

  // Root layout stays neutral for chrome ownership, but lang/dir follow locale preference.
  return (
    <html
      className={`${inter.variable} ${cairo.variable}`}
      data-locale={locale}
      dir={direction}
      lang={htmlLangForLocale(locale)}
      suppressHydrationWarning
    >
      <body>
        {children}
        <PlatformFeedbackProvider />
      </body>
    </html>
  );
}
