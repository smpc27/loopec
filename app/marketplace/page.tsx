import Link from "next/link";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { connection } from "next/server";
import { ProductCard, type MarketplaceProduct } from "@/components/marketplace/product-card";
import { MarketplaceFilterDock } from "@/components/marketplace/marketplace-filter-dock";
import { requireApprovedMember } from "@/lib/auth/member";
import { SiteHeader } from "@/components/navigation/site-header";
import { getFirestoreProducts } from "@/lib/firebase/firestore";

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

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function resolveProductImageUrls(
  supabase: Awaited<ReturnType<typeof requireApprovedMember>>["supabase"],
  paths: string[]
) {
  const imageUrls = new Map<string, string>();
  const pathsToSign: string[] = [];
  const now = Date.now();

  for (const path of paths) {
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt > now + 60000) {
      imageUrls.set(path, cached.url);
    } else {
      pathsToSign.push(path);
    }
  }

  if (pathsToSign.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("product-images")
      .createSignedUrls(pathsToSign, 3600);
    if (signedUrls) {
      for (const item of signedUrls) {
        if (item.signedUrl && item.path) {
          imageUrls.set(item.path, item.signedUrl);
          signedUrlCache.set(item.path, {
            url: item.signedUrl,
            expiresAt: now + 3500 * 1000,
          });
        }
      }
    }
  }

  return imageUrls;
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
  const submitted = Boolean(first(params.submitted));
  const previewMode = process.env.NODE_ENV === "development" && process.env.LOOPEC_DEV_BYPASS_AUTH === "true";
  const { supabase, userId, profile } = await requireApprovedMember();
  const isUuidCategory = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);

  const [
    { data: categoriesData },
    { data: pickupData },
    { count: unreadCount },
  ] = await Promise.all([
    previewMode ? Promise.resolve({ data: previewCategories }) : supabase.from("categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
    previewMode ? Promise.resolve({ data: [{ name: "NIT Calicut" }] }) : profile.college_id
      ? supabase.from("pickup_locations").select("id, name").eq("college_id", profile.college_id).eq("is_active", true).order("sort_order").limit(1)
      : Promise.resolve({ data: [] }),
    previewMode ? Promise.resolve({ count: 0 }) : supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  const categories = (categoriesData ?? []) as Category[];
  const selectedCategory = categories.find((category) => category.id === categoryId || category.slug === categoryId);
  const resolvedCategoryId = isUuidCategory ? categoryId : selectedCategory?.id ?? "";

  let productResult: { data: ProductRow[] | null; error: { message: string; code?: string } | null };
  if (previewMode) {
    productResult = {
      data: filterPreviewProducts({ search, categoryId: resolvedCategoryId || categoryId, minPrice, maxPrice, sort, categories: previewCategories, listingType }) as unknown as ProductRow[],
      error: null,
    };
  } else if (categoryId && !resolvedCategoryId) {
    productResult = { data: [], error: null };
  } else {
    let query = supabase
      .from("products")
      .select("id, seller_id, category_id, name, description, price, item_condition, quantity, is_featured, published_at")
      .eq("status", "approved")
      .eq("college_id", profile.college_id ?? "00000000-0000-0000-0000-000000000000")
      .gt("quantity", 0)
      .limit(60);
    if (search) query = query.textSearch("search_vector", search, { type: "plain", config: "simple" });
    if (resolvedCategoryId) query = query.eq("category_id", resolvedCategoryId);
    if (minPrice !== null) query = query.gte("price", minPrice);
    if (maxPrice !== null) query = query.lte("price", maxPrice);
    if (sort === "price_low") {
      query = query.order("price", { ascending: true }).order("is_featured", { ascending: false });
    } else if (sort === "price_high") {
      query = query.order("price", { ascending: false }).order("is_featured", { ascending: false });
    } else {
      query = query.order("is_featured", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false });
    }
    productResult = await query;

    // Partial-word substring fallback matching /api/search behavior
    if (!productResult.error && (!productResult.data || productResult.data.length === 0) && search.length >= 2) {
      const sanitized = search.replace(/[%_,()\\]/g, "").trim();
      if (sanitized.length >= 2) {
        let ilikeQuery = supabase
          .from("products")
          .select("id, seller_id, category_id, name, description, price, item_condition, quantity, is_featured, published_at")
          .eq("status", "approved")
          .eq("college_id", profile.college_id ?? "00000000-0000-0000-0000-000000000000")
          .gt("quantity", 0)
          .or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
          .limit(60);
        if (resolvedCategoryId) ilikeQuery = ilikeQuery.eq("category_id", resolvedCategoryId);
        if (minPrice !== null) ilikeQuery = ilikeQuery.gte("price", minPrice);
        if (maxPrice !== null) ilikeQuery = ilikeQuery.lte("price", maxPrice);
        if (sort === "price_low") {
          ilikeQuery = ilikeQuery.order("price", { ascending: true }).order("is_featured", { ascending: false });
        } else if (sort === "price_high") {
          ilikeQuery = ilikeQuery.order("price", { ascending: false }).order("is_featured", { ascending: false });
        } else {
          ilikeQuery = ilikeQuery.order("is_featured", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false });
        }
        productResult = await ilikeQuery;
      }
    }
  }
  const { data: productData, error: productsError } = productResult;
  const rawProducts = (productData ?? []) as ProductRow[];
  const products = rawProducts.filter((p) => {
    const isTrade = p.description?.includes("[TRADE") || p.name.toLowerCase().includes("trade");
    const isGiveaway = !isTrade && (Number(p.price) === 0 || p.description?.includes("[GIVEAWAY]"));
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

  const imageUrls = await resolveProductImageUrls(supabase, pathByProduct);

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

  // Merge Google Firestore campus listings & normalize category filters
  try {
    const firestoreProducts = await getFirestoreProducts({
      collegeId: profile.college_id ?? undefined,
      categoryId: resolvedCategoryId || categoryId,
      categorySlug: selectedCategory?.slug ?? (!isUuidCategory && categoryId ? categoryId : undefined),
      categoryName: selectedCategory?.name,
      search,
      minPrice,
      maxPrice,
      sort,
      listingType,
    });

    const existingCardIds = new Set(cards.map((c) => c.id));
    const firestoreStoragePaths = firestoreProducts
      .filter((fp) => !existingCardIds.has(fp.id) && fp.imageStoragePath)
      .map((fp) => fp.imageStoragePath!);

    const fsImageUrls = await resolveProductImageUrls(supabase, firestoreStoragePaths);

    for (const fp of firestoreProducts) {
      if (!existingCardIds.has(fp.id)) {
        const resolvedUrl = fp.imageStoragePath
          ? fsImageUrls.get(fp.imageStoragePath) ?? null
          : fp.imageUrl;
        cards.push({
          id: fp.id,
          seller_id: fp.seller_id,
          category_id: fp.category_id,
          name: fp.name,
          description: fp.description,
          price: fp.price,
          item_condition: fp.item_condition,
          quantity: fp.quantity,
          is_featured: fp.is_featured,
          published_at: fp.published_at,
          categoryName: fp.categoryName,
          sellerName: fp.sellerName,
          sellerHandle: fp.sellerHandle,
          imageUrl: resolvedUrl,
        });
        existingCardIds.add(fp.id);
      }
    }
  } catch (err) {
    console.warn("Firestore fetch notice:", err);
  }

  // Re-sort the merged Supabase + Firestore list consistently
  cards.sort((a, b) => {
    const featuredDiff = Number(b.is_featured) - Number(a.is_featured);
    if (sort === "price_low") return Number(a.price) - Number(b.price) || featuredDiff;
    if (sort === "price_high") return Number(b.price) - Number(a.price) || featuredDiff;
    if (featuredDiff) return featuredDiff;
    return Date.parse(b.published_at ?? "1970-01-01") - Date.parse(a.published_at ?? "1970-01-01");
  });

  const pickupName = (pickupData?.[0] as { name?: string } | undefined)?.name;

  return (
    <main className="min-h-screen bg-transparent">
      {previewMode ? <span className="sr-only">Developer preview</span> : null}
      <SiteHeader
        profile={profile}
        unreadAlertsCount={unreadCount ?? 0}
        campusName={pickupName ?? "NIT Calicut"}
      />

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]"><ShieldCheck size={14} className="text-[#241e14]" /> Verified campus exchange</p>
            <h1 className="mt-2 font-serif text-3xl tracking-[-.05em] text-[#241e14] sm:text-5xl">Find it in your loop.</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#736b60]">Browse items shared by verified members of your college community.</p>
          </div>
          {pickupName ? <p className="rounded-full border border-white/80 bg-white/75 backdrop-blur-md px-4 py-2 text-xs text-[#241e14] shadow-sm">Campus pickup · <b className="text-[#241e14] font-bold">{pickupName}</b></p> : null}
        </div>

        {submitted ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/95 p-4 shadow-sm backdrop-blur-md text-emerald-950 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
                ✓
              </span>
              <div>
                <p className="font-bold text-sm leading-tight text-emerald-950">Your listing is live on the campus loop!</p>
                <p className="text-xs text-emerald-800 mt-0.5">Verified members across your campus can now discover and purchase it.</p>
              </div>
            </div>
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 transition shadow-xs"
            >
              Manage in Studio →
            </Link>
          </div>
        ) : null}

        <div className="mt-5 relative z-30">
          <MarketplaceFilterDock
            categories={categories}
            initialSearch={search}
            initialCategoryId={categoryId}
            initialMinPrice={first(params.min) ?? ""}
            initialMaxPrice={first(params.max) ?? ""}
            initialSort={sort}
            initialType={listingType}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#736b60]">{selectedCategory ? <><b className="text-[#241e14]">{selectedCategory.name}</b><span className="mx-2">·</span></> : null}{search ? <>Results for <b className="text-[#241e14]">“{search}”</b><span className="mx-2">·</span></> : null}{cards.length} {cards.length === 1 ? "item" : "items"}</p>
          <span className="text-[11px] font-semibold text-[#8e7a63]">Verified listings · private to your campus</span>
        </div>

        {productsError && !cards.length ? (
          <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <p className="font-semibold">Marketplace data could not be loaded.</p>
            <p className="mt-1">{marketplaceDataHelp(productsError.code)}</p>
            <Link className="mt-3 inline-flex font-semibold text-[#241e14] underline underline-offset-4" href="/setup#data-api">Open the Supabase connection steps</Link>
          </div>
        ) : cards.length ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((product) => <ProductCard key={product.id} product={product} saved={saved.has(product.id)} returnTo="/marketplace" currentUserId={userId} previewMode={previewMode} />)}
          </div>
        ) : (
          <div className="mt-5 rounded-[28px] border border-dashed border-[#d0c1ab] bg-white/80 px-6 py-16 text-center shadow-xs">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14]"><Search size={21} /></span>
            <h2 className="mt-4 font-serif text-2xl text-[#241e14]">No listings match just yet.</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#736b60]">Try another search or check back when your campus community adds more items.</p>
            <Link className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#241e14] underline underline-offset-4 hover:text-[#8e7a63]" href="/listings/new">Have something to share? List an item <ArrowRight size={15} /></Link>
          </div>
        )}
      </section>
    </main>
  );
}
