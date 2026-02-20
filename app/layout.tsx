import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkedIn Post Editor",
  description:
    "Verfasse, formatiere und kopiere LinkedIn Posts mit Unicode-Formatierung.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✏️</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" src="/theme-init.js" />
      </head>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
