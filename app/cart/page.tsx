import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, ShoppingBag, Trash2 } from "lucide-react";
import { requireApprovedMember } from "@/lib/auth/member";
import { authMessage } from "@/lib/auth/messages";
import { removeCartItem, updateCartQuantity } from "@/app/cart/actions";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

type CartLine = { product_id: string; quantity: number };
type CartProduct = { id: string; seller_id: string; category_id: string; name: string; price: number | string; quantity: number; item_condition: "new" | "like_new" | "good" | "used"; status: string };
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const added = Boolean(params.added);
  const { supabase, userId, profile } = await requireApprovedMember();
  const { data: lineData } = await supabase.from("cart_items").select("product_id, quantity").eq("user_id", userId).order("created_at", { ascending: true });
  const lines = (lineData ?? []) as CartLine[];
  const productIds = lines.map((line) => line.product_id);
  const { data: productData } = productIds.length
    ? await supabase.from("products").select("id, seller_id, category_id, name, price, quantity, item_condition, status").in("id", productIds)
    : { data: [] };
  const products = new Map(((productData ?? []) as CartProduct[]).map((product) => [product.id, product]));
  const visible = (productData ?? []) as CartProduct[];
  const categoryIds = [...new Set(visible.map((product) => product.category_id))];
  const sellerIds = [...new Set(visible.map((product) => product.seller_id))];
  const visibleIds = visible.map((product) => product.id);
  const [{ data: categoriesData }, { data: sellersData }, { data: imageData }] = await Promise.all([
    categoryIds.length ? supabase.from("categories").select("id, name").in("id", categoryIds) : Promise.resolve({ data: [] }),
    sellerIds.length ? supabase.from("profiles").select("id, full_name, handle").in("id", sellerIds) : Promise.resolve({ data: [] }),
    visibleIds.length ? supabase.from("product_images").select("product_id, storage_path, sort_order").in("product_id", visibleIds).order("sort_order") : Promise.resolve({ data: [] }),
  ]);
  const categoryNames = new Map(((categoriesData ?? []) as { id: string; name: string }[]).map((item) => [item.id, item.name]));
  const sellers = new Map(((sellersData ?? []) as { id: string; full_name: string; handle: string }[]).map((item) => [item.id, item]));
  const imagePaths = new Map<string, string>();
  for (const image of (imageData ?? []) as { product_id: string; storage_path: string; sort_order: number }[]) if (!imagePaths.has(image.product_id)) imagePaths.set(image.product_id, image.storage_path);
  const urls = await Promise.all([...imagePaths.entries()].map(async ([id, path]) => {
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 15 * 60);
    return [id, data?.signedUrl ?? null] as const;
  }));
  const imageUrls = new Map(urls);
  const subtotal = lines.reduce((sum, line) => {
    const product = products.get(line.product_id);
    if (!product || product.status !== "approved" || product.quantity < line.quantity) return sum;
    return sum + Number(product.price) * line.quantity;
  }, 0);
  const unavailable = lines.filter((line) => {
    const product = products.get(line.product_id);
    return !product || product.status !== "approved" || product.quantity < line.quantity;
  });

  return (
    <main className="min-h-screen bg-transparent">
      <SiteHeader profile={profile} sectionTitle="Your Cart" />
      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-xs font-semibold text-[#736b60] hover:text-[#241e14] transition"><ArrowLeft size={14} /> Keep browsing</Link>
        <div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">Campus finds</p><h1 className="mt-2 font-serif text-4xl tracking-[-.05em] text-[#241e14]">Your cart</h1></div><span className="text-sm text-[#736b60]">{lines.length} {lines.length === 1 ? "item" : "items"}</span></div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-3">
            {authMessage(errorCode) ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{authMessage(errorCode) === "Check the details and try again." ? "The quantity changed or there is not enough stock. Review the item and try again." : authMessage(errorCode)}</p> : null}
            {added ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Added to your cart. Check availability again before checkout.</p> : null}
            {unavailable.length ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-950">Some items changed or sold while in your cart. Remove those lines before checkout.</p> : null}
            {lines.length ? lines.map((line) => {
              const product = products.get(line.product_id);
              const seller = product ? sellers.get(product.seller_id) : null;
              const image = imageUrls.get(line.product_id);
              const active = product?.status === "approved" && product.quantity >= line.quantity;
              return (
                <article className="flex gap-4 rounded-[22px] border border-[#d0c1ab]/50 bg-white/80 backdrop-blur-xl p-4 sm:p-5 shadow-sm" key={line.product_id}>
                  <Link className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-[#eee9e2] sm:size-28" href={product ? `/marketplace/${product.id}` : "/marketplace"}>
                    {image ? <Image src={image} alt={product?.name ?? "Marketplace item"} fill sizes="112px" unoptimized className="object-cover" /> : <span className="grid h-full place-items-center text-[#d0c1ab]"><ShoppingBag size={23} /></span>}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      {product ? <><p className="text-[10px] font-bold uppercase tracking-[.11em] text-[#8e7a63]">{categoryNames.get(product.category_id) ?? "Campus finds"}</p><Link href={`/marketplace/${product.id}`} className="mt-1 block truncate text-sm font-semibold text-[#241e14] hover:text-[#8e7a63]">{product.name}</Link><p className="mt-1 flex items-center gap-1 text-xs text-[#736b60]"><BadgeCheck size={13} className="text-[#241e14]" /> {seller?.full_name ?? "Verified member"}</p></> : <><p className="text-sm font-semibold text-[#241e14]">Listing no longer available</p><p className="mt-1 text-xs text-[#736b60]">Remove it to continue to checkout.</p></>}
                      {!active ? <p className="mt-2 text-xs font-semibold text-rose-700">Unavailable or insufficient stock</p> : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-2">
                        {product && active && line.quantity > 1 ? <form action={updateCartQuantity}><input type="hidden" name="product_id" value={line.product_id} /><input type="hidden" name="quantity" value={line.quantity - 1} /><button className="grid size-8 place-items-center rounded-full border border-[#d0c1ab] text-[#241e14] hover:bg-[#eee9e2] transition cursor-pointer" aria-label="Decrease quantity" type="submit">−</button></form> : null}
                        <span className="min-w-7 text-center text-sm font-semibold text-[#241e14]">{line.quantity}</span>
                        {product && active && line.quantity < product.quantity ? <form action={updateCartQuantity}><input type="hidden" name="product_id" value={line.product_id} /><input type="hidden" name="quantity" value={line.quantity + 1} /><button className="grid size-8 place-items-center rounded-full border border-[#d0c1ab] text-[#241e14] hover:bg-[#eee9e2] transition cursor-pointer" aria-label="Increase quantity" type="submit">+</button></form> : null}
                      </div>
                      <div className="flex items-center gap-3"><b className="whitespace-nowrap text-sm text-[#241e14]">{product ? currency.format(Number(product.price) * line.quantity) : "—"}</b><form action={removeCartItem}><input type="hidden" name="product_id" value={line.product_id} /><button className="grid size-8 place-items-center rounded-full text-[#736b60] hover:bg-rose-50 hover:text-rose-700 cursor-pointer" type="submit" aria-label="Remove from cart"><Trash2 size={15} /></button></form></div>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-[26px] border border-dashed border-[#d0c1ab] bg-white/80 px-6 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14]"><ShoppingBag size={22} /></span><h2 className="mt-4 font-serif text-2xl text-[#241e14]">Your cart is taking a breather.</h2><p className="mt-2 text-sm text-[#736b60]">Find something useful from your campus community.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#241e14] px-5 text-sm font-semibold text-white hover:bg-[#382f20]" href="/marketplace">Browse listings</Link></div>
            )}
          </div>
          <aside className="h-fit rounded-[22px] border border-[#d0c1ab]/50 bg-white/80 backdrop-blur-xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#241e14]">Order summary</h2>
            <div className="mt-5 flex justify-between border-b border-[#d0c1ab]/30 pb-4 text-sm"><span className="text-[#736b60]">Items subtotal</span><b className="text-[#241e14]">{currency.format(subtotal)}</b></div>
            <p className="mt-4 text-xs leading-5 text-[#736b60]">Pickup details and current prices are confirmed at checkout. Each seller’s items may become a separate order.</p>
            <Link aria-disabled={!lines.length || unavailable.length > 0} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-bold text-white shadow-md transition ${lines.length && !unavailable.length ? "bg-[#241e14] hover:bg-[#382f20]" : "pointer-events-none bg-[#d0c1ab]"}`} href="/checkout">Continue to checkout</Link>
            <Link className="mt-3 block text-center text-xs font-semibold text-[#736b60] hover:text-[#241e14]" href="/marketplace">Continue shopping</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
