import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/providers/auth-provider";
import { CurrencyProvider } from "@/lib/providers/currency-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SafeHome — Rent, Roommates & Services",
  description:
    "Find homes, list properties, match with roommates and book trusted local services — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <CurrencyProvider>
            {children}
            <Toaster richColors position="top-center" />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
