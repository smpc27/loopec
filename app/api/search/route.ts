import { createClient } from "@supabase/supabase-js";
import { getFirestoreProducts } from "@/lib/firebase/firestore";
import type { NextRequest } from "next/server";

/**
 * GET /api/search?q=<text>&college_id=<uuid>&category_id=<id>&limit=<n>
 *
 * Federated full-text search across both Supabase Postgres products table
 * and Google Firestore campus listings. Results are merged and deduplicated.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  const collegeId = searchParams.get("college_id") ?? undefined;
  const categoryId = searchParams.get("category_id") ?? undefined;
  const maxResults = Math.min(Number(searchParams.get("limit") ?? 40), 100);

  if (!q || q.length < 2) {
    return Response.json({ results: [], total: 0 }, { status: 200 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // --- Supabase full-text search ---
  const supabasePromise = (async () => {
    try {
      let query = supabase
        .from("products")
        .select(
          `id, name, description, price, item_condition, status, is_featured,
           published_at, images:product_images(url),
           seller:profiles!seller_id(full_name, handle),
           category:categories(name, slug)`
        )
        .eq("status", "approved")
        .textSearch("search_vector", q, { type: "websearch", config: "english" })
        .limit(maxResults);

      if (collegeId) query = query.eq("college_id", collegeId);
      if (categoryId) query = query.eq("category_id", categoryId);

      const { data, error } = await query;
      if (error) {
        console.error("[api/search] Supabase error:", error.message);
        return [];
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        source: "supabase" as const,
        name: row.name as string,
        description: row.description as string,
        price: Number(row.price),
        item_condition: row.item_condition,
        status: row.status,
        is_featured: Boolean(row.is_featured),
        published_at: row.published_at,
        imageUrl: row.images?.[0]?.url ?? null,
        sellerName: row.seller?.full_name ?? "Member",
        sellerHandle: row.seller?.handle ?? "member",
        categoryName: row.category?.name ?? "Other",
      }));
    } catch (err) {
      console.error("[api/search] Supabase exception:", err);
      return [];
    }
  })();

  // --- Firestore search ---
  const firestorePromise = getFirestoreProducts({ search: q, categoryId }).catch(
    (err) => {
      console.error("[api/search] Firestore exception:", err);
      return [];
    }
  );

  const [supabaseResults, firestoreResults] = await Promise.all([
    supabasePromise,
    firestorePromise,
  ]);

  // Deduplicate: Supabase results take precedence (they have UUIDs).
  const seenIds = new Set(supabaseResults.map((r) => r.id));

  const firestoreMapped = firestoreResults
    .filter((p) => !seenIds.has(p.id))
    .map((p) => ({
      id: p.id,
      source: "firestore" as const,
      name: p.name,
      description: p.description,
      price: p.price,
      item_condition: p.item_condition,
      status: p.status,
      is_featured: p.is_featured,
      published_at: p.published_at,
      imageUrl: p.imageUrl,
      sellerName: p.sellerName,
      sellerHandle: p.sellerHandle,
      categoryName: p.categoryName,
    }));

  const merged = [...supabaseResults, ...firestoreMapped]
    .sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    })
    .slice(0, maxResults);

  return Response.json(
    { results: merged, total: merged.length },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Search-Query": encodeURIComponent(q),
      },
    }
  );
}
