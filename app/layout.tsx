import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import "./globals.css";

// Opt out of static-shell validation for the whole app: pages with real
// database calls are dynamic and must not be validated as instant-navigable.
export const instant = false;

export const metadata: Metadata = {
  applicationName: "LOOPEC",
  title: {
    default: "LOOPEC — Your campus, in the loop",
    template: "%s | LOOPEC",
  },
  description:
    "A private marketplace for the students, faculty and staff of your college community.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "LOOPEC",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#241e14",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Instrument+Serif:ital@0;1&display=swap" />
      </head>
      <body className="min-h-full pb-16 md:pb-0 relative text-[#241e14] bg-[#eee9e2] selection:bg-[#d0c1ab] selection:text-[#241e14]">
        {/* Ambient Atmospheric Luminous Glass Blobs in warm palette */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-[#d0c1ab]/40 via-[#eee9e2]/60 to-transparent blur-[120px]" />
          <div className="absolute top-[20%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#ffffff]/70 via-[#d0c1ab]/30 to-transparent blur-[130px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#d0c1ab]/35 via-[#eee9e2]/50 to-transparent blur-[140px]" />
        </div>
        <PwaRegister />
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
