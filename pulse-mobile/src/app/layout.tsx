import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulse - Daily Quest PWA",
  description: "Progressive Web App for daily quest completion with push notifications",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pulse Quest",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Pulse - Daily Quest PWA",
    title: "Pulse - Daily Quest PWA",
    description: "Progressive Web App for daily quest completion with push notifications",
  },
  twitter: {
    card: "summary",
    title: "Pulse - Daily Quest PWA",
    description: "Progressive Web App for daily quest completion with push notifications",
  },
};

export const viewport: Viewport = {
  themeColor: "#8fff70",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
