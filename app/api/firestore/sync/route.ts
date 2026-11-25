import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * POST /api/firestore/sync
 *
 * Re-syncs approved Supabase products into Google Firestore.
 * Requires Authorization: Bearer <SUPABASE_SECRET_KEY> header.
 *
 * Body (optional JSON):
 *   { limit?: number }   — number of most-recent approved products to sync (default 50)
 */
export async function POST(req: NextRequest) {
  // --- Auth check ---
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!secret || token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let batchLimit = 50;
  try {
    const body = await req.json();
    if (typeof body?.limit === "number") batchLimit = Math.min(body.limit, 200);
  } catch {
    // no body or not JSON — use default
  }

  // --- Fetch approved products from Supabase ---
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret
  );

  const { data: products, error } = await supabase
    .from("products")
    .select(
      `id, name, description, price, item_condition, quantity, status,
       is_featured, published_at, college_id, category_id,
       images:product_images(url),
       seller:profiles!seller_id(id, full_name, handle, phone),
       category:categories(name, slug)`
    )
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(batchLimit);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!products || products.length === 0) {
    return Response.json({ synced: 0, message: "No approved products found." });
  }

  // --- Write to Firestore via Admin SDK ---
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Dynamic import so this only runs server-side
    const { getFirebaseAdminDb } = await import("@/lib/firebase/admin");
    const db = getFirebaseAdminDb();

    if (!db) {
      return Response.json(
        { error: "Firebase Admin not initialised — set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY env vars." },
        { status: 503 }
      );
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    const batch = db.batch();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of products as any[]) {
      try {
        const docRef = db.collection("products").doc(p.id);
        batch.set(
          docRef,
          {
            id: p.id,
            name: p.name ?? "",
            description: p.description ?? "",
            price: Number(p.price) || 0,
            item_condition: p.item_condition ?? "good",
            quantity: Number(p.quantity) || 1,
            category_id: p.category_id ?? "",
            categoryName: p.category?.name ?? "Other",
            seller_id: p.seller?.id ?? "",
            sellerName: p.seller?.full_name ?? "Member",
            sellerHandle: p.seller?.handle ?? "member",
            sellerPhone: p.seller?.phone ?? null,
            college_id: p.college_id ?? "",
            status: "approved",
            is_featured: Boolean(p.is_featured),
            imageUrl: p.images?.[0]?.url ?? null,
            published_at: p.published_at ?? new Date().toISOString(),
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
    failed,
    total: products.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
