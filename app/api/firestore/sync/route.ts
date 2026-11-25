import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * POST /api/firestore/sync
 *
 * Re-syncs approved Supabase products & active categories into Google Firestore.
 * Requires Authorization: Bearer <SUPABASE_SECRET_KEY> header.
 *
 * Body (optional JSON):
 *   { limit?: number }   — number of most-recent approved products to sync (default 50, max 200)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!secret || token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let batchLimit = 50;
  try {
    const body = await req.json();
    if (typeof body?.limit === "number") batchLimit = Math.min(Math.max(body.limit, 1), 200);
  } catch {
    // Use default batch limit
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const [{ data: products, error: prodErr }, { data: categories, error: catErr }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          `id, name, description, price, item_condition, quantity, status,
           is_featured, published_at, created_at, college_id, category_id,
           seller:profiles!seller_id(id, full_name, handle, phone),
           category:categories(name, slug)`
        )
        .eq("status", "approved")
        .order("published_at", { ascending: false })
        .limit(batchLimit),
      supabase
        .from("categories")
        .select("id, name, slug, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (prodErr) {
    return Response.json({ error: prodErr.message }, { status: 500 });
  }

  const productList = products ?? [];
  const productIds = productList.map((p) => p.id as string);

  const firstStoragePath = new Map<string, string>();
  const signedUrlByPath = new Map<string, string>();

  if (productIds.length > 0) {
    const { data: imgRows } = await supabase
      .from("product_images")
      .select("product_id, storage_path, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    for (const img of (imgRows ?? []) as { product_id: string; storage_path: string }[]) {
      if (!firstStoragePath.has(img.product_id)) {
        firstStoragePath.set(img.product_id, img.storage_path);
      }
    }

    const paths = [...firstStoragePath.values()];
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("product-images")
        .createSignedUrls(paths, 60 * 60 * 24 * 7);
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  let synced = 0;
  let categoriesSynced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const { getFirebaseAdminDb } = await import("@/lib/firebase/admin");
    const db = getFirebaseAdminDb();

    if (!db) {
      return Response.json(
        {
          error:
            "Firebase Admin not initialized — set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY env vars.",
        },
        { status: 503 }
      );
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    const batch = db.batch();

    if (!catErr && categories) {
      for (const c of categories as {
        id: string;
        name: string;
        slug: string;
        sort_order: number;
      }[]) {
        batch.set(
          db.collection("categories").doc(c.id),
          {
            id: c.id,
            name: c.name,
            slug: c.slug,
            sort_order: c.sort_order,
          },
          { merge: true }
        );
        categoriesSynced++;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of productList as any[]) {
      try {
        const storagePath = firstStoragePath.get(p.id) ?? null;
        const imageUrl = storagePath ? signedUrlByPath.get(storagePath) ?? null : null;

        batch.set(
          db.collection("products").doc(p.id),
          {
            id: p.id,
            name: p.name ?? "",
            description: p.description ?? "",
            price: Number(p.price) || 0,
            item_condition: p.item_condition ?? "good",
            quantity: Number(p.quantity) || 1,
            category_id: p.category_id ?? "",
            categoryName: p.category?.name ?? "Campus Finds",
            categorySlug: p.category?.slug ?? undefined,
            seller_id: p.seller?.id ?? "",
            sellerName: p.seller?.full_name ?? "Member",
            sellerHandle: p.seller?.handle ?? "member",
            sellerPhone: p.seller?.phone ?? null,
            college_id: p.college_id ?? "",
            status: "approved",
            is_featured: Boolean(p.is_featured),
            imageUrl,
            imageStoragePath: storagePath,
            published_at: p.published_at ?? new Date().toISOString(),
            created_at: p.created_at ?? p.published_at ?? new Date().toISOString(),
            synced_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        synced++;
      } catch (docErr) {
        failed++;
        errors.push(`${p.id}: ${(docErr as Error).message}`);
      }
    }

    await batch.commit();
  } catch (adminErr) {
    return Response.json(
      { error: `Firebase Admin error: ${(adminErr as Error).message}` },
      { status: 500 }
    );
  }

  return Response.json({
    synced,
    categoriesSynced,
    failed,
    total: productList.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
