"use client";

import { usePathname } from "next/navigation";
import { FrostedTabBar } from "@/components/navigation/frosted-tab-bar";

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on marketing home, auth flows, admin, and tabbar demo
  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/setup") ||
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
