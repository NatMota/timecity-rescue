import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
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
  title: "TimeCity Rescue",
  description: "Pupils solve the mystery of the missing minute and learn how AI really works.",
  openGraph: {
    title: "TimeCity Rescue",
    description: "A classroom AI-readiness adventure with fixed rooms, closed choices and teacher controls.",
    images: [
      {
        url: "/assets/backgrounds/splash-screen.png",
        width: 1672,
        height: 941,
        alt: "TimeCity Rescue splash screen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TimeCity Rescue",
    description: "Solve the mystery of the missing minute.",
    images: ["/assets/backgrounds/splash-screen.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
