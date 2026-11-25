"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  PackageOpen,
  BookOpen,
  Laptop,
  Compass,
  Bike,
  Sparkles,
  Home,
  CheckCircle2,
} from "lucide-react";
import { toggleWishlistDirect } from "@/app/marketplace/actions";

export type MarketplaceProduct = {
  id: string;
  seller_id: string;
  category_id?: string;
  name: string;
  description: string;
  price: number | string;
  item_condition: "new" | "like_new" | "good" | "used";
  quantity: number;
  is_featured: boolean;
  published_at: string | null;
  categoryName: string;
  sellerName: string;
  sellerHandle: string;
  imageUrl: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const LOCAL_WISHLIST_STORAGE_KEY = "loopec_saved_firestore_items";

export function readLocalWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalWishlistIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_WISHLIST_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("loopec:wishlist-change"));
  } catch {
    // Ignore storage quota errors
  }
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const conditionBadges: Record<
  MarketplaceProduct["item_condition"],
  { label: string; bg: string; dot: string }
> = {
  new: { label: "Brand new", bg: "bg-emerald-50 text-emerald-900 border-emerald-200/80", dot: "bg-emerald-500" },
  like_new: { label: "Like new", bg: "bg-teal-50 text-teal-900 border-teal-200/80", dot: "bg-teal-500" },
  good: { label: "Good condition", bg: "bg-amber-50 text-amber-950 border-amber-200/80", dot: "bg-amber-500" },
  used: { label: "Campus used", bg: "bg-[#eee9e2] text-[#524a40] border-[#d0c1ab]/70", dot: "bg-[#8e7a63]" },
};

function CategoryPlaceholderIcon({
  categoryName,
  size,
  className,
}: {
  categoryName: string;
  size: number;
  className?: string;
}) {
  const lower = categoryName.toLowerCase();
  if (lower.includes("book") || lower.includes("study") || lower.includes("notes") || lower.includes("textbook")) return <BookOpen size={size} className={className} />;
  if (lower.includes("electr") || lower.includes("gadget") || lower.includes("calc") || lower.includes("laptop")) return <Laptop size={size} className={className} />;
  if (lower.includes("station") || lower.includes("draft") || lower.includes("tool")) return <Compass size={size} className={className} />;
  if (lower.includes("sport") || lower.includes("cycle") || lower.includes("bike")) return <Bike size={size} className={className} />;
  if (lower.includes("hostel") || lower.includes("room") || lower.includes("furnit") || lower.includes("lamp")) return <Home size={size} className={className} />;
  return <PackageOpen size={size} className={className} />;
}

export function ProductCard({
  product,
  saved: initialSaved,
  showSeller = true,
  currentUserId,
  previewMode = false,
}: {
  product: MarketplaceProduct;
  saved: boolean;
  returnTo?: string;
  showSeller?: boolean;
  currentUserId: string;
  previewMode?: boolean;
}) {
  const isUuid = UUID_REGEX.test(product.id);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (isUuid) return;
    const syncLocal = () => {
      const savedIds = readLocalWishlistIds();
      setIsSaved(savedIds.includes(product.id));
    };
    const id = requestAnimationFrame(syncLocal);
    window.addEventListener("loopec:wishlist-change", syncLocal);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("loopec:wishlist-change", syncLocal);
    };
  }, [isUuid, product.id]);

  const isGiveaway = Number(product.price) === 0 || product.description?.includes("[GIVEAWAY]");
  const isTrade = product.description?.includes("[TRADE") || product.name.toLowerCase().includes("trade");
  const badge = conditionBadges[product.item_condition] || conditionBadges.good;

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    if (!isUuid) {
      const current = new Set(readLocalWishlistIds());
      if (nextSaved) current.add(product.id);
      else current.delete(product.id);
      writeLocalWishlistIds([...current]);
      return;
    }

    startTransition(async () => {
      try {
        const res = await toggleWishlistDirect(product.id);
        if (!res.success) {
          setIsSaved(!nextSaved);
        }
      } catch {
        setIsSaved(!nextSaved);
      }
    });
  };

  return (
    <article className="group relative overflow-hidden rounded-[26px] border border-white/80 bg-white/75 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_45px_-15px_rgba(36,30,20,0.12)] hover:bg-white/95 hover:border-white shadow-[0_8px_25px_-12px_rgba(36,30,20,0.06),_inset_0_1px_1px_rgba(255,255,255,0.9)] active:scale-[0.99]">
      <div className="relative aspect-[1.18/1] overflow-hidden bg-gradient-to-br from-[#eee9e2] to-[#e4ded5]">
        {product.imageUrl ? (
          <Image
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 44vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="relative grid h-full place-items-center bg-gradient-to-br from-[#f8f5f0] via-[#ede6dc] to-[#e0d6c9] p-6 text-center select-none">
            <div className="relative size-16 rounded-3xl bg-white/90 border border-white flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <CategoryPlaceholderIcon categoryName={product.categoryName} size={30} className="text-[#241e14]" />
            </div>
            <span className="mt-2 text-[10.5px] font-bold tracking-wider uppercase text-[#8e7a63]">
              {product.categoryName}
            </span>
          </div>
        )}

        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-xs backdrop-blur-md transition-transform group-hover:scale-105 ${badge.bg}`}
        >
          <span className={`size-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>

        {isGiveaway ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-700/95 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
            FREE
          </span>
        ) : isTrade ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#d0c1ab]/50 bg-[#241e14]/95 px-3 py-1 text-xs font-bold text-[#eee9e2] shadow-md backdrop-blur-md">
            TRADE
          </span>
        ) : product.is_featured ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-600 to-amber-700 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
            <Sparkles size={11} /> Featured
          </span>
        ) : null}
      </div>

      <div className="p-4 sm:p-4.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-[#8e7a63]">
              {product.categoryName}
            </p>
            {previewMode ? (
              <Link
                href={`/marketplace/${product.id}`}
                className="mt-1 line-clamp-2 block min-h-[44px] text-base font-bold leading-snug text-[#241e14] transition hover:text-[#8e7a63]"
              >
                {product.name}
              </Link>
            ) : (
              <Link
                href={`/marketplace/${product.id}`}
                className="mt-1 line-clamp-2 block min-h-[44px] text-base font-bold leading-snug text-[#241e14] transition hover:text-[#8e7a63]"
              >
                {product.name}
              </Link>
            )}
          </div>

          {product.seller_id !== currentUserId ? (
            <button
              onClick={handleToggleWishlist}
              className={`grid size-9 shrink-0 place-items-center rounded-full border transition-all cursor-pointer active:scale-125 duration-200 ${
                isSaved
                  ? "border-[#241e14] bg-[#241e14] text-white shadow-md shadow-[#241e14]/25 scale-105"
                  : "border-[#d0c1ab]/60 bg-white/80 backdrop-blur-md text-[#736b60] hover:bg-white hover:text-[#241e14] shadow-xs hover:border-[#241e14]"
              }`}
              type="button"
              aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              title={isSaved ? "Saved to wishlist" : "Save to wishlist"}
            >
              <Bookmark
                size={16}
                fill={isSaved ? "currentColor" : "none"}
                className={`transition-transform duration-200 ${isSaved ? "scale-110" : ""}`}
              />
            </button>
          ) : null}
        </div>

        <div className="mt-3.5 flex items-end justify-between gap-3 border-t border-[#d0c1ab]/40 pt-3">
          <div>
            {isGiveaway ? (
              <p className="text-xl font-black tracking-tight text-emerald-800">FREE</p>
            ) : isTrade ? (
              <div>
                <p className="text-base font-bold tracking-tight text-[#241e14]">Trade / Barter</p>
                {Number(product.price) > 0 ? (
                  <span className="text-xs font-semibold text-[#736b60]">
                    Valued ~ {currency.format(Number(product.price))}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-lg sm:text-xl font-extrabold tracking-tight text-[#241e14]">
                {currency.format(Number(product.price))}
              </p>
            )}
            {showSeller ? (
              previewMode && product.sellerHandle === "member" ? (
                <span className="mt-1 block max-w-[160px] truncate text-xs font-semibold text-[#524a40]">
                  {product.sellerName}
                </span>
              ) : (
                <Link
                  href={`/members/${product.sellerHandle}`}
                  className="mt-1 inline-flex items-center gap-1 max-w-[160px] truncate text-xs font-semibold text-[#524a40] hover:text-[#241e14] transition"
                >
                  <CheckCircle2 size={11} className="text-emerald-700 shrink-0" />
                  <span className="truncate">{product.sellerName}</span>
                </Link>
              )
            ) : null}
          </div>
          <span className="text-xs font-semibold text-[#8e7a63]">
            {product.quantity} available
          </span>
        </div>
      </div>
    </article>
  );
}
