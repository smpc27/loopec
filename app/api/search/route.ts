import type { NextRequest } from "next/server";
import { getFirestoreProducts } from "@/lib/firebase/firestore";
import { getCurrentMember, NITC_COLLEGE_ID } from "@/lib/auth/member";
import { createClient as createServerClient } from "@/lib/supabase/server";

type SearchResultItem = {
  id: string;
  source: "supabase" | "firestore";
  name: string;
  description: string;
  price: number;
  item_condition: string;
  quantity: number;
  status: string;
  is_featured: boolean;
  published_at: string;
  imageUrl: string | null;
  sellerName: string;
  sellerHandle: string;
  categoryName: string;
};

/**
 * GET /api/search?q=<text>&category_id=<id>&type=<all|sale|trade|giveaway>&min=<n>&max=<n>&sort=<recent|price_low|price_high>&limit=<n>
 *
 * Authenticated federated full-text search across Supabase Postgres (`search_vector` GIN)
 * and Google Firestore campus listings.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const categoryId = (searchParams.get("category_id") ?? searchParams.get("category") ?? "").trim() || undefined;
  const listingType = (searchParams.get("type") ?? "all").trim();
  const sort = (searchParams.get("sort") ?? "recent").trim();
  const minRaw = searchParams.get("min");
  const maxRaw = searchParams.get("max");
  const minPrice = minRaw && Number.isFinite(Number(minRaw)) ? Number(minRaw) : null;
  const maxPrice = maxRaw && Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : null;
  const maxResults = Math.min(Math.max(Number(searchParams.get("limit") ?? 40) || 40, 1), 100);

  if (q.length > 0 && q.length < 2 && !categoryId) {
    return Response.json({ results: [], total: 0 }, { status: 200 });
  }

  const previewMode =
    process.env.NODE_ENV === "development" && process.env.LOOPEC_DEV_BYPASS_AUTH === "true";

  const member = await getCurrentMember().catch(() => null);
  const isAuthorized = Boolean(
    (member?.userId && member?.profile && !member.profile.suspended_at) || previewMode
  );

  if (!isAuthorized) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const collegeId = member?.profile?.college_id || NITC_COLLEGE_ID;
  const supabase = member?.supabase ?? (await createServerClient());

  let categorySlug: string | undefined;
  let categoryName: string | undefined;
  if (categoryId) {
    try {
      const { data: catRow } = await supabase
        .from("categories")
        .select("slug, name")
        .eq("id", categoryId)
        .maybeSingle();
      categorySlug = catRow?.slug ?? undefined;
      categoryName = catRow?.name ?? undefined;
    } catch {
      // ignore if dev bypass without DB table
    }
  }

  // --- 1. Supabase full-text / substring search ---
  const supabasePromise = (async (): Promise<SearchResultItem[]> => {
    if (!member?.userId && previewMode) return [];
    try {
      let query = supabase
        .from("products")
        .select(
          `id, name, description, price, item_condition, quantity, status, is_featured, published_at,
           seller:profiles!seller_id(full_name, handle),
           category:categories(name, slug)`
        )
        .eq("status", "approved")
        .eq("college_id", collegeId)
        .gt("quantity", 0)
        .limit(maxResults);

      if (q) {
        query = query.textSearch("search_vector", q, { type: "plain", config: "simple" });
      }
      if (categoryId) query = query.eq("category_id", categoryId);
      if (minPrice !== null) query = query.gte("price", minPrice);
      if (maxPrice !== null) query = query.lte("price", maxPrice);

      let { data, error } = await query;

      // Partial-word substring fallback when full-word stem search finds nothing
      if (!error && (!data || data.length === 0) && q.length >= 2) {
        const sanitized = q.replace(/[%_,]/g, "");
        if (sanitized.length >= 2) {
          let ilikeQuery = supabase
            .from("products")
            .select(
              `id, name, description, price, item_condition, quantity, status, is_featured, published_at,
               seller:profiles!seller_id(full_name, handle),
               category:categories(name, slug)`
            )
            .eq("status", "approved")
            .eq("college_id", collegeId)
            .gt("quantity", 0)
            .or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
            .limit(maxResults);

          if (categoryId) ilikeQuery = ilikeQuery.eq("category_id", categoryId);
          if (minPrice !== null) ilikeQuery = ilikeQuery.gte("price", minPrice);
          if (maxPrice !== null) ilikeQuery = ilikeQuery.lte("price", maxPrice);

          const fallbackRes = await ilikeQuery;
          data = fallbackRes.data;
          error = fallbackRes.error;
        }
      }

      if (error || !data) {
        if (error) console.error("[api/search] Supabase error:", error.message);
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data as any[]).filter((row) => {
        const price = Number(row.price) || 0;
        const desc = String(row.description || "");
        const title = String(row.name || "");
        const isGiveaway = price === 0 || desc.includes("[GIVEAWAY]");
        const isTrade = desc.includes("[TRADE") || title.toLowerCase().includes("trade");
        if (listingType === "giveaway") return isGiveaway;
        if (listingType === "trade") return isTrade;
        if (listingType === "sale") return !isGiveaway && !isTrade;
        return true;
      });

      const productIds = rows.map((r) => r.id as string);
      const imageUrlByProduct = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: imgRows } = await supabase
          .from("product_images")
          .select("product_id, storage_path, sort_order")
          .in("product_id", productIds)
          .order("sort_order", { ascending: true });

        const pathByProduct = new Map<string, string>();
        for (const img of (imgRows ?? []) as { product_id: string; storage_path: string }[]) {
          if (!pathByProduct.has(img.product_id)) {
            pathByProduct.set(img.product_id, img.storage_path);
          }
        }
        const paths = [...pathByProduct.values()];
        if (paths.length > 0) {
          const { data: signed } = await supabase.storage
            .from("product-images")
            .createSignedUrls(paths, 1800);
          const urlByPath = new Map<string, string>();
          for (const entry of signed ?? []) {
            if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
          }
          for (const [pid, path] of pathByProduct.entries()) {
            const url = urlByPath.get(path);
            if (url) imageUrlByProduct.set(pid, url);
          }
        }
      }

      return rows.map((row) => ({
        id: row.id as string,
        source: "supabase" as const,
        name: row.name as string,
        description: row.description as string,
        price: Number(row.price) || 0,
        item_condition: row.item_condition,
        quantity: Number(row.quantity) || 1,
        status: row.status,
        is_featured: Boolean(row.is_featured),
        published_at: row.published_at ?? new Date().toISOString(),
        imageUrl: imageUrlByProduct.get(row.id) ?? null,
        sellerName: row.seller?.full_name ?? "Member",
        sellerHandle: row.seller?.handle ?? "member",
        categoryName: row.category?.name ?? "Campus Finds",
      }));
    } catch (err) {
      console.error("[api/search] Supabase exception:", err);
      return [];
    }
  })();

  // --- 2. Firestore search ---
  const firestorePromise = getFirestoreProducts({
    categoryId,
    categorySlug,
    categoryName,
    search: q || undefined,
    minPrice,
    maxPrice,
    sort,
    listingType,
  }).catch((err) => {
    console.error("[api/search] Firestore exception:", err);
    return [];
  });

  const [supabaseResults, firestoreResults] = await Promise.all([
    supabasePromise,
    firestorePromise,
  ]);

  const seenIds = new Set(supabaseResults.map((r) => r.id));
  const firestoreMapped: SearchResultItem[] = firestoreResults
    .filter((p) => !seenIds.has(p.id))
    .map((p) => ({
      id: p.id,
      source: "firestore" as const,
      name: p.name,
      description: p.description,
      price: p.price,
      item_condition: p.item_condition,
      quantity: p.quantity,
      status: p.status,
      is_featured: p.is_featured,
      published_at: p.published_at,
      imageUrl: p.imageUrl,
      sellerName: p.sellerName,
      sellerHandle: p.sellerHandle,
      categoryName: p.categoryName,
    }));

  const merged = [...supabaseResults, ...firestoreMapped];
  if (sort === "price_low") {
    merged.sort((a, b) => a.price - b.price || Number(b.is_featured) - Number(a.is_featured));
  } else if (sort === "price_high") {
    merged.sort((a, b) => b.price - a.price || Number(b.is_featured) - Number(a.is_featured));
  } else {
    merged.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  }

  const finalResults = merged.slice(0, maxResults);

  return Response.json(
    { results: finalResults, total: finalResults.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
