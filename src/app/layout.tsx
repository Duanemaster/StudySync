import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Ito ang magbibigay ng modern look sa text natin
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudySync | Modern Study Planner",
  description: "A smart study planner and learning management system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="en" suppressHydrationWarning>
    <body
      className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}
      suppressHydrationWarning
    >
      {children}
    </body>
  </html>
);
}