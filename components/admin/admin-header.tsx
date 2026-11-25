"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

export function AdminHeader({
  adminName,
  isSuperAdmin = false,
}: {
  adminName?: string;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const links = [
    { href: "/admin", label: "Verifications" },
    { href: "/admin/payouts", label: "Payouts & Ledger" },
    { href: "/admin/listings", label: "Listings" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/members", label: "Members" },
    { href: "/admin/pickup", label: "Pickup Points" },
    { href: "/admin/reports", label: "Reports" },
    ...(isSuperAdmin ? [{ href: "/admin/settings", label: "Settings" }] : []),
  ];

  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-[#d0c1ab]/40 pb-5">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm font-extrabold tracking-[.14em] uppercase text-[#241e14]">
          LOOPEC <span className="font-normal tracking-normal text-[#8e7a63]">Admin</span>
        </Link>
        <Link href="/marketplace" className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#5f574d] border border-[#d0c1ab]/50 hover:text-[#241e14] transition">
          Storefront ↗
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {links.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                active
                  ? "bg-[#241e14] text-[#eee9e2] shadow-xs"
                  : "border border-[#d0c1ab]/60 bg-white/90 text-[#524a40] hover:text-[#241e14] hover:border-[#8e7a63]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {adminName ? (
          <span className="hidden px-2 text-xs font-bold text-[#736b60] xl:inline">{adminName}</span>
        ) : null}
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-[#d0c1ab]/60 bg-white/90 px-3.5 py-2 text-xs font-bold text-[#524a40] hover:text-[#241e14] hover:border-[#8e7a63] transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
