"use client";

import { useState, useRef, useEffect, useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Tag,
  RefreshCw,
  Gift,
  ShieldCheck,
  PackageOpen,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  MapPin,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createListingAction, type CreateListingState } from "@/app/listings/actions";

type Category = { id: string; name: string };
type SelectedImage = { id: string; file: File; previewUrl: string };

const MAX_PHOTOS = 5;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const TARGET_SINGLE_BYTES = 550 * 1024;

const conditionOptions = [
  { value: "new", label: "New", desc: "Unused, unopened in original condition" },
  { value: "like_new", label: "Like New", desc: "Hardly used, zero flaws or scratches" },
  { value: "good", label: "Good", desc: "Normal campus wear, fully functional" },
  { value: "used", label: "Used", desc: "Well used, working condition, budget friendly" },
] as const;

function isSupportedImageFile(file: File) {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= TARGET_SINGLE_BYTES && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }

  return await new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      try {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              URL.revokeObjectURL(objectUrl);
              resolve(file);
              return;
            }
            if (blob.size > 750 * 1024) {
              canvas.toBlob(
                (smallerBlob) => {
                  URL.revokeObjectURL(objectUrl);
                  resolve(
                    smallerBlob
                      ? new File([smallerBlob], outName, { type: "image/jpeg" })
                      : new File([blob], outName, { type: "image/jpeg" })
                  );
                },
                "image/jpeg",
                0.68
              );
            } else {
              URL.revokeObjectURL(objectUrl);
              resolve(new File([blob], outName, { type: "image/jpeg" }));
            }
          },
          "image/jpeg",
          0.82
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

function syncFileInput(input: HTMLInputElement | null, files: SelectedImage[]) {
  if (!input || typeof DataTransfer === "undefined") return;
  try {
    const dt = new DataTransfer();
    for (const item of files) dt.items.add(item.file);
    input.files = dt.files;
  } catch {
    // Fallback gracefully if DataTransfer assignment is unsupported
  }
}

export function ListingForm({
  categories,
  sellerName = "You (NIT Calicut Member)",
  isAuthenticated = true,
}: {
  categories: Category[];
  sellerName?: string;
  isAuthenticated?: boolean;
}) {
  const [actionState, formAction, isPending] = useActionState<CreateListingState, FormData>(
    createListingAction,
    { error: null }
  );

  const [listingType, setListingType] = useState<"sale" | "trade" | "giveaway">("sale");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [condition, setCondition] = useState<"new" | "like_new" | "good" | "used">("good");
  const [tradeWishlist, setTradeWishlist] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedImagesRef = useRef<SelectedImage[]>([]);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      for (const item of selectedImagesRef.current) {
        if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files ?? []);
    if (rawFiles.length === 0) return;

    setClientError(null);
    const availableSlots = MAX_PHOTOS - selectedImages.length;
    if (availableSlots <= 0) {
      setClientError(`You can attach up to ${MAX_PHOTOS} photos per listing.`);
      syncFileInput(fileInputRef.current, selectedImages);
      return;
    }

    const candidates = rawFiles.slice(0, availableSlots);
    const unsupported = candidates.find((f) => !isSupportedImageFile(f));
    if (unsupported) {
      setClientError(`"${unsupported.name}" is not supported. Use JPG, PNG, or WebP images.`);
      syncFileInput(fileInputRef.current, selectedImages);
      return;
    }

    setIsCompressing(true);
    try {
      const processed: SelectedImage[] = [];
      for (const file of candidates) {
        const readyFile = await compressImageIfNeeded(file);
        if (readyFile.size > MAX_TOTAL_BYTES) {
          setClientError(`"${file.name}" stays larger than 4 MB even after compression. Choose a smaller photo.`);
          continue;
        }
        processed.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: readyFile,
          previewUrl: URL.createObjectURL(readyFile),
        });
      }

      const nextList = [...selectedImages, ...processed].slice(0, MAX_PHOTOS);
      const totalBytes = nextList.reduce((sum, item) => sum + item.file.size, 0);
      if (totalBytes > MAX_TOTAL_BYTES) {
        for (const item of processed) URL.revokeObjectURL(item.previewUrl);
        setClientError("Total photo size exceeds 4 MB. Remove a photo or upload fewer images.");
        syncFileInput(fileInputRef.current, selectedImages);
        return;
      }

      setSelectedImages(nextList);
      syncFileInput(fileInputRef.current, nextList);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveImage = (id: string) => {
    setClientError(null);
    const removed = selectedImages.find((item) => item.id === id);
    if (removed?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    const nextList = selectedImages.filter((item) => item.id !== id);
    setSelectedImages(nextList);
    syncFileInput(fileInputRef.current, nextList);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setClientError(null);

    if (!isAuthenticated) {
      e.preventDefault();
      setClientError("Please sign in with your @nitc.ac.in Google account before publishing a live listing.");
      return;
    }
    if (listingType === "trade" && tradeWishlist.trim().length < 2) {
      e.preventDefault();
      setClientError("Please enter what item(s) you want to trade for in Step 1.");
      return;
    }
    if (name.trim().length < 3) {
      e.preventDefault();
      setClientError("Item title must be at least 3 characters long.");
      return;
    }
    if (!categoryId) {
      e.preventDefault();
      setClientError("Please select a category for your item.");
      return;
    }
    if (description.trim().length < 10) {
      e.preventDefault();
      setClientError("Description must be at least 10 characters (add condition or hostel pickup details).");
      return;
    }
    if (listingType === "sale") {
      const cleanPrice = price.replace(/,/g, "").trim();
      const parsedPrice = Number(cleanPrice);
      if (!cleanPrice || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
        e.preventDefault();
        setClientError("Please enter a valid listing price in INR.");
        return;
      }
    }
    const totalBytes = selectedImages.reduce((sum, item) => sum + item.file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      e.preventDefault();
      setClientError("Total photo size must stay under 4 MB. Remove a photo and try again.");
      return;
    }

    syncFileInput(fileInputRef.current, selectedImages);
  };

  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.name || "Campus Find";

  const formattedPrice =
    listingType === "giveaway"
      ? "FREE"
      : listingType === "trade"
      ? "Trade / Barter"
      : price
      ? `₹${Number(price).toLocaleString("en-IN")}`
      : "₹0";

  const displayError = clientError || actionState?.error;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-start">
      {/* LEFT FORM COLUMN (lg:col-span-7) */}
      <div className="lg:col-span-7 space-y-5">
        {!isAuthenticated && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950">
            <span className="font-semibold">
              Preview mode active — sign in with your NITC Google account to publish listings.
            </span>
            <Link
              href="/auth/sign-in?next=%2Flistings%2Fnew"
              className="rounded-full bg-[#241e14] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#382f20] transition"
            >
              Sign in now
            </Link>
          </div>
        )}

        <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* STEP 1: LISTING TYPE SELECTOR */}
          <div className="rounded-[26px] border border-white/80 bg-white/75 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_15px_40px_-20px_rgba(36,30,20,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]">
                  Step 1
                </span>
                <h2 className="mt-1 text-lg font-bold text-[#241e14]">
                  What type of listing is this?
                </h2>
              </div>
              <span className="rounded-full bg-[#eee9e2] px-3 py-1 text-xs font-bold text-[#5f574d] border border-[#d0c1ab]/50 shadow-sm">
                0% Campus Fee
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setListingType("sale");
                  if (price === "0") setPrice("");
                }}
                className={`relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                  listingType === "sale"
                    ? "border-[#241e14] bg-[#241e14]/5 ring-2 ring-[#d0c1ab] shadow-sm backdrop-blur-md"
                    : "border-white/80 bg-white/60 backdrop-blur-md hover:border-[#d0c1ab] hover:bg-white/80 shadow-sm"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`grid size-10 place-items-center rounded-xl ${
                      listingType === "sale"
                        ? "bg-[#241e14] text-white shadow-sm"
                        : "bg-[#eee9e2] text-[#736b60]"
                    }`}
                  >
                    <Tag size={18} />
                  </div>
                  {listingType === "sale" && <CheckCircle2 size={18} className="text-[#241e14]" />}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#241e14]">For Sale</span>
                  <span className="mt-0.5 block text-xs text-[#736b60]">Sell for cash or direct UPI</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setListingType("trade")}
                className={`relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                  listingType === "trade"
                    ? "border-[#8e7a63] bg-[#8e7a63]/10 ring-2 ring-[#d0c1ab] shadow-sm backdrop-blur-md"
                    : "border-white/80 bg-white/60 backdrop-blur-md hover:border-[#d0c1ab] hover:bg-white/80 shadow-sm"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`grid size-10 place-items-center rounded-xl ${
                      listingType === "trade"
                        ? "bg-[#8e7a63] text-white shadow-sm"
                        : "bg-[#eee9e2] text-[#736b60]"
                    }`}
                  >
                    <RefreshCw size={18} />
                  </div>
                  {listingType === "trade" && <CheckCircle2 size={18} className="text-[#8e7a63]" />}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#241e14]">Trade / Barter</span>
                  <span className="mt-0.5 block text-xs text-[#736b60]">Swap items with peers</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setListingType("giveaway");
                  setPrice("0");
                }}
                className={`relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                  listingType === "giveaway"
                    ? "border-emerald-700 bg-emerald-50/90 ring-2 ring-emerald-600/20 shadow-sm backdrop-blur-md"
                    : "border-white/80 bg-white/60 backdrop-blur-md hover:border-[#d0c1ab] hover:bg-white/80 shadow-sm"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`grid size-10 place-items-center rounded-xl ${
                      listingType === "giveaway"
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-[#eee9e2] text-[#736b60]"
                    }`}
                  >
                    <Gift size={18} />
                  </div>
                  {listingType === "giveaway" && <CheckCircle2 size={18} className="text-emerald-700" />}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#241e14]">Free Giveaway</span>
                  <span className="mt-0.5 block text-xs text-[#736b60]">Senior campus donation</span>
                </div>
              </button>
            </div>

            <input type="hidden" name="listing_type" value={listingType} />

            {listingType === "trade" && (
              <div className="mt-4 rounded-2xl border border-[#d0c1ab]/60 bg-[#eee9e2]/80 backdrop-blur-md p-4 space-y-2 animate-in fade-in duration-200 shadow-sm">
                <div className="flex items-center gap-2 text-[#241e14] font-bold text-xs uppercase tracking-wider">
                  <RefreshCw size={14} className="text-[#8e7a63]" />
                  <span>Trade Wishlist</span>
                </div>
                <label className="block text-xs font-semibold text-[#241e14]">
                  What specific item(s) are you looking to exchange for? *
                </label>
                <input
                  className="w-full rounded-xl border border-[#d0c1ab]/60 bg-white/90 backdrop-blur-sm px-3.5 py-2.5 text-sm text-[#241e14] outline-none placeholder:text-[#8e8579] focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner"
                  name="trade_wishlist"
                  value={tradeWishlist}
                  onChange={(e) => setTradeWishlist(e.target.value)}
                  placeholder="e.g. Casio fx-991CW Calculator, Mini Drafter, or 2nd Year CSE Books"
                  required={listingType === "trade"}
                />
                <p className="text-[11px] text-[#736b60]">
                  Peers will see this wish-list directly on the card and message you to coordinate swaps.
                </p>
              </div>
            )}

            {listingType === "giveaway" && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 backdrop-blur-md p-4 text-xs text-emerald-950 animate-in fade-in duration-200 shadow-sm">
                <Gift className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-emerald-950">Free Senior Campus Giveaway</p>
                  <p className="mt-1 text-emerald-800 leading-relaxed">
                    Item price is locked at <strong>₹0</strong>. Juniors or peers can claim it freely and coordinate safe physical pickup at campus hostels or mess.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: ITEM DETAILS */}
          <div className="rounded-[26px] border border-white/80 bg-white/75 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_15px_40px_-20px_rgba(36,30,20,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]">Step 2</span>
              <h2 className="mt-1 text-lg font-bold text-[#241e14]">Item Details</h2>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d]">Item Title *</label>
                <span className="text-[11px] text-[#736b60]">{name.length}/140</span>
              </div>
              <input
                className="mt-1.5 w-full rounded-xl border border-[#d0c1ab]/60 bg-white/80 backdrop-blur-sm px-3.5 py-2.5 text-sm font-medium text-[#241e14] outline-none transition placeholder:text-[#8e8579] focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={3}
                maxLength={140}
                required
                placeholder={
                  listingType === "giveaway"
                    ? "e.g. Engineering Graphics Drafter (Free for Juniors)"
                    : listingType === "trade"
                    ? "e.g. Casio fx-991ES Plus (Looking to trade for drafter)"
                    : "e.g. Introductory Engineering Chemistry Textbook"
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d]">Category *</label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-[#d0c1ab]/60 bg-white/80 backdrop-blur-sm px-3.5 py-2.5 text-sm text-[#241e14] outline-none transition focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner cursor-pointer"
                  name="category_id"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d]">
                  Quantity Available *
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-[#d0c1ab]/60 bg-white/80 backdrop-blur-sm px-3.5 py-2.5 text-sm text-[#241e14] outline-none transition focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner"
                  name="quantity"
                  type="number"
                  min="1"
                  max="1000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d] block mb-2">
                Condition *
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {conditionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCondition(opt.value)}
                    className={`rounded-xl border p-2.5 text-left transition backdrop-blur-sm cursor-pointer ${
                      condition === opt.value
                        ? "border-[#241e14] bg-[#241e14] text-white font-bold shadow-sm"
                        : "border-white/80 bg-white/70 text-[#5f574d] hover:border-[#d0c1ab] hover:bg-white"
                    }`}
                  >
                    <span className="block text-xs font-bold">{opt.label}</span>
                    <span
                      className={`mt-0.5 block text-[10px] leading-tight ${
                        condition === opt.value ? "text-[#eee9e2]/80" : "text-[#736b60]"
                      }`}
                    >
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
              <input type="hidden" name="item_condition" value={condition} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d]">
                  Description & Campus Pickup Details *
                </label>
                <span className="text-[11px] text-[#736b60]">{description.length}/5000 (min 10)</span>
              </div>
              <textarea
                className="mt-1.5 min-h-28 w-full rounded-xl border border-[#d0c1ab]/60 bg-white/80 backdrop-blur-sm p-3 text-sm text-[#241e14] outline-none transition placeholder:text-[#8e8579] focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 resize-y shadow-inner"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                minLength={10}
                maxLength={5000}
                required
                placeholder="Describe condition, edition/model, which campus hostel you are in, and when you are available for handover."
              />
            </div>
          </div>

          {/* STEP 3: PRICING */}
          <div className="rounded-[26px] border border-white/80 bg-white/75 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_15px_40px_-20px_rgba(36,30,20,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)]">
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]">Step 3</span>
            <h2 className="mt-1 text-lg font-bold text-[#241e14]">
              {listingType === "giveaway"
                ? "Free Item Notice"
                : listingType === "trade"
                ? "Estimated Value (Optional)"
                : "Pricing"}
            </h2>

            <div className="mt-4">
              {listingType === "giveaway" ? (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/80 backdrop-blur-sm border border-emerald-200 p-4 shadow-sm">
                  <div className="grid size-12 place-items-center rounded-xl bg-emerald-700 text-white font-bold text-lg shadow-sm">
                    ₹0
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-950">Free Campus Giveaway</p>
                    <p className="text-xs text-emerald-800">
                      You are listing this item as a free donation for campus juniors.
                    </p>
                  </div>
                  <input type="hidden" name="price" value="0" />
                </div>
              ) : (
                <div className="max-w-xs">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d] block mb-1.5">
                    {listingType === "trade" ? "Estimated Value (INR)" : "Listing Price (INR) *"}
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-base font-bold text-[#736b60]">₹</span>
                    <input
                      className="w-full rounded-xl border border-[#d0c1ab]/60 bg-white/80 backdrop-blur-sm pl-8 pr-4 py-2.5 text-lg font-bold text-[#241e14] outline-none transition focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner"
                      name="price"
                      type="number"
                      min="0"
                      max="9999999999.99"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={listingType === "trade" ? "0 (optional)" : "e.g. 450"}
                      required={listingType === "sale"}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#736b60]">
                    {listingType === "trade"
                      ? "Helps peers gauge item value for fair exchanges."
                      : "Direct buyer payment upon handover or via UPI."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 4: PHOTOS */}
          <div className="rounded-[26px] border border-white/80 bg-white/75 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_15px_40px_-20px_rgba(36,30,20,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]">Step 4</span>
                <h2 className="mt-1 text-lg font-bold text-[#241e14]">
                  Photos (Optional, up to {MAX_PHOTOS} photos)
                </h2>
              </div>
              <span className="text-xs text-[#736b60]">Auto-compressed · JPG, PNG, WebP</span>
            </div>

            <input
              ref={fileInputRef}
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleImageChange}
              className="sr-only"
            />

            <div
              onClick={() => !isCompressing && fileInputRef.current?.click()}
              className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d0c1ab] bg-white/50 backdrop-blur-md p-6 text-center transition hover:border-[#241e14] hover:bg-white/80 shadow-sm"
            >
              <div className="grid size-11 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14] shadow-sm group-hover:scale-105 transition-transform">
                {isCompressing ? <Loader2 size={22} className="animate-spin" /> : <UploadCloud size={22} />}
              </div>
              <p className="mt-2.5 text-sm font-bold text-[#241e14]">
                {isCompressing ? "Optimizing photos for fast upload..." : "Click to upload photos from your device"}
              </p>
              <p className="mt-1 text-xs text-[#736b60]">
                Large camera photos are automatically optimized ({selectedImages.length}/{MAX_PHOTOS} added).
              </p>
            </div>

            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 pt-1">
                {selectedImages.map((item, i) => (
                  <div
                    key={item.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-[#d0c1ab]/50 bg-[#eee9e2] shadow-sm"
                  >
                    <Image
                      src={item.previewUrl}
                      alt={`Photo ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(item.id)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white hover:bg-rose-700 transition cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-[#241e14]/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {displayError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-semibold text-rose-900 shadow-xs"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-700" />
              <span>{displayError}</span>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="space-y-2.5 pt-1">
            <Button
              className="w-full h-12 rounded-full bg-[#241e14] hover:bg-[#382f20] text-white text-sm font-bold shadow-md shadow-[#241e14]/20 transition cursor-pointer disabled:opacity-60"
              size="lg"
              type="submit"
              disabled={isPending || isCompressing}
            >
              {isPending ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Publishing Listing...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="mr-2" />
                  Publish Listing to Campus Loop
                </>
              )}
            </Button>
            <p className="text-center text-xs text-[#736b60]">
              Protected by NIT Calicut member authentication · 0% commission on peer exchanges
            </p>
          </div>
        </form>
      </div>

      {/* RIGHT PREVIEW COLUMN (lg:col-span-5) - STICKY */}
      <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
        <div className="rounded-[26px] border border-white/80 bg-white/75 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_15px_40px_-20px_rgba(36,30,20,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#d0c1ab]/30">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#5f574d]">
                Live Card Preview
              </span>
            </div>
            <span className="text-[11px] font-medium text-[#736b60]">Buyer view</span>
          </div>

          <div className="mt-4">
            <article className="overflow-hidden rounded-[24px] border border-white/80 bg-white/80 backdrop-blur-xl shadow-sm transition hover:shadow-md">
              <div className="relative aspect-[1.25/1] overflow-hidden bg-gradient-to-br from-[#eee9e2] to-[#e4ded5]">
                {selectedImages.length > 0 ? (
                  <Image
                    className="object-cover"
                    src={selectedImages[0].previewUrl}
                    alt={name || "Listing preview"}
                    fill
                    unoptimized
                  />
                ) : (
                  <div className="grid h-full place-items-center text-[#d0c1ab]">
                    <PackageOpen size={38} strokeWidth={1.2} />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/85 px-2.5 py-1 text-[11px] font-bold text-[#241e14] shadow-sm backdrop-blur-md">
                  {conditionOptions.find((c) => c.value === condition)?.label}
                </span>

                {listingType === "giveaway" ? (
                  <span className="absolute right-3 top-3 rounded-full border border-emerald-400/30 bg-emerald-700/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md flex items-center gap-1">
                    <Gift size={11} /> FREE
                  </span>
                ) : listingType === "trade" ? (
                  <span className="absolute right-3 top-3 rounded-full border border-[#d0c1ab]/40 bg-[#241e14]/95 px-2.5 py-1 text-[11px] font-bold text-[#eee9e2] shadow-md backdrop-blur-md flex items-center gap-1">
                    <RefreshCw size={11} /> TRADE
                  </span>
                ) : (
                  <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-[#241e14]/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md backdrop-blur-md">
                    Verified
                  </span>
                )}
              </div>

              <div className="p-4">
                <p className="truncate text-[11px] font-bold uppercase tracking-[.11em] text-[#8e7a63]">
                  {selectedCategoryName}
                </p>
                <h3 className="mt-1 line-clamp-2 min-h-[38px] text-sm font-bold text-[#241e14]">
                  {name || "Your item title will appear here..."}
                </h3>

                {listingType === "trade" && tradeWishlist && (
                  <div className="mt-2 rounded-xl bg-[#eee9e2]/80 backdrop-blur-sm px-2.5 py-1.5 border border-[#d0c1ab]/60 text-[11px] text-[#241e14] truncate">
                    <strong>Wants:</strong> {tradeWishlist}
                  </div>
                )}

                <div className="mt-3 flex items-end justify-between border-t border-[#d0c1ab]/30 pt-3">
                  <div>
                    <p
                      className={`text-lg font-bold tracking-tight ${
                        listingType === "giveaway"
                          ? "text-emerald-800"
                          : listingType === "trade"
                          ? "text-[#241e14] text-base"
                          : "text-[#241e14]"
                      }`}
                    >
                      {formattedPrice}
                    </p>
                    <span className="block text-xs text-[#736b60] truncate max-w-[150px]">
                      {sellerName}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8e8579]">{quantity} available</span>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl p-5 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-[#241e14] font-bold text-xs uppercase tracking-wider">
            <Sparkles size={15} className="text-[#8e7a63]" />
            <span>NITC Campus Handover Tips</span>
          </div>
          <ul className="space-y-2 text-xs text-[#5f574d] leading-relaxed">
            <li className="flex items-start gap-2">
              <MapPin size={14} className="text-[#8e7a63] shrink-0 mt-0.5" />
              <span>Meet at central campus spots like Library lawns, Hostels gate, or Main Canteen.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="text-[#241e14] shrink-0 mt-0.5" />
              <span><strong>0% Commission:</strong> LOOPEC does not deduct fees; you keep 100% of sales or swaps.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
