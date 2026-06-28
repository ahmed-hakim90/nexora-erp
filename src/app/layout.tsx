import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { PlatformFeedbackProvider } from "@/platform/feedback/public-api";
import { EnterpriseUiProvider } from "@/shared/ui";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Nexora Platform",
  description: "Modular enterprise business platform foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Root layout stays neutral. ERP and Portal route groups own their own shells.
  return (
    <html className={inter.variable} lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <EnterpriseUiProvider>{children}</EnterpriseUiProvider>
        <PlatformFeedbackProvider />
      </body>
    </html>
  );
}
