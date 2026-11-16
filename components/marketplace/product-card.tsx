import Image from "next/image";
import Link from "next/link";
import { Bookmark, PackageOpen } from "lucide-react";
import { toggleWishlist } from "@/app/marketplace/actions";

export type MarketplaceProduct = {
  id: string;
  seller_id: string;
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

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const conditionLabel: Record<MarketplaceProduct["item_condition"], string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  used: "Used",
};

export function ProductCard({
  product,
  saved,
  returnTo = "/marketplace",
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
  const isGiveaway = Number(product.price) === 0 || product.description?.includes("[GIVEAWAY]");
  const isTrade = product.description?.includes("[TRADE") || product.name.toLowerCase().includes("trade");

  return (
    <article className="group overflow-hidden rounded-[26px] border border-white/80 bg-white/75 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_45px_-15px_rgba(43,29,68,0.14)] hover:bg-white/90 hover:border-white shadow-[0_8px_25px_-12px_rgba(43,29,68,0.06),_inset_0_1px_1px_rgba(255,255,255,0.9)]">
      <div className="relative aspect-[1.15/1] overflow-hidden bg-gradient-to-br from-[#f2eff7] to-[#ede7f5]">
        {product.imageUrl ? (
          <Image className="object-cover transition duration-500 group-hover:scale-[1.035]" src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 44vw, 25vw" unoptimized />
        ) : (
          <div className="grid h-full place-items-center text-violet-300"><PackageOpen size={34} strokeWidth={1.3} /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-[#4c4556] shadow-sm backdrop-blur-md">{conditionLabel[product.item_condition]}</span>
        {isGiveaway ? (
          <span className="absolute right-3 top-3 rounded-full border border-emerald-400/30 bg-emerald-600/95 px-3 py-1.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
            🎁 FREE
          </span>
        ) : isTrade ? (
          <span className="absolute right-3 top-3 rounded-full border border-indigo-400/30 bg-indigo-600/95 px-3 py-1.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
            🔄 TRADE
          </span>
        ) : product.is_featured ? (
          <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-violet-950/90 px-3 py-1.5 text-[10px] font-semibold text-white shadow-md backdrop-blur-md">Featured</span>
        ) : null}
      </div>
      <div className="p-4.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[.11em] text-violet-700">{product.categoryName}</p>
            {previewMode ? <span className="mt-1.5 line-clamp-2 block min-h-[44px] text-[15px] font-semibold leading-[1.45] text-[#302b37]">{product.name}</span> : <Link href={`/marketplace/${product.id}`} className="mt-1.5 line-clamp-2 block min-h-[44px] text-[15px] font-semibold leading-[1.45] text-[#302b37] transition hover:text-violet-800">{product.name}</Link>}
          </div>
          {product.seller_id !== currentUserId && !previewMode ? (
            <form action={toggleWishlist}>
              <input type="hidden" name="product_id" value={product.id} />
              <input type="hidden" name="return_to" value={returnTo} />
              <button className={`grid size-9 shrink-0 place-items-center rounded-full border transition-all ${saved ? "border-violet-300 bg-violet-100/80 text-violet-800 shadow-sm" : "border-white/80 bg-white/70 backdrop-blur-md text-[#7c7585] hover:bg-white hover:text-violet-800 shadow-sm"}`} type="submit" aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} title={saved ? "Saved to wishlist" : "Save to wishlist"}>
                <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
              </button>
            </form>
          ) : null}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-purple-100/60 pt-3.5">
          <div>
            {isGiveaway ? (
              <p className="text-lg font-bold tracking-tight text-emerald-700">FREE</p>
            ) : isTrade ? (
              <div>
                <p className="text-base font-bold tracking-tight text-indigo-950">Trade / Barter</p>
                {Number(product.price) > 0 ? (
                  <span className="text-[11px] text-gray-500">Valued ~ {currency.format(Number(product.price))}</span>
                ) : null}
              </div>
            ) : (
              <p className="text-lg font-bold tracking-tight text-[#2b2632]">{currency.format(Number(product.price))}</p>
            )}
            {showSeller ? previewMode ? <span className="mt-1 block max-w-[160px] truncate text-[11px] text-[#817a87]">{product.sellerName}</span> : <Link href={`/members/${product.sellerHandle}`} className="mt-1 block max-w-[160px] truncate text-[11px] text-[#817a87] hover:text-violet-800">{product.sellerName}</Link> : null}
          </div>
          <span className="text-[10px] text-[#928b96]">{product.quantity} available</span>
        </div>
      </div>
    </article>
  );
}
