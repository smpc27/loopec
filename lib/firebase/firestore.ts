import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "./client";

export type FirestoreProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  item_condition: "new" | "like_new" | "good" | "used";
  quantity: number;
  category_id: string;
  categoryName: string;
  categorySlug?: string;
  seller_id: string;
  sellerName: string;
  sellerHandle: string;
  sellerPhone?: string | null;
  college_id: string;
  status: "approved" | "pending" | "sold" | "rejected" | "removed";
  is_featured: boolean;
  imageUrl: string | null;
  imageStoragePath?: string | null;
  published_at: string;
  created_at?: string;
};

export type FirestoreCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export const defaultCampusCategories: FirestoreCategory[] = [
  { id: "cat-books", name: "Books & study materials", slug: "books", sort_order: 1 },
  { id: "cat-electronics", name: "Electronics & Gadgets", slug: "electronics", sort_order: 2 },
  { id: "cat-stationery", name: "Stationery & Drafters", slug: "stationery", sort_order: 3 },
  { id: "cat-hostel", name: "Hostel Essentials", slug: "hostel", sort_order: 4 },
  { id: "cat-cycles", name: "Cycles & Sports", slug: "cycles", sort_order: 5 },
  { id: "cat-finds", name: "Other Campus Finds", slug: "campus-finds", sort_order: 6 },
];

function canonicalCategoryKey(input?: string | null): string {
  const s = (input ?? "").toLowerCase().trim();
  if (!s) return "";
  if (s.includes("book") || s.includes("study") || s.includes("notes")) return "books";
  if (s.includes("electr") || s.includes("gadget")) return "electronics";
  if (s.includes("station") || s.includes("draft")) return "stationery";
  if (s.includes("hostel") || s.includes("furnit")) return "hostel";
  if (s.includes("cycle") || s.includes("sport") || s.includes("bike")) return "sports";
  if (s.includes("fashion")) return "fashion";
  if (s.includes("access")) return "accessories";
  if (s.includes("other") || s.includes("campus-finds") || s.includes("cat-finds")) return "other";
  return s;
}

function matchesCategoryFilter(
  item: FirestoreProduct,
  {
    categoryId,
    categorySlug,
    categoryName,
  }: { categoryId?: string; categorySlug?: string; categoryName?: string }
): boolean {
  if (!categoryId && !categorySlug && !categoryName) return true;
  if (categoryId && item.category_id === categoryId) return true;

  const targetKey =
    canonicalCategoryKey(categorySlug) ||
    canonicalCategoryKey(categoryName) ||
    canonicalCategoryKey(categoryId);
  if (!targetKey) return false;

  const itemKey =
    canonicalCategoryKey(item.categorySlug) ||
    canonicalCategoryKey(item.categoryName) ||
    canonicalCategoryKey(item.category_id);

  return Boolean(itemKey && itemKey === targetKey);
}

/**
 * Fetch approved marketplace products from Google Firestore
 */
export async function getFirestoreProducts({
  categoryId,
  categorySlug,
  categoryName,
  search,
  minPrice,
  maxPrice,
  sort = "recent",
  listingType = "all",
}: {
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  search?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: string;
  listingType?: string;
} = {}): Promise<FirestoreProduct[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    const db = getFirebaseDb();
    const productsRef = collection(db, "products");

    const q = query(productsRef, where("status", "==", "approved"), limit(80));
    const snapshot = await getDocs(q);

    let items: FirestoreProduct[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "",
        description: data.description || "",
        price: Number(data.price) || 0,
        item_condition: data.item_condition || "good",
        quantity: Number(data.quantity) || 1,
        category_id: data.category_id || "",
        categoryName: data.categoryName || "Campus item",
        categorySlug: data.categorySlug || undefined,
        seller_id: data.seller_id || "",
        sellerName: data.sellerName || "Campus Peer",
        sellerHandle: data.sellerHandle || "member",
        sellerPhone: data.sellerPhone || null,
        college_id: data.college_id || "nit-calicut",
        status: data.status || "approved",
        is_featured: Boolean(data.is_featured),
        imageUrl: data.imageUrl || null,
        imageStoragePath: data.imageStoragePath || null,
        published_at: data.published_at || new Date().toISOString(),
        created_at: data.created_at || undefined,
      };
    });

    items = items.filter((p) => p.quantity > 0);

    if (categoryId || categorySlug || categoryName) {
      items = items.filter((p) =>
        matchesCategoryFilter(p, { categoryId, categorySlug, categoryName })
      );
    }

    if (search) {
      const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
      items = items.filter((p) => {
        const hay = `${p.name} ${p.description} ${p.categoryName} ${p.sellerName}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    }

    if (minPrice !== null && minPrice !== undefined) {
      items = items.filter((p) => p.price >= minPrice);
    }

    if (maxPrice !== null && maxPrice !== undefined) {
      items = items.filter((p) => p.price <= maxPrice);
    }

    if (listingType === "giveaway") {
      items = items.filter((p) => p.price === 0 || p.description.includes("[GIVEAWAY]"));
    } else if (listingType === "trade") {
      items = items.filter(
        (p) => p.description.includes("[TRADE") || p.name.toLowerCase().includes("trade")
      );
    } else if (listingType === "sale") {
      items = items.filter((p) => p.price > 0 && !p.description.includes("[GIVEAWAY]"));
    }

    if (sort === "price_low") {
      items.sort((a, b) => a.price - b.price || Number(b.is_featured) - Number(a.is_featured));
    } else if (sort === "price_high") {
      items.sort((a, b) => b.price - a.price || Number(b.is_featured) - Number(a.is_featured));
    } else {
      items.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      });
    }

    return items;
  } catch (error) {
    console.error("Firestore getFirestoreProducts error:", error);
    return [];
  }
}

/**
 * Fetch a single product from Google Firestore by its ID
 */
export async function getFirestoreProductById(productId: string): Promise<FirestoreProduct | null> {
  if (!isFirebaseConfigured() || !productId) return null;
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, "products", productId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.status && data.status !== "approved") return null;
    return {
      id: snap.id,
      name: data.name || "",
      description: data.description || "",
      price: Number(data.price) || 0,
      item_condition: data.item_condition || "good",
      quantity: Number(data.quantity) || 1,
      category_id: data.category_id || "",
      categoryName: data.categoryName || "Campus Item",
      categorySlug: data.categorySlug || undefined,
      seller_id: data.seller_id || "",
      sellerName: data.sellerName || "Campus Peer",
      sellerHandle: data.sellerHandle || "member",
      sellerPhone: data.sellerPhone || null,
      college_id: data.college_id || "nit-calicut",
      status: data.status || "approved",
      is_featured: Boolean(data.is_featured),
      imageUrl: data.imageUrl || null,
      imageStoragePath: data.imageStoragePath || null,
      published_at: data.published_at || new Date().toISOString(),
      created_at: data.created_at || undefined,
    };
  } catch (err) {
    console.error("Firestore getFirestoreProductById error:", err);
    return null;
  }
}

/**
 * Fetch campus categories from Firestore or fallback to standard campus categories
 */
export async function getFirestoreCategories(): Promise<FirestoreCategory[]> {
  if (!isFirebaseConfigured()) return defaultCampusCategories;

  try {
    const db = getFirebaseDb();
    const categoriesRef = collection(db, "categories");
    const snapshot = await getDocs(categoriesRef);

    if (snapshot.empty) {
      return defaultCampusCategories;
    }

    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<FirestoreCategory, "id">),
    }));

    items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return items;
  } catch (error) {
    console.warn("Firestore categories fallback:", error);
    return defaultCampusCategories;
  }
}

/**
 * Save a new listing directly to Google Firestore
 */
export async function createFirestoreListing(productData: {
  name: string;
  description: string;
  price: number;
  condition: "new" | "like_new" | "good" | "used";
  quantity: number;
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  sellerHandle: string;
  imageUrl?: string | null;
}): Promise<{ id: string }> {
  const db = getFirebaseDb();
  const productsRef = collection(db, "products");
  const now = new Date().toISOString();

  const docRef = await addDoc(productsRef, {
    name: productData.name,
    description: productData.description,
    price: productData.price,
    item_condition: productData.condition,
    quantity: productData.quantity,
    category_id: productData.categoryId,
    categoryName: productData.categoryName,
    seller_id: productData.sellerId,
    sellerName: productData.sellerName,
    sellerHandle: productData.sellerHandle,
    college_id: "nit-calicut",
    status: "approved",
    is_featured: false,
    imageUrl: productData.imageUrl || null,
    published_at: now,
    created_at: now,
  });

  return { id: docRef.id };
}
