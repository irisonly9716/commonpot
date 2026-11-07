import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommonPot",
  description: "Shared expense accounts for households and small groups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
