import type { Metadata } from "next";

import { PlatformFeedbackProvider } from "@/platform/feedback/public-api";

import "./globals.css";

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
    <html lang="en" dir="ltr">
      <body>
        {children}
        <PlatformFeedbackProvider />
      </body>
    </html>
  );
}
