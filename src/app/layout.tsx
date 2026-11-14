import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3C ITS Learning Portal",
  description: "Learning and assessment portal for employees of 3C IT Solutions & Telecoms India Limited",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
