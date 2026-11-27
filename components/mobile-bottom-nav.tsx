"use client";

import { usePathname } from "next/navigation";
import { FrostedTabBar } from "@/components/navigation/frosted-tab-bar";

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on marketing home, auth flows, admin, active chat threads, and tabbar demo
  const isChatThread = /^\/messages\/[^/]+$/.test(pathname);
  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/setup") ||
    isChatThread ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/about" ||
    pathname === "/tabbar"
  ) {
    return null;
  }

  return (
    <div className="md:hidden">
      <FrostedTabBar isBottomBar={true} mode="interactive" />
    </div>
  );
}
