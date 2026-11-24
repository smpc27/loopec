"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  Store,
  Package,
  MessageSquare,
  Bell,
  Heart,
  Lightbulb,
  LayoutDashboard,
  User,
  ShieldCheck,
  Plus,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { signOut } from "@/app/auth/actions";

export type HeaderProfile = {
  id?: string;
  full_name?: string | null;
  handle?: string | null;
  role?: string | null;
  avatar_url?: string | null;
};

export type SiteHeaderProps = {
  variant?: "app" | "marketing";
  profile?: HeaderProfile | null;
  unreadAlertsCount?: number;
  unreadMessagesCount?: number;
  campusName?: string;
  sectionTitle?: string;
};

export function SiteHeader({
  variant = "app",
  profile = null,
  unreadAlertsCount = 0,
  unreadMessagesCount = 0,
  campusName = "NIT Calicut",
  sectionTitle,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsCount, setAlertsCount] = useState(unreadAlertsCount);
  const [messagesCount, setMessagesCount] = useState(unreadMessagesCount);
  const menuRef = useRef<HTMLDivElement>(null);

  // Background fetch of unread badges so page rendering is never blocked
  useEffect(() => {
    if (!profile) return;
    let isMounted = true;
    fetch("/api/badges")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (typeof data.unreadAlerts === "number") setAlertsCount(data.unreadAlerts);
        if (typeof data.unreadMessages === "number") setMessagesCount(data.unreadMessages);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [profile, pathname]);

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape key press or outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    // Prevent body scroll when mobile menu is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isAdmin = profile?.role === "college_admin" || profile?.role === "super_admin";
  const isAuthenticated = Boolean(profile);

  // App navigation items
  const appNavItems = [
    { label: "Marketplace", href: "/marketplace", icon: Store },
    { label: "Orders", href: "/orders", icon: Package },
    {
      label: "Messages",
      href: "/messages",
      icon: MessageSquare,
      badge: messagesCount > 0 ? messagesCount : undefined,
    },
    {
      label: "Alerts",
      href: "/notifications",
      icon: Bell,
      badge: alertsCount > 0 ? alertsCount : undefined,
    },
    { label: "Wishlist", href: "/wishlist", icon: Heart },
    { label: "Feedback", href: "/feedback", icon: Lightbulb },
    { label: "Studio", href: "/dashboard", icon: LayoutDashboard },
    { label: "Profile", href: "/profile", icon: User },
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: ShieldCheck }] : []),
  ];

  // Marketing navigation items
  const marketingNavItems = [
    { label: "Marketplace", href: "/marketplace" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Our community", href: "/#community" },
    { label: "Campus Feedback", href: "/feedback" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#d0c1ab]/40 bg-white/85 backdrop-blur-xl shadow-[0_4px_30px_rgba(36,30,20,0.03)] transition-all pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex min-h-[60px] sm:min-h-[64px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href={isAuthenticated ? "/marketplace" : "/"}
            className="flex items-center transition group focus:outline-none py-1"
            aria-label="LOOPEC home"
          >
            <BrandMark compact />
          </Link>

          {sectionTitle ? (
            <span className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-[#736b60] border-l border-[#d0c1ab]/60 pl-3">
              {sectionTitle}
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#eee9e2] px-2.5 py-1 text-[11px] font-semibold text-[#5f574d]">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              {campusName}
            </span>
          )}
        </div>

        {/* Desktop Navigation */}
        {variant === "marketing" && !isAuthenticated ? (
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {marketingNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs font-semibold text-[#5f574d] hover:text-[#241e14] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold" aria-label="App navigation">
            {appNavItems.map((item) => {
              const isActive =
                item.href === "/marketplace"
                  ? pathname === "/marketplace"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-3 py-2 transition-all ${
                    isActive
                      ? "bg-[#241e14] text-white shadow-sm font-bold"
                      : "text-[#5f574d] hover:bg-[#eee9e2] hover:text-[#241e14]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {item.label}
                    {item.badge ? (
                      <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right CTA Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {variant === "marketing" && !isAuthenticated ? (
            <>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center rounded-full border border-[#d0c1ab] bg-white/80 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-[#241e14] hover:bg-[#eee9e2] transition shadow-xs active:scale-95"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-full bg-[#241e14] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white hover:bg-[#382f20] transition shadow-md shadow-[#241e14]/20 active:scale-95 whitespace-nowrap"
              >
                <span>Join</span>
                <span className="hidden sm:inline">campus</span>
                <ArrowRight size={13} />
              </Link>
            </>
          ) : (
            <>
              {/* Sell CTA button */}
              <Link
                href="/listings/new"
                aria-label="List an item to sell or giveaway"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#241e14] hover:bg-[#382f20] px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white shadow-md shadow-[#241e14]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">List an item</span>
                <span className="sm:hidden">Sell</span>
              </Link>

              {/* Desktop Sign Out */}
              <form action={signOut} className="hidden lg:block">
                <button
                  type="submit"
                  className="rounded-full px-3 py-2 text-xs font-semibold text-[#736b60] hover:text-[#241e14] hover:bg-[#eee9e2] transition"
                >
                  Sign out
                </button>
              </form>
            </>
          )}

          {/* Mobile & Tablet Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="grid size-9 sm:size-10 place-items-center rounded-full border border-[#d0c1ab]/60 bg-white/80 text-[#241e14] hover:bg-[#eee9e2] hover:border-[#241e14] lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#241e14] shadow-sm transition active:scale-95"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Full-Width Drawer Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-[calc(56px+env(safe-area-inset-top,0px))] sm:top-[calc(64px+env(safe-area-inset-top,0px))] z-40 bg-black/30 backdrop-blur-sm lg:hidden transition-opacity animate-in fade-in"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu Container */}
          <div
            ref={menuRef}
            className="fixed inset-x-0 top-[calc(56px+env(safe-area-inset-top,0px))] sm:top-[calc(64px+env(safe-area-inset-top,0px))] z-50 max-h-[calc(100vh-80px)] overflow-y-auto border-b border-[#d0c1ab] bg-white/95 p-5 backdrop-blur-2xl shadow-2xl lg:hidden animate-in slide-in-from-top-4 duration-200"
          >
            {/* Header / Member identity banner */}
            {isAuthenticated ? (
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#eee9e2]/80 p-3.5 border border-[#d0c1ab]/40">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-full bg-[#241e14] font-serif text-sm font-bold text-white shadow-sm">
                    {(profile?.full_name ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#241e14]">
                      {profile?.full_name ?? "Campus Member"}
                    </p>
                    <p className="truncate text-[11px] text-[#736b60]">
                      @{profile?.handle ?? "member"} · {campusName}
                    </p>
                  </div>
                </div>
                {isAdmin ? (
                  <span className="rounded-full bg-[#241e14] px-2.5 py-0.5 text-[10px] font-bold text-white">
                    Admin
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Links list */}
            <nav className="grid gap-1" aria-label="Mobile Navigation Links">
              {variant === "marketing" && !isAuthenticated
                ? marketingNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                          isActive
                            ? "bg-[#241e14] text-white shadow-sm font-bold"
                            : "text-[#241e14] hover:bg-[#eee9e2]"
                        }`}
                      >
                        <span>{item.label}</span>
                      </Link>
                    );
                  })
                : appNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/marketplace"
                        ? pathname === "/marketplace"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                          isActive
                            ? "bg-[#241e14] text-white shadow-sm font-bold"
                            : "text-[#241e14] hover:bg-[#eee9e2]"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={18} className={isActive ? "text-white" : "text-[#736b60]"} />
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
            </nav>

            {/* Mobile Actions Bottom */}
            <div className="mt-5 border-t border-[#d0c1ab]/50 pt-4 flex flex-col gap-2.5">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/listings/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#241e14] py-3 text-center text-xs font-bold text-white shadow-md shadow-[#241e14]/20 hover:bg-[#382f20] transition"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    List an item (+ Sell or Giveaway)
                  </Link>

                  <form action={signOut} className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d0c1ab]/60 bg-transparent py-2.5 text-xs font-semibold text-[#736b60] hover:bg-[#eee9e2] hover:text-[#241e14] transition"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </form>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/auth/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-xl border border-[#d0c1ab] py-2.5 text-xs font-bold text-[#241e14] hover:bg-[#eee9e2]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-xl bg-[#241e14] py-2.5 text-xs font-bold text-white hover:bg-[#382f20]"
                  >
                    Join campus
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
