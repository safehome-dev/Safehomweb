import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/providers/auth-provider";
import { CurrencyProvider } from "@/lib/providers/currency-provider";
import { Toaster } from "@/components/ui/sonner";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const DESCRIPTION =
  "Find rooms and homes to rent, match with roommates and book trusted local services — all in one place.";

export const metadata: Metadata = {
  // Lets every page use relative URLs for canonical links and preview images.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SafeHome — Rooms to Rent, Roommates & Local Services",
    template: "%s | SafeHome",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "rooms to rent",
    "room for rent",
    "flatshare",
    "find a roommate",
    "house share",
    "rent a room UK",
    "local services",
    "SafeHome",
  ],
  icons: { icon: "/favicon.png", apple: "/logo.png" },
  openGraph: {
    title: "SafeHome — Rooms to Rent, Roommates & Local Services",
    description: DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_GB",
    images: [{ url: "/logo.png", alt: SITE_NAME }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SafeHome — Rooms to Rent, Roommates & Local Services",
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
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
