"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { ProductCard, readLocalWishlistIds, type MarketplaceProduct } from "@/components/marketplace/product-card";

export function SavedCampusItems({
  firestoreProducts,
  currentUserId,
  hasDbSaved,
}: {
  firestoreProducts: MarketplaceProduct[];
  currentUserId: string;
  hasDbSaved: boolean;
}) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSavedIds(readLocalWishlistIds());
      setHydrated(true);
    };
    const id = requestAnimationFrame(sync);
    window.addEventListener("loopec:wishlist-change", sync);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("loopec:wishlist-change", sync);
    };
  }, []);

  const matched = hydrated ? firestoreProducts.filter((item) => savedIds.includes(item.id)) : [];

  if (!hydrated) {
    return null;
  }

  if (matched.length === 0) {
    if (hasDbSaved) return null;
    return (
      <div className="mt-6 rounded-[26px] border border-dashed border-[#d0c1ab] bg-white/80 px-6 py-16 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14]">
          <Bookmark size={22} />
        </span>
        <h2 className="mt-4 font-serif text-2xl text-[#241e14]">Keep an eye on something.</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#736b60]">
          Save listings as you browse, and they’ll be gathered here for your next campus find.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#241e14] hover:bg-[#382f20] px-5 text-sm font-semibold text-white shadow-sm transition"
          href="/marketplace"
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className={hasDbSaved ? "mt-8" : "mt-6"}>
      {hasDbSaved ? (
        <p className="mb-4 text-xs font-bold uppercase tracking-[.14em] text-[#8e7a63]">
          Saved campus listings
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {matched.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            saved={true}
            returnTo="/wishlist"
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
