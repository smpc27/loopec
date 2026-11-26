"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentMember, NITC_COLLEGE_ID, requireApprovedMember } from "@/lib/auth/member";
import { verifyHumanRequest } from "@/lib/security/botid";
import { createStorageAdminClient } from "@/lib/supabase/admin";
import {
  deleteProductFromFirestore,
  syncProductStatusInFirestore,
  syncProductToFirestore,
} from "@/lib/firebase/sync";

export type CreateListingState = {
  error: string | null;
  code?: string;
};

const listingFields = z.object({
  categoryId: z.uuid({ message: "Please select a valid category." }),
  name: z.string().trim().min(3, "Item title must be at least 3 characters.").max(140, "Item title must be 140 characters or fewer."),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(5000, "Description must be 5000 characters or fewer."),
  price: z
    .string()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid non-negative price (up to 2 decimal places).")
    .transform(Number)
    .refine((value) => value <= 9_999_999_999.99, "Price exceeds the maximum allowed limit."),
  condition: z.enum(["new", "like_new", "good", "used"], { message: "Please choose an item condition." }),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(1000, "Quantity cannot exceed 1000."),
});

function readFields(formData: FormData) {
  const listingType = String(formData.get("listing_type") ?? "sale");
  const tradeWishlist = String(formData.get("trade_wishlist") ?? "").trim();
  let priceStr = String(formData.get("price") ?? "").replace(/,/g, "").trim().replace(/\.$/, "");
  if (listingType === "giveaway" || (!priceStr && listingType === "trade")) {
    priceStr = "0";
  }

  let description = String(formData.get("description") ?? "").trim();
  if (listingType === "giveaway" && !description.includes("[GIVEAWAY]")) {
    description = `[GIVEAWAY] ${description}`;
  } else if (listingType === "trade" && tradeWishlist && !description.includes("[TRADE")) {
    description = `[TRADE: ${tradeWishlist}] ${description}`;
  }

  return listingFields.safeParse({
    categoryId: formData.get("category_id"),
    name: formData.get("name"),
    description,
    price: priceStr,
    condition: formData.get("item_condition"),
    quantity: formData.get("quantity") || "1",
  });
}

function getImageFiles(formData: FormData) {
  return formData.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
}

function isRateLimitError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "P0001" && error.message?.includes("rate_limit_exceeded");
}

function detectImage(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return { mime: "image/png", extension: "png" };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { mime: "image/webp", extension: "webp" };
  return null;
}

async function uploadImages({
  supabase,
  storageAdmin,
  files,
  userId,
  productId,
  productName,
  sortOffset,
}: {
  supabase: SupabaseClient;
  storageAdmin: SupabaseClient | null;
  files: File[];
  userId: string;
  productId: string;
  productName: string;
  sortOffset: number;
}) {
  if (!files.length) return { error: null, uploaded: [], records: [] };
  const uploaded: string[] = [];
  const records: { product_id: string; storage_path: string; alt_text: string; sort_order: number }[] = [];
  const uploadStorage = storageAdmin ? storageAdmin.storage : supabase.storage;

  for (const [index, file] of files.entries()) {
    if (file.size > 4 * 1024 * 1024) {
      await uploadStorage.from("product-images").remove(uploaded);
      return { error: "size", uploaded, records };
    }
    const fileType = detectImage(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
    if (!fileType) {
      await uploadStorage.from("product-images").remove(uploaded);
      return { error: "type", uploaded, records };
    }
    const path = `${userId}/${productId}/${crypto.randomUUID()}.${fileType.extension}`;

    if (!storageAdmin) {
      const { data: authorized, error: limitError } = await supabase.rpc("authorize_private_upload", {
        p_bucket_id: "product-images",
        p_name: path,
      });
      if (limitError && limitError.code !== "PGRST202" && limitError.code !== "42883") {
        await uploadStorage.from("product-images").remove(uploaded);
        return { error: isRateLimitError(limitError) ? "rate_limit" : "upload", uploaded, records };
      }
      if (!limitError && !authorized) {
        await uploadStorage.from("product-images").remove(uploaded);
        return { error: "upload", uploaded, records };
      }
    }

    const { error } = await uploadStorage.from("product-images").upload(path, file, {
      contentType: fileType.mime,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      console.warn("Storage upload warning for image:", error);
      continue;
    }
    uploaded.push(path);
    records.push({ product_id: productId, storage_path: path, alt_text: `${productName} photo ${sortOffset + index + 1}`, sort_order: sortOffset + index });
  }

  if (records.length) {
    const insertClient = storageAdmin || supabase;
    const { error } = await insertClient.from("product_images").insert(records);
    if (error) {
      console.warn("Product images insert warning:", error);
      await uploadStorage.from("product-images").remove(uploaded);
      return { error: "upload", uploaded: [], records: [] };
    }
  }
  return { error: null, uploaded, records };
}

async function resolveFirstImageUrl(supabase: SupabaseClient, storageAdmin: SupabaseClient | null, path?: string | null) {
  if (!path) return null;
  const storageClient = storageAdmin ? storageAdmin.storage : supabase.storage;
  const { data } = await storageClient.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

async function executeCreateListing(formData: FormData): Promise<{ error: string; code: string } | never> {
  const botCheck = await verifyHumanRequest();
  if (!botCheck.allowed) {
    return { error: "Automated requests are not permitted. Refresh the page and try again.", code: "unauthorized" };
  }

  const fields = readFields(formData);
  const files = getImageFiles(formData);
  if (!fields.success) {
    return { error: fields.error.issues[0]?.message || "Please check all required fields and try again.", code: "invalid" };
  }
  if (files.length > 5) {
    return { error: "You can attach up to 5 photos per listing.", code: "invalid" };
  }

  // Validate image sizes and formats before writing a product row so invalid images never create partial drafts
  for (const file of files) {
    if (file.size > 4 * 1024 * 1024) {
      return { error: `Photo "${file.name}" is larger than 4 MB. Please compress or pick a smaller photo.`, code: "size" };
    }
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!detectImage(header)) {
      return { error: `Photo "${file.name}" is not a supported JPG, PNG, or WebP image.`, code: "type" };
    }
  }

  const currentMember = await getCurrentMember();
  if (!currentMember.userId) {
    return {
      error: "Please sign in with your @nitc.ac.in Google account before publishing a live listing.",
      code: "session",
    };
  }

  const { supabase, userId, profile } = await requireApprovedMember("/listings/new");
  const storageAdmin = createStorageAdminClient();
  const collegeId = profile.college_id || NITC_COLLEGE_ID;

  let categoryRes = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("id", fields.data.categoryId)
    .eq("is_active", true)
    .maybeSingle();

  if (!categoryRes.data && storageAdmin) {
    categoryRes = await storageAdmin
      .from("categories")
      .select("id, name, slug")
      .eq("id", fields.data.categoryId)
      .eq("is_active", true)
      .maybeSingle();
  }

  const category = categoryRes.data;
  if (!category) {
    return { error: "Selected category is not available. Refresh the page and try again.", code: "invalid" };
  }

  let insertRes = await supabase
    .from("products")
    .insert({
      college_id: collegeId,
      seller_id: userId,
      category_id: category.id,
      name: fields.data.name,
      description: fields.data.description,
      price: fields.data.price,
      item_condition: fields.data.condition,
      quantity: fields.data.quantity,
    })
    .select("id")
    .single();

  if (insertRes.error?.code === "42501" && storageAdmin) {
    await storageAdmin
      .from("profiles")
      .update({ college_id: collegeId, verification_status: "approved" })
      .eq("id", userId);

    insertRes = await supabase
      .from("products")
      .insert({
        college_id: collegeId,
        seller_id: userId,
        category_id: category.id,
        name: fields.data.name,
        description: fields.data.description,
        price: fields.data.price,
        item_condition: fields.data.condition,
        quantity: fields.data.quantity,
      })
      .select("id")
      .single();
  }

  if (isRateLimitError(insertRes.error)) {
    return { error: "You have reached today's listing limit. Please wait a little before posting another item.", code: "rate_limit" };
  }
  if (insertRes.error || !insertRes.data) {
    console.error("createListing insert error:", insertRes.error);
    return {
      error: "Could not save your listing right now. Please sign out and back in or try again shortly.",
      code: "save",
    };
  }

  const product = insertRes.data;
  let firstImageStoragePath: string | null = null;
  if (files.length > 0) {
    const uploaded = await uploadImages({
      supabase,
      storageAdmin,
      files,
      userId,
      productId: product.id,
      productName: fields.data.name,
      sortOffset: 0,
    });
    if (uploaded.error && !uploaded.records.length) {
      await (storageAdmin || supabase).from("products").delete().eq("id", product.id);
      return {
        error:
          uploaded.error === "rate_limit"
            ? "Image upload rate limit reached. Please wait a little and try again."
            : "We could not upload your product photos. Check the images and try again.",
        code: uploaded.error,
      };
    }
    if (uploaded.records.length > 0) {
      firstImageStoragePath = uploaded.records[0].storage_path;
    }
  }

  const { error: submitError } = await supabase.rpc("submit_product", { p_product_id: product.id });
  if (submitError && submitError.code !== "PGRST202") {
    console.warn("submit_product rpc warning:", submitError);
  }

  const nowIso = new Date().toISOString();
  if (storageAdmin) {
    await storageAdmin
      .from("products")
      .update({
        status: "approved",
        published_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", product.id);

    await storageAdmin
      .from("products")
      .update({
        status: "approved",
        published_at: nowIso,
        updated_at: nowIso,
      })
      .eq("seller_id", userId)
      .eq("status", "pending");
  }

  const firstImageUrl = await resolveFirstImageUrl(supabase, storageAdmin, firstImageStoragePath);

  await syncProductToFirestore({
    id: product.id,
    name: fields.data.name,
    description: fields.data.description,
    price: fields.data.price,
    item_condition: fields.data.condition,
    quantity: fields.data.quantity,
    category_id: category.id,
    categoryName: category.name ?? "Campus Finds",
    categorySlug: category.slug ?? undefined,
    seller_id: userId,
    sellerName: profile.full_name || "Campus Member",
    sellerHandle: profile.handle || "member",
    sellerPhone: profile.phone || null,
    college_id: collegeId,
    status: "approved",
    is_featured: false,
    imageUrl: firstImageUrl,
    imageStoragePath: firstImageStoragePath,
    published_at: nowIso,
    created_at: nowIso,
  });

  revalidatePath("/marketplace");
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  redirect("/marketplace?submitted=1");
}

export async function createListingAction(
  _prevState: CreateListingState,
  formData: FormData
): Promise<CreateListingState> {
  const result = await executeCreateListing(formData);
  return { error: result.error, code: result.code };
}

export async function createListing(formData: FormData) {
  const result = await executeCreateListing(formData);
  redirect(`/listings/new?error=${encodeURIComponent(result.code)}`);
}

export async function updateListing(formData: FormData) {
  const productId = z.uuid().safeParse(formData.get("product_id"));
  const fields = readFields(formData);
  const files = getImageFiles(formData);
  if (!productId.success || !fields.success || files.length > 5) redirect("/listings?error=invalid");
  const { supabase, userId, profile } = await requireApprovedMember();
  const storageAdmin = files.length ? createStorageAdminClient() : null;
  if (files.length && !storageAdmin) redirect(`/setup#storage-key`);
  const { data: product } = await supabase.from("products").select("id, seller_id, status, name, college_id, published_at, created_at").eq("id", productId.data).maybeSingle();
  if (!product || product.seller_id !== userId || !["draft", "rejected"].includes(product.status)) redirect("/listings?error=unavailable");
  const { data: category } = await supabase.from("categories").select("id, name, slug").eq("id", fields.data.categoryId).eq("is_active", true).maybeSingle();
  if (!category) redirect(`/listings/${product.id}/edit?error=invalid`);

  const { error } = await supabase.from("products").update({
    category_id: fields.data.categoryId,
    name: fields.data.name,
    description: fields.data.description,
    price: fields.data.price,
    item_condition: fields.data.condition,
    quantity: fields.data.quantity,
  }).eq("id", product.id);
  if (error) redirect(`/listings/${product.id}/edit?error=save`);

  if (files.length) {
    const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", product.id);
    if ((count ?? 0) + files.length > 20) redirect(`/listings/${product.id}/edit?error=too_many_images`);
    const uploaded = await uploadImages({ supabase, storageAdmin, files, userId, productId: product.id, productName: fields.data.name, sortOffset: count ?? 0 });
    if (uploaded.error) redirect(`/listings/${product.id}/edit?error=${uploaded.error}`);
  }

  revalidatePath(`/listings/${product.id}/edit`);
  revalidatePath("/listings");
  void profile;
  redirect(`/listings/${product.id}/edit?saved=1`);
}

export async function removeListingImage(formData: FormData) {
  const imageId = z.uuid().safeParse(formData.get("image_id"));
  if (!imageId.success) redirect("/listings");
  const { supabase, userId } = await requireApprovedMember();
  const { data: image } = await supabase.from("product_images").select("id, product_id, storage_path").eq("id", imageId.data).maybeSingle();
  if (!image) redirect("/listings");
  const { data: product } = await supabase.from("products").select("seller_id, status").eq("id", image.product_id).maybeSingle();
  if (!product || product.seller_id !== userId || !["draft", "rejected"].includes(product.status)) redirect("/listings");
  const { error: storageError } = await supabase.storage.from("product-images").remove([image.storage_path]);
  if (storageError) redirect(`/listings/${image.product_id}/edit?error=image_remove`);
  const { error } = await supabase.from("product_images").delete().eq("id", image.id);
  revalidatePath(`/listings/${image.product_id}/edit`);
  redirect(error ? `/listings/${image.product_id}/edit?error=image_remove` : `/listings/${image.product_id}/edit?removed=1`);
}

export async function submitListing(formData: FormData) {
  const productId = z.uuid().safeParse(formData.get("product_id"));
  if (!productId.success) redirect("/listings");
  const { supabase, userId, profile } = await requireApprovedMember();
  const storageAdmin = createStorageAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id, status, name, description, price, item_condition, quantity, category_id, college_id, created_at")
    .eq("id", productId.data)
    .maybeSingle();
  if (!product || product.seller_id !== userId || !["draft", "rejected"].includes(product.status)) redirect("/listings?error=unavailable");

  const { error } = await supabase.rpc("submit_product", { p_product_id: product.id });

  const nowIso = new Date().toISOString();
  if (storageAdmin) {
    await storageAdmin.from("products").update({
      status: "approved",
      published_at: nowIso,
      updated_at: nowIso,
    }).eq("id", product.id);
  }

  if (!error) {
    const [{ data: category }, { data: firstImg }] = await Promise.all([
      supabase.from("categories").select("name, slug").eq("id", product.category_id).maybeSingle(),
      supabase.from("product_images").select("storage_path").eq("product_id", product.id).order("sort_order").limit(1).maybeSingle(),
    ]);
    const imageUrl = await resolveFirstImageUrl(supabase, storageAdmin, firstImg?.storage_path);
    await syncProductToFirestore({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price) || 0,
      item_condition: product.item_condition,
      quantity: product.quantity,
      category_id: product.category_id,
      categoryName: category?.name ?? "Campus Finds",
      categorySlug: category?.slug ?? undefined,
      seller_id: userId,
      sellerName: profile.full_name || "Campus Member",
      sellerHandle: profile.handle || "member",
      sellerPhone: profile.phone || null,
      college_id: product.college_id,
      status: "approved",
      is_featured: false,
      imageUrl,
      imageStoragePath: firstImg?.storage_path ?? null,
      published_at: nowIso,
      created_at: product.created_at,
    });
  }

  revalidatePath("/marketplace");
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  redirect(error ? `/listings/${product.id}/edit?error=submit` : "/marketplace?submitted=1");
}

export async function deleteListing(formData: FormData) {
  const productId = z.uuid().safeParse(formData.get("product_id"));
  if (!productId.success) redirect("/listings");
  const { supabase, userId } = await requireApprovedMember();
  const { data: product } = await supabase.from("products").select("id, seller_id, status").eq("id", productId.data).maybeSingle();
  if (!product || product.seller_id !== userId || !["draft", "rejected"].includes(product.status)) redirect("/listings?error=unavailable");
  const { data: images } = await supabase.from("product_images").select("storage_path").eq("product_id", product.id);
  const paths = (images ?? []).map((image) => (image as { storage_path: string }).storage_path);
  if (paths.length) {
    const { error } = await supabase.storage.from("product-images").remove(paths);
    if (error) redirect(`/listings/${product.id}/edit?error=image_remove`);
  }
  const { error } = await supabase.from("products").delete().eq("id", product.id);
  if (!error) {
    await deleteProductFromFirestore(product.id);
  }
  revalidatePath("/listings");
  revalidatePath("/marketplace");
  redirect(error ? `/listings/${product.id}/edit?error=delete` : "/listings?deleted=1");
}

export async function withdrawListing(formData: FormData) {
  const productId = z.uuid().safeParse(formData.get("product_id"));
  if (!productId.success) redirect("/listings?error=unavailable");
  const { supabase, userId } = await requireApprovedMember();
  const { data: product } = await supabase.from("products").select("id, seller_id, status").eq("id", productId.data).maybeSingle();
  if (!product || product.seller_id !== userId || product.status !== "approved") redirect("/listings?error=unavailable");
  const { error } = await supabase.rpc("withdraw_product", { p_product_id: product.id });
  if (!error) {
    await syncProductStatusInFirestore(product.id, "removed");
  }
  revalidatePath("/listings");
  revalidatePath("/marketplace");
  revalidatePath("/dashboard");
  redirect(error ? "/listings?error=withdraw" : "/listings?withdrawn=1");
}
