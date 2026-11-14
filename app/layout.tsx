import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panimdim | Administration",
  description: "A thoughtful workspace for managing Panimdim Flower Shop accounts and roles.",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#fdfaf4" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/cormorant-garamond-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body><AuthProvider><SiteHeader />{children}<footer className="site-footer"><span>panimdim. <span className="footer-separator">/</span> flower shop</span><span>A little care goes a long way.</span></footer></AuthProvider></body>
    </html>
  );
}
