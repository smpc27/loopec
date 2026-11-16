import Link from "next/link";
import { ArrowRight, Menu as MenuIcon, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { connection } from "next/server";
import { ProductCard, type MarketplaceProduct } from "@/components/marketplace/product-card";
import { requireApprovedMember } from "@/lib/auth/member";
import { signOut } from "@/app/auth/actions";

export const instant = false;

type Category = { id: string; name: string; slug: string };
type ProductRow = {
  id: string;
  seller_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number | string;
  item_condition: MarketplaceProduct["item_condition"];
  quantity: number;
  is_featured: boolean;
  published_at: string | null;
};

const previewCategories: Category[] = [
  { id: "demo-books", name: "Books & study materials", slug: "books-study-materials" },
  { id: "demo-electronics", name: "Electronics", slug: "electronics" },
  { id: "demo-accessories", name: "Accessories", slug: "accessories" },
];

const previewProducts: ProductRow[] = [
  { id: "demo-calculator", seller_id: "demo-seller-1", category_id: "demo-electronics", name: "Scientific calculator", description: "A reliable calculator for coursework and exams.", price: 750, item_condition: "good", quantity: 1, is_featured: true, published_at: "2026-11-08T09:00:00.000Z" },
  { id: "demo-textbooks", seller_id: "demo-seller-2", category_id: "demo-books", name: "Engineering mathematics textbooks", description: "Two well-kept books, ready for another semester.", price: 450, item_condition: "good", quantity: 2, is_featured: false, published_at: "2026-11-07T09:00:00.000Z" },
  { id: "demo-desk-lamp", seller_id: "demo-seller-3", category_id: "demo-accessories", name: "LED study lamp", description: "Compact desk lamp with adjustable brightness.", price: 300, item_condition: "like_new", quantity: 1, is_featured: false, published_at: "2026-11-06T09:00:00.000Z" },
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePrice(value?: string) {
  if (!value || value.length > 20) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function filterPreviewProducts({
  search,
  categoryId,
  minPrice,
  maxPrice,
  sort,
  categories,
  listingType = "all",
}: {
  search: string;
  categoryId: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: "recent" | "price_low" | "price_high";
  categories: Category[];
  listingType?: string;
}) {
  const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const activeCategoryId = categories.some((category) => category.id === categoryId) ? categoryId : "";

  return [...previewProducts]
    .filter((product) => {
      const searchableText = `${product.name} ${product.description}`.toLowerCase();
      const matchesSearch = searchTerms.every((term) => searchableText.includes(term));
      const matchesCategory = !activeCategoryId || product.category_id === activeCategoryId;
      const price = Number(product.price);
      const matchesMin = minPrice === null || price >= minPrice;
      const matchesMax = maxPrice === null || price <= maxPrice;
      const isGiveaway = price === 0 || product.description.includes("[GIVEAWAY]");
      const isTrade = product.description.includes("[TRADE") || product.name.toLowerCase().includes("trade");
      const matchesType =
        listingType === "giveaway"
          ? isGiveaway
          : listingType === "trade"
          ? isTrade
          : listingType === "sale"
          ? !isGiveaway && !isTrade
          : true;
      return matchesSearch && matchesCategory && matchesMin && matchesMax && matchesType;
    })
    .sort((left, right) => {
      const featuredOrder = Number(right.is_featured) - Number(left.is_featured);
      if (sort === "price_low") return Number(left.price) - Number(right.price) || featuredOrder;
      if (sort === "price_high") return Number(right.price) - Number(left.price) || featuredOrder;
      if (featuredOrder) return featuredOrder;
      return Date.parse(right.published_at ?? "1970-01-01") - Date.parse(left.published_at ?? "1970-01-01");
    });
}

function marketplaceDataHelp(code?: string) {
  if (code === "PGRST106") return "The public schema is not exposed to the Data API. Add public to the project's exposed schemas.";
  if (code === "PGRST205" || code === "42P01") return "A required marketplace table is missing or not in the API schema cache. Apply the missing migration once, then refresh the schema cache.";
  if (code === "42501") return "The Data API reached the database, but its grants or row-level security setup is incomplete.";
  return "The app could not read marketplace data from Supabase. Check the project URL, Data API, migrations, and public schema settings.";
}

export default async function MarketplacePage({ searchParams }: PageProps<"/marketplace">) {
  await connection();
  const params = await searchParams;
  const search = (first(params.q) ?? "").trim().slice(0, 100);
  const categoryId = first(params.category) ?? "";
  const minPrice = parsePrice(first(params.min));
  const maxPrice = parsePrice(first(params.max));
  const requestedSort = first(params.sort);
  const sort = requestedSort === "price_low" || requestedSort === "price_high" ? requestedSort : "recent";
  const listingType = first(params.type) || "all";
  const previewMode = process.env.NODE_ENV === "development" && process.env.LOOPEC_DEV_BYPASS_AUTH === "true";
  const { supabase, userId, profile } = await requireApprovedMember();

  const [{ data: categoriesData }, { data: pickupData }, { count: unreadCount }] = await Promise.all([
    previewMode ? Promise.resolve({ data: previewCategories }) : supabase.from("categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
    previewMode ? Promise.resolve({ data: [{ name: "NIT Calicut" }] }) : profile.college_id
      ? supabase.from("pickup_locations").select("id, name").eq("college_id", profile.college_id).eq("is_active", true).order("sort_order").limit(1)
      : Promise.resolve({ data: [] }),
    previewMode ? Promise.resolve({ count: 0 }) : supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  const categories = (categoriesData ?? []) as Category[];

  let query = supabase
    .from("products")
    .select("id, seller_id, category_id, name, description, price, item_condition, quantity, is_featured, published_at")
    .eq("status", "approved")
    .eq("college_id", profile.college_id ?? "00000000-0000-0000-0000-000000000000")
    .gt("quantity", 0)
    .limit(60);
  if (search) query = query.textSearch("search_vector", search, { type: "plain", config: "simple" });
  if (categoryId && categories.some((category) => category.id === categoryId)) query = query.eq("category_id", categoryId);
  if (minPrice !== null) query = query.gte("price", minPrice);
  if (maxPrice !== null) query = query.lte("price", maxPrice);
  if (sort === "price_low") {
    query = query.order("price", { ascending: true }).order("is_featured", { ascending: false });
  } else if (sort === "price_high") {
    query = query.order("price", { ascending: false }).order("is_featured", { ascending: false });
  } else {
    query = query.order("is_featured", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false });
  }

  const { data: productData, error: productsError } = previewMode
    ? { data: filterPreviewProducts({ search, categoryId, minPrice, maxPrice, sort, categories, listingType }), error: null }
    : await query;
  const rawProducts = (productData ?? []) as ProductRow[];
  const products = rawProducts.filter((p) => {
    const isGiveaway = Number(p.price) === 0 || p.description?.includes("[GIVEAWAY]");
    const isTrade = p.description?.includes("[TRADE") || p.name.toLowerCase().includes("trade");
    if (listingType === "giveaway") return isGiveaway;
    if (listingType === "trade") return isTrade;
    if (listingType === "sale") return !isGiveaway && !isTrade;
    return true;
  });
  const productIds = products.map((product) => product.id);
  const sellerIds = [...new Set(products.map((product) => product.seller_id))];
  const [{ data: imageData }, { data: sellersData }, { data: savedData }] = await Promise.all([
    previewMode || !productIds.length ? Promise.resolve({ data: [] }) : supabase.from("product_images").select("product_id, storage_path, sort_order").in("product_id", productIds).order("sort_order"),
    previewMode || !sellerIds.length ? Promise.resolve({ data: [] }) : supabase.from("profiles").select("id, full_name, handle").in("id", sellerIds),
    previewMode || !productIds.length ? Promise.resolve({ data: [] }) : supabase.from("wishlists").select("product_id").eq("user_id", userId).in("product_id", productIds),
  ]);
  const images = (imageData ?? []) as { product_id: string; storage_path: string; sort_order: number }[];
  const sellers = (sellersData ?? []) as { id: string; full_name: string; handle: string }[];
  const saved = new Set((savedData ?? []).map((row) => (row as { product_id: string }).product_id));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));
  const firstImageByProduct = new Map<string, string>();
  for (const image of images) if (!firstImageByProduct.has(image.product_id)) firstImageByProduct.set(image.product_id, image.storage_path);
  const pathByProduct = products.map((product) => firstImageByProduct.get(product.id)).filter((path): path is string => Boolean(path));
  const imageUrls = new Map<string, string>();
  const urlResults = await Promise.all(pathByProduct.map(async (path) => {
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 15 * 60);
    return [path, data?.signedUrl ?? ""] as const;
  }));
  for (const [path, url] of urlResults) if (url) imageUrls.set(path, url);

  const cards: MarketplaceProduct[] = products.map((product) => {
    const seller = sellerById.get(product.seller_id);
    const imagePath = firstImageByProduct.get(product.id);
    return {
      ...product,
      categoryName: categoryNames.get(product.category_id) ?? "Campus finds",
      sellerName: seller?.full_name ?? "Verified member",
      sellerHandle: seller?.handle ?? "member",
      imageUrl: imagePath ? imageUrls.get(imagePath) ?? null : null,
    };
  });
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const pickupName = (pickupData?.[0] as { name?: string } | undefined)?.name;

  function buildTypeUrl(newType: string) {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (categoryId) p.set("category", categoryId);
    if (minPrice !== null) p.set("min", String(minPrice));
    if (maxPrice !== null) p.set("max", String(maxPrice));
    if (sort !== "recent") p.set("sort", sort);
    if (newType !== "all") p.set("type", newType);
    const qs = p.toString();
    return `/marketplace${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="min-h-screen bg-transparent">
      {previewMode ? <span className="sr-only">Developer preview</span> : null}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex min-h-[74px] max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/marketplace" className="text-sm font-extrabold tracking-[.14em] text-[#302546]">LOOPEC <span className="ml-2 hidden font-normal tracking-normal text-[#8b8590] sm:inline">Marketplace</span></Link>
          <nav className="flex items-center gap-2 text-sm">
            <div className="hidden items-center gap-1 lg:flex">
              <Link className="rounded-full px-3 py-2 text-[#625b6b] hover:bg-violet-50/80 hover:text-violet-900 transition" href="/orders">Orders</Link>
              <Link className="rounded-full px-3 py-2 text-[#625b6b] hover:bg-violet-50/80 hover:text-violet-900 transition" href="/messages">Messages</Link>
              <Link className="rounded-full px-3 py-2 text-[#625b6b] hover:bg-violet-50/80 hover:text-violet-900 transition" href="/notifications">Alerts{unreadCount ? ` · ${unreadCount}` : ""}</Link>
              <Link className="rounded-full px-3 py-2 text-[#625b6b] hover:bg-violet-50/80 hover:text-violet-900 transition" href="/wishlist">Wishlist</Link>
              <Link className="rounded-full px-3 py-2 text-[#625b6b] hover:bg-violet-50/80 hover:text-violet-900 transition" href="/feedback">Feedback</Link>
              <Link className="rounded-full px-3 py-2 text-[#625b6b] hover:bg-violet-50/80 hover:text-violet-900 transition" href="/dashboard">Studio</Link>
              <Link className="rounded-full px-3 py-2 text-[#625b6b] hover:bg-violet-50/80 hover:text-violet-900 transition" href="/profile">Profile</Link>
              {profile.role === "college_admin" || profile.role === "super_admin" ? <Link className="rounded-full px-3 py-2 text-[#625b6b] hover:bg-violet-50/80 hover:text-violet-900 transition" href="/admin">Admin</Link> : null}
            </div>
            <details className="relative lg:hidden">
              <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-white/80 bg-white/70 backdrop-blur-md px-3 text-xs font-semibold text-[#504a57] outline-none hover:border-violet-300 focus-visible:ring-4 focus-visible:ring-violet-100 shadow-sm">
                <MenuIcon size={15} aria-hidden="true" /> Menu
              </summary>
              <div className="absolute right-0 top-12 z-50 grid w-56 gap-1 rounded-2xl border border-white/80 bg-white/90 backdrop-blur-2xl p-2 shadow-[0_18px_50px_-25px_rgba(35,23,55,.4)]">
                <Link className="rounded-xl px-3 py-2.5 text-sm text-[#504a57] hover:bg-violet-50" href="/orders">Orders</Link>
                <Link className="rounded-xl px-3 py-2.5 text-sm text-[#504a57] hover:bg-violet-50" href="/messages">Messages</Link>
                <Link className="rounded-xl px-3 py-2.5 text-sm text-[#504a57] hover:bg-violet-50" href="/notifications">Alerts{unreadCount ? ` · ${unreadCount}` : ""}</Link>
                <Link className="rounded-xl px-3 py-2.5 text-sm text-[#504a57] hover:bg-violet-50" href="/wishlist">Wishlist</Link>
                <Link className="rounded-xl px-3 py-2.5 text-sm text-[#504a57] hover:bg-violet-50" href="/feedback">Campus Feedback</Link>
                <Link className="rounded-xl px-3 py-2.5 text-sm text-[#504a57] hover:bg-violet-50" href="/dashboard">Seller studio</Link>
                <Link className="rounded-xl px-3 py-2.5 text-sm text-[#504a57] hover:bg-violet-50" href="/profile">Profile</Link>
                {profile.role === "college_admin" || profile.role === "super_admin" ? <Link className="rounded-xl px-3 py-2.5 text-sm text-[#504a57] hover:bg-violet-50" href="/admin">Admin</Link> : null}
                <form action={signOut} className="border-t border-[#f0edf0] pt-1"><button className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#77717e] hover:bg-violet-50 hover:text-violet-950" type="submit">Sign out</button></form>
              </div>
            </details>
            <Link aria-label="List an item" className="inline-flex min-h-10 items-center rounded-full bg-gradient-to-r from-violet-950 to-purple-900 px-4 text-xs font-semibold text-white shadow-md shadow-violet-950/20 transition hover:opacity-95" href="/listings/new"><span className="hidden sm:inline">List an item</span><span className="sm:hidden">Sell</span><span className="ml-1">+</span></Link>
            <form action={signOut}><button className="hidden min-h-10 rounded-full px-3 text-xs font-semibold text-[#77717e] hover:text-violet-950 lg:inline-flex" type="submit">Sign out</button></form>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-violet-700"><ShieldCheck size={14} /> Verified campus exchange</p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-.055em] text-[#28232f] sm:text-5xl">Find it in your loop.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#77717e]">Browse items shared by verified members of your college community.</p>
          </div>
          {pickupName ? <p className="rounded-full border border-white/80 bg-white/70 backdrop-blur-md px-4 py-2.5 text-xs text-[#524b5c] shadow-sm">Campus pickup · <b className="text-violet-950">{pickupName}</b></p> : null}
        </div>

        {/* Quick Type Filter Tabs - Glass Pills */}
        <div className="mt-7 flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Link
            href={buildTypeUrl("all")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              listingType === "all"
                ? "bg-gradient-to-r from-violet-950 to-purple-900 text-white shadow-md shadow-violet-950/20"
                : "border border-white/80 bg-white/70 backdrop-blur-md text-[#554d60] hover:bg-white hover:border-violet-300 shadow-sm"
            }`}
          >
            All Items
          </Link>
          <Link
            href={buildTypeUrl("sale")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              listingType === "sale"
                ? "bg-gradient-to-r from-violet-950 to-purple-900 text-white shadow-md shadow-violet-950/20"
                : "border border-white/80 bg-white/70 backdrop-blur-md text-[#554d60] hover:bg-white hover:border-violet-300 shadow-sm"
            }`}
          >
            🏷️ For Sale
          </Link>
          <Link
            href={buildTypeUrl("trade")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              listingType === "trade"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25"
                : "border border-indigo-200/80 bg-white/70 backdrop-blur-md text-indigo-900 hover:bg-white hover:border-indigo-400 shadow-sm"
            }`}
          >
            🔄 Trade / Barter
          </Link>
          <Link
            href={buildTypeUrl("giveaway")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              listingType === "giveaway"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/25"
                : "border border-emerald-200/80 bg-white/70 backdrop-blur-md text-emerald-900 hover:bg-white hover:border-emerald-400 shadow-sm"
            }`}
          >
            🎁 Free Giveaways
          </Link>
        </div>

        {/* Search Bar - Frosted Glass Bar */}
        <form className="mt-4 grid gap-3 rounded-[28px] border border-white/80 bg-white/75 backdrop-blur-2xl p-3.5 shadow-[0_20px_50px_-25px_rgba(43,29,68,0.1),_inset_0_1px_2px_rgba(255,255,255,0.95)] sm:grid-cols-[minmax(0,1fr)_180px_130px_130px_150px_auto] sm:items-center">
          <input type="hidden" name="type" value={listingType} />
          <label className="relative block min-w-0"><span className="sr-only">Search products</span><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#928b96]" size={16} /><input className="h-11 w-full rounded-full bg-white/70 border border-violet-100/70 pl-10 pr-4 text-sm outline-none transition focus:bg-white focus:ring-4 focus:ring-violet-200" type="search" name="q" defaultValue={search} placeholder="Search the campus marketplace" /></label>
          <label><span className="sr-only">Filter by category</span><select className="h-11 w-full rounded-full bg-white/70 border border-violet-100/70 px-4 text-sm text-[#504a57] outline-none focus:bg-white focus:ring-4 focus:ring-violet-200" name="category" defaultValue={categoryId}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span className="sr-only">Minimum price</span><input className="h-11 w-full rounded-full bg-white/70 border border-violet-100/70 px-4 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-violet-200" name="min" type="number" min="0" step="1" placeholder="Min ₹" defaultValue={first(params.min) ?? ""} /></label>
          <label><span className="sr-only">Maximum price</span><input className="h-11 w-full rounded-full bg-white/70 border border-violet-100/70 px-4 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-violet-200" name="max" type="number" min="0" step="1" placeholder="Max ₹" defaultValue={first(params.max) ?? ""} /></label>
          <label><span className="sr-only">Sort products</span><select className="h-11 w-full rounded-full bg-white/70 border border-violet-100/70 px-4 text-sm text-[#504a57] outline-none focus:bg-white focus:ring-4 focus:ring-violet-200" name="sort" defaultValue={sort}><option value="recent">Recently added</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option></select></label>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-950 to-purple-900 px-5 text-sm font-semibold text-white shadow-md shadow-violet-950/20 transition hover:opacity-95" type="submit"><SlidersHorizontal size={15} /> Filter</button>
        </form>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#77717e]">{selectedCategory ? <><b className="text-[#403a47]">{selectedCategory.name}</b><span className="mx-2">·</span></> : null}{search ? <>Results for <b className="text-[#403a47]">“{search}”</b><span className="mx-2">·</span></> : null}{cards.length} {cards.length === 1 ? "item" : "items"}</p>
          <span className="text-[11px] font-medium text-[#928b96]">Verified listings · private to your campus</span>
        </div>
        {productsError ? (
          <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <p className="font-semibold">Marketplace data could not be loaded.</p>
            <p className="mt-1">{marketplaceDataHelp(productsError.code)}</p>
            <Link className="mt-3 inline-flex font-semibold text-violet-900 underline underline-offset-4" href="/setup#data-api">Open the Supabase connection steps</Link>
          </div>
        ) : cards.length ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((product) => <ProductCard key={product.id} product={product} saved={saved.has(product.id)} returnTo="/marketplace" currentUserId={userId} previewMode={previewMode} />)}
          </div>
        ) : (
          <div className="mt-5 rounded-[28px] border border-dashed border-[#d9d2e0] bg-white px-6 py-16 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f6f3fa] text-violet-800"><Search size={21} /></span>
            <h2 className="mt-4 font-serif text-2xl text-[#28232f]">No listings match just yet.</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#77717e]">Try another search or check back when your campus community adds more items.</p>
            <Link className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-800 hover:text-violet-950" href="/listings/new">Have something to share? List an item <ArrowRight size={15} /></Link>
          </div>
        )}
      </section>
    </main>
  );
}
