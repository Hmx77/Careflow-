import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareFlow for Newcastle Medical Centre",
  description: "Private patient waiting and flow management for Newcastle Medical Centre in Shakhbout City, Abu Dhabi."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
