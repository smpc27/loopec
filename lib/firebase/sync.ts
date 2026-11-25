import "server-only";

import { getFirebaseAdminDb } from "./admin";

export type FirestoreListingSyncPayload = {
  id: string;
  name: string;
  description: string;
  price: number;
  item_condition: "new" | "like_new" | "good" | "used";
  quantity: number;
  category_id: string;
  categoryName?: string;
  categorySlug?: string;
  seller_id: string;
  sellerName?: string;
  sellerHandle?: string;
  sellerPhone?: string | null;
  college_id: string;
  status?: "approved" | "pending" | "sold" | "rejected" | "removed";
  is_featured?: boolean;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
  published_at?: string;
  created_at?: string;
};

/**
 * Best-effort server-side sync to Firestore via Firebase Admin SDK.
 * Never throws so primary database operations are never blocked if Admin credentials are unset.
 */
export async function syncProductToFirestore(payload: FirestoreListingSyncPayload): Promise<boolean> {
  try {
    const adminDb = getFirebaseAdminDb();
    if (!adminDb) return false;
    const nowIso = new Date().toISOString();
    await adminDb.collection("products").doc(payload.id).set(
      {
        id: payload.id,
        name: payload.name,
        description: payload.description,
        price: Number(payload.price) || 0,
        item_condition: payload.item_condition,
        quantity: Number(payload.quantity) || 1,
        category_id: payload.category_id,
        categoryName: payload.categoryName || "Campus Finds",
        categorySlug: payload.categorySlug || undefined,
        seller_id: payload.seller_id,
        sellerName: payload.sellerName || "Campus Member",
        sellerHandle: payload.sellerHandle || "member",
        sellerPhone: payload.sellerPhone ?? null,
        college_id: payload.college_id,
        status: payload.status ?? "approved",
        is_featured: Boolean(payload.is_featured),
        imageUrl: payload.imageUrl ?? null,
        imageStoragePath: payload.imageStoragePath ?? null,
        published_at: payload.published_at ?? nowIso,
        created_at: payload.created_at ?? nowIso,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("[firebase/sync] Failed to upsert product:", err);
    return false;
  }
}

export async function syncProductStatusInFirestore(
  productId: string,
  status: "approved" | "pending" | "sold" | "rejected" | "removed"
): Promise<boolean> {
  try {
    const adminDb = getFirebaseAdminDb();
    if (!adminDb) return false;
    await adminDb.collection("products").doc(productId).set(
      { status, updated_at: new Date().toISOString() },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("[firebase/sync] Failed to update product status:", err);
    return false;
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<boolean> {
  try {
    const adminDb = getFirebaseAdminDb();
    if (!adminDb) return false;
    await adminDb.collection("products").doc(productId).delete();
    return true;
  } catch (err) {
    console.warn("[firebase/sync] Failed to delete product:", err);
    return false;
  }
}
