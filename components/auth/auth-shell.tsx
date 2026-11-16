import Link from "next/link";
import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  sidebar,
  campusBadge = "NIT Calicut Exclusive",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  campusBadge?: string;
}) {
  return (
    <main className="min-h-screen bg-transparent px-5 py-6 sm:px-8 sm:py-10">
      {/* Top Header - Glass Bar */}
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/80 bg-white/75 backdrop-blur-xl px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <Link className="flex items-center gap-2.5" href="/" aria-label="LOOPEC home">
          <BrandMark />
          <span className="text-sm font-extrabold tracking-[.14em] text-[#241e14]">LOOPEC</span>
        </Link>

        <div className="flex items-center gap-3">
          {campusBadge ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#d0c1ab]/60 bg-[#eee9e2]/80 backdrop-blur-md px-3 py-1 text-xs font-semibold text-[#241e14] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <GraduationCap className="h-3.5 w-3.5 text-[#241e14]" />
              <span>{campusBadge}</span>
            </div>
          ) : null}

          <Link
            className="text-sm font-medium text-[#736b60] transition hover:text-[#241e14]"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </div>

      {sidebar ? (
        /* Split 2-Column College Authentication Layout */
        <div className="mx-auto mt-8 max-w-6xl lg:mt-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-stretch">
            {/* Left: College Trust & Campus Showcase */}
            <div className="lg:col-span-5 flex flex-col">{sidebar}</div>

            {/* Right: Authentication Card - Frosted Glass Container */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <section className="w-full rounded-[32px] border border-white/80 bg-white/75 backdrop-blur-2xl p-6 shadow-[0_25px_70px_-25px_rgba(40,20,65,0.12),_inset_0_1px_2px_rgba(255,255,255,0.95)] sm:p-10">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[.15em] text-violet-700">
                    {eyebrow}
                  </p>
                  <span className="text-[11px] font-semibold text-violet-700 bg-violet-50/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-violet-200/70">
                    Campus ID Required
                  </span>
                </div>
                <h1 className="mt-3 font-serif text-3xl sm:text-4xl tracking-[-.045em] text-[#28232f]">
                  {title}
                </h1>
                <p className="mt-2.5 text-sm leading-6 text-[#77717e]">{description}</p>
                <div className="mt-7">{children}</div>
              </section>

              {footer ? (
                <div className="mt-6 text-center text-sm text-[#77717e]">{footer}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        /* Classic Centered Layout for Secondary Auth Pages - Frosted Glass */
        <div className="mx-auto max-w-[520px]">
          <section className="mt-12 rounded-[32px] border border-white/80 bg-white/75 backdrop-blur-2xl p-6 shadow-[0_25px_70px_-25px_rgba(40,20,65,0.12),_inset_0_1px_2px_rgba(255,255,255,0.95)] sm:mt-16 sm:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-violet-700">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-.045em] text-[#28232f]">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#77717e]">{description}</p>
            <div className="mt-8">{children}</div>
          </section>

          {footer ? (
            <div className="mt-6 text-center text-sm text-[#77717e]">{footer}</div>
          ) : null}
        </div>
      )}

      <p className="mt-12 text-center text-xs text-[#918b96]">
        A private marketplace exclusively for the National Institute of Technology Calicut community.
      </p>
    </main>
  );
}

export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-rose-200/80 bg-rose-50/80 backdrop-blur-md px-4 py-3 text-sm leading-5 text-rose-900 shadow-sm"
    >
      {children}
    </p>
  );
}

export const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-violet-200/80 bg-white/70 backdrop-blur-md px-3.5 text-sm text-[#28232f] outline-none transition placeholder:text-[#a09aa6] focus:bg-white/95 focus:border-violet-600 focus:ring-4 focus:ring-violet-500/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]";

export const labelClassName = "block text-sm font-semibold text-[#383240]";
