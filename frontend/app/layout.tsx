import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SmartView Lounge — Private Theater Experience",
  description:
    "Sri Lanka's first fully automated private movie theater. Book your exclusive session, pay online, and enjoy a premium cinematic experience with zero staff interaction.",
  keywords: "private theater, movie screening, Sri Lanka, SmartView Lounge, boutique cinema",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "SmartView Lounge",
    description: "Sri Lanka's first fully automated private movie theater.",
    type: "website",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "SmartView Lounge" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
