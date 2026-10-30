import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "CommonPot",
  description: "Track and split shared group expenses.",
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
