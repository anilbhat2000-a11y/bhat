import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3C IT Solutions LMS",
  description: "Learning and assessment portal for 3C IT Solutions and Telecoms India Ltd employees",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
