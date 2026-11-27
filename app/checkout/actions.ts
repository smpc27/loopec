"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApprovedMember } from "@/lib/auth/member";
import { verifyHumanRequest } from "@/lib/security/botid";
import { createStorageAdminClient } from "@/lib/supabase/admin";
import { syncProductStatusInFirestore } from "@/lib/firebase/sync";

const fallbackPickupMetadata: Record<string, { name: string; address: string; instructions: string; sort_order: number }> = {
  "35b88dad-65f3-4cd6-b44d-c7d2fda7711b": {
    name: "Mega Mess 1 & 2 Courtyard",
    address: "Central Dining Complex, NIT Calicut Campus",
    instructions: "Meet outside the main lobby entrance under the roof.",
    sort_order: 10,
  },
  "35b88dad-65f3-4cd6-b44d-c7d2fda7711c": {
    name: "Student Activity Centre (SAC)",
    address: "Near Basketball Court, NIT Calicut Campus",
    instructions: "Meet at the main reception steps.",
    sort_order: 20,
  },
  "35b88dad-65f3-4cd6-b44d-c7d2fda7711d": {
    name: "Central Library Entrance",
    address: "Academic Complex, NIT Calicut Campus",
    instructions: "Meet at the ground floor foyer near turnstiles.",
    sort_order: 30,
  },
  "35b88dad-65f3-4cd6-b44d-c7d2fda7711e": {
    name: "MBH (Mega Boys Hostel) Gate",
    address: "Hostel Zone, NIT Calicut Campus",
    instructions: "Meet at the security checkpoint gate.",
    sort_order: 40,
  },
  "35b88dad-65f3-4cd6-b44d-c7d2fda7711f": {
    name: "Ladies Hostel (LH) Gate",
    address: "Ladies Hostel Complex, NIT Calicut Campus",
    instructions: "Meet at visitor reception area.",
    sort_order: 50,
  },
};

export async function createOrders(formData: FormData) {
  const rawProductId = formData.get("product_id");
  const validQuickProduct = z.string().uuid().safeParse(rawProductId);
  const querySuffix = validQuickProduct.success ? `&product_id=${validQuickProduct.data}` : "";

  const botCheck = await verifyHumanRequest();
  if (!botCheck.allowed) redirect(`/checkout?error=unauthorized${querySuffix}`);

  const parsed = z.object({
    pickupLocationId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    productId: z.string().uuid().optional(),
  }).safeParse({
    pickupLocationId: formData.get("pickup_location_id"),
    idempotencyKey: formData.get("idempotency_key"),
    productId: typeof rawProductId === "string" && rawProductId ? rawProductId : undefined,
  });
  if (!parsed.success) redirect(`/checkout?error=checkout${querySuffix}`);
  const { supabase, userId, profile } = await requireApprovedMember();

  // Seed default pickup location only if the chosen ID is one of our verified default campus pickup IDs
  if (parsed.data.pickupLocationId && profile.college_id) {
    const adminDb = createStorageAdminClient() ?? supabase;
    const { data: loc } = await adminDb
      .from("pickup_locations")
      .select("id")
      .eq("id", parsed.data.pickupLocationId)
      .maybeSingle();

    if (!loc) {
      const meta = Object.hasOwn(fallbackPickupMetadata, parsed.data.pickupLocationId)
        ? fallbackPickupMetadata[parsed.data.pickupLocationId]
        : null;
      if (!meta) {
        redirect(`/checkout?error=checkout${querySuffix}`);
      }
      try {
        await adminDb.from("pickup_locations").insert({
          id: parsed.data.pickupLocationId,
          college_id: profile.college_id,
          ...meta,
          is_active: true,
        });
      } catch {}
    }
  }

  let productIdsToSync: string[] = [];
  if (parsed.data.productId) {
    productIdsToSync = [parsed.data.productId];
  } else {
    const { data: cartLines } = await supabase
      .from("cart_items")
      .select("product_id")
      .eq("user_id", userId);
    productIdsToSync = [...new Set((cartLines ?? []).map((item) => item.product_id))];
  }

  const { error } = parsed.data.productId
    ? await supabase.rpc("create_single_checkout_order", {
        p_product_id: parsed.data.productId,
        p_pickup_location_id: parsed.data.pickupLocationId,
        p_idempotency_key: parsed.data.idempotencyKey,
      })
    : await supabase.rpc("create_checkout_orders", {
        p_pickup_location_id: parsed.data.pickupLocationId,
        p_idempotency_key: parsed.data.idempotencyKey,
      });
  if (error?.code === "P0001" && error.message.includes("rate_limit_exceeded")) {
    redirect(`/checkout?error=rate_limit${querySuffix}`);
  }
  if (error) redirect(`/checkout?error=checkout${querySuffix}`);

  if (productIdsToSync.length) {
    const adminDb = createStorageAdminClient() ?? supabase;
    const { data: updatedProducts } = await adminDb
      .from("products")
      .select("id, status, quantity")
      .in("id", productIdsToSync);

    for (const product of updatedProducts ?? []) {
      if (
        product.status === "approved" ||
        product.status === "sold" ||
        product.status === "removed" ||
        product.status === "rejected" ||
        product.status === "pending"
      ) {
        await syncProductStatusInFirestore(
          product.id,
          product.status,
          typeof product.quantity === "number" ? product.quantity : undefined
        );
      }
    }
  }

  revalidatePath("/orders");
  revalidatePath("/cart");
  revalidatePath("/marketplace");
  revalidatePath("/dashboard");
  redirect("/orders?placed=1");
}
