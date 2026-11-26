"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApprovedMember } from "@/lib/auth/member";
import { verifyHumanRequest } from "@/lib/security/botid";
import { createStorageAdminClient } from "@/lib/supabase/admin";

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
};

export async function createOrders(formData: FormData) {
  const botCheck = await verifyHumanRequest();
  if (!botCheck.allowed) redirect("/checkout?error=unauthorized");

  const rawProductId = formData.get("product_id");
  const parsed = z.object({ pickupLocationId: z.uuid(), idempotencyKey: z.uuid(), productId: z.uuid().optional() }).safeParse({
    pickupLocationId: formData.get("pickup_location_id"),
    idempotencyKey: formData.get("idempotency_key"),
    productId: typeof rawProductId === "string" && rawProductId ? rawProductId : undefined,
  });
  if (!parsed.success) redirect("/checkout?error=checkout");
  const { supabase, profile } = await requireApprovedMember();

  // Ensure default pickup location exists if NITC pickup locations haven't been seeded yet
  if (parsed.data.pickupLocationId && profile.college_id) {
    const adminDb = createStorageAdminClient() ?? supabase;
    const { data: loc } = await adminDb
      .from("pickup_locations")
      .select("id")
      .eq("id", parsed.data.pickupLocationId)
      .maybeSingle();

    if (!loc) {
      const meta = fallbackPickupMetadata[parsed.data.pickupLocationId] ?? {
        name: "Mega Mess / Campus Pickup Zone",
        address: "Central Dining Complex, NIT Calicut",
        instructions: "Meet at designated student entrance.",
        sort_order: 10,
      };
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
  if (error?.code === "P0001" && error.message.includes("rate_limit_exceeded")) redirect("/checkout?error=rate_limit");
  if (error) redirect("/checkout?error=checkout");
  revalidatePath("/orders");
  revalidatePath("/cart");
  revalidatePath("/dashboard");
  redirect("/orders?placed=1");
}
