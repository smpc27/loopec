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
  themeColor: "#302546",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full pb-16 md:pb-0 relative text-[#221c2e] selection:bg-purple-200">
        {/* Ambient Atmospheric Luminous Glass Blobs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-violet-300/35 via-purple-300/25 to-transparent blur-[120px]" />
          <div className="absolute top-[20%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-indigo-300/30 via-sky-200/20 to-transparent blur-[130px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-fuchsia-200/25 via-violet-200/30 to-transparent blur-[140px]" />
        </div>
        <PwaRegister />
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
