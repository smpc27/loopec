"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Package, Plus, MessageSquare, User } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on marketing home and auth flows
  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/setup") ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/about"
  ) {
    return null;
  }

  const navItems = [
    {
      label: "Marketplace",
      href: "/marketplace",
      icon: Compass,
      active: pathname === "/marketplace" || pathname.startsWith("/marketplace/"),
    },
    {
      label: "Orders",
      href: "/orders",
      icon: Package,
      active: pathname === "/orders" || pathname.startsWith("/orders/"),
    },
    {
      label: "Sell",
      href: "/listings/new",
      icon: Plus,
      isCenterAction: true,
      active: pathname === "/listings/new",
    },
    {
      label: "Messages",
      href: "/messages",
      icon: MessageSquare,
      active: pathname === "/messages" || pathname.startsWith("/messages/"),
    },
    {
      label: "Profile",
      href: "/profile",
      icon: User,
      active: pathname === "/profile" || pathname === "/dashboard",
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#d0c1ab]/40 bg-white/80 backdrop-blur-2xl px-2 md:hidden shadow-[0_-8px_30px_rgba(36,30,20,0.06)]"
    >
      {navItems.map((item) => {
        const Icon = item.icon;

        if (item.isCenterAction) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group -mt-5 flex flex-col items-center focus:outline-none"
              aria-label="Sell an item"
            >
              <div className="grid size-12 place-items-center rounded-full bg-[#241e14] text-white shadow-lg transition-transform duration-200 group-active:scale-95 group-hover:bg-[#382f20] border-2 border-white">
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <span className="mt-1 text-[10px] font-bold text-[#241e14]">Sell</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1 text-center transition-colors ${
              item.active ? "text-[#241e14] font-bold" : "text-[#736b60] hover:text-[#241e14]"
            }`}
          >
            <Icon
              size={20}
              strokeWidth={item.active ? 2.5 : 2}
              className={item.active ? "text-[#241e14] scale-105 transition-transform" : "text-[#736b60]"}
            />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
