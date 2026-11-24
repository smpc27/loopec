"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createListing } from "@/app/listings/actions";

type Category = { id: string; name: string };

const conditionOptions = [
  { value: "new", label: "New", desc: "Unused, unopened in original condition" },
  { value: "like_new", label: "Like New", desc: "Hardly used, zero flaws or scratches" },
  { value: "good", label: "Good", desc: "Normal campus wear, fully functional" },
  { value: "used", label: "Used", desc: "Well used, working condition, budget friendly" },
] as const;

export function ListingForm({
  categories,
  sellerName = "You (NIT Calicut Member)",
}: {
  categories: Category[];
  sellerName?: string;
}) {
  const [listingType, setListingType] = useState<"sale" | "trade" | "giveaway">("sale");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [condition, setCondition] = useState<"new" | "like_new" | "good" | "used">("good");
  const [tradeWishlist, setTradeWishlist] = useState("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const urls: string[] = [];
    const limit = Math.min(files.length, 5);
    for (let i = 0; i < limit; i++) {
      urls.push(URL.createObjectURL(files[i]));
    }
    setImagePreviews(urls);
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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-start">
      {/* LEFT FORM COLUMN (lg:col-span-7) */}
      <div className="lg:col-span-7">
        <form action={createListing} className="space-y-6">
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
              {/* For Sale Option */}
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
                  {listingType === "sale" && (
                    <CheckCircle2 size={18} className="text-[#241e14]" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#241e14]">For Sale</span>
                  <span className="mt-0.5 block text-xs text-[#736b60]">
                    Sell for cash or direct UPI
                  </span>
                </div>
              </button>

              {/* Trade Option */}
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
                  {listingType === "trade" && (
                    <CheckCircle2 size={18} className="text-[#8e7a63]" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#241e14]">
                    Trade / Barter
                  </span>
                  <span className="mt-0.5 block text-xs text-[#736b60]">
                    Swap items with peers
                  </span>
                </div>
              </button>

              {/* Free Giveaway Option */}
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
                  {listingType === "giveaway" && (
                    <CheckCircle2 size={18} className="text-emerald-700" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#241e14]">
                    Free Giveaway
                  </span>
                  <span className="mt-0.5 block text-xs text-[#736b60]">
                    Senior campus donation
                  </span>
                </div>
              </button>
            </div>

            <input type="hidden" name="listing_type" value={listingType} />

            {/* Contextual Banner for Trade */}
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

            {/* Contextual Banner for Giveaway */}
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
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]">
                Step 2
              </span>
              <h2 className="mt-1 text-lg font-bold text-[#241e14]">Item Details</h2>
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d]">
                  Item Title *
                </label>
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

            {/* Category and Quantity Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d]">
                  Category *
                </label>
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

            {/* Condition Selection Pills */}
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
                    <span className={`mt-0.5 block text-[10px] leading-tight ${condition === opt.value ? "text-[#eee9e2]/80" : "text-[#736b60]"}`}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
              <input type="hidden" name="item_condition" value={condition} />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#5f574d]">
                  Description & Campus Pickup Details *
                </label>
                <span className="text-[11px] text-[#736b60]">{description.length}/5000</span>
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
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]">
              Step 3
            </span>
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
                <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]">
                  Step 4
                </span>
                <h2 className="mt-1 text-lg font-bold text-[#241e14]">Photos (Optional, up to 5 photos)</h2>
              </div>
              <span className="text-xs text-[#736b60]">JPG, PNG, or WebP</span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleImageChange}
              className="sr-only"
            />

            {/* Drag & Drop Visual Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d0c1ab] bg-white/50 backdrop-blur-md p-6 text-center transition hover:border-[#241e14] hover:bg-white/80 shadow-sm"
            >
              <div className="grid size-11 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14] shadow-sm group-hover:scale-105 transition-transform">
                <UploadCloud size={22} />
              </div>
              <p className="mt-2.5 text-sm font-bold text-[#241e14]">
                Click to upload photos from your device
              </p>
              <p className="mt-1 text-xs text-[#736b60]">
                High-quality photos get 3x faster responses on campus.
              </p>
            </div>

            {/* Photo Previews Grid */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 pt-1">
                {imagePreviews.map((url, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl border border-[#d0c1ab]/50 bg-[#eee9e2] shadow-sm"
                  >
                    <Image
                      src={url}
                      alt={`Photo ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
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

          {/* SUBMIT BUTTON */}
          <div className="space-y-2.5 pt-1">
            <Button
              className="w-full h-12 rounded-full bg-[#241e14] hover:bg-[#382f20] text-white text-sm font-bold shadow-md shadow-[#241e14]/20 transition cursor-pointer"
              size="lg"
              type="submit"
            >
              <ShieldCheck size={18} className="mr-2" />
              Publish Listing to Campus Loop
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

          {/* RENDER LIVE PRODUCT CARD */}
          <div className="mt-4">
            <article className="overflow-hidden rounded-[24px] border border-white/80 bg-white/80 backdrop-blur-xl shadow-sm transition hover:shadow-md">
              <div className="relative aspect-[1.25/1] overflow-hidden bg-gradient-to-br from-[#eee9e2] to-[#e4ded5]">
                {imagePreviews.length > 0 ? (
                  <Image
                    className="object-cover"
                    src={imagePreviews[0]}
                    alt={name || "Listing preview"}
                    fill
                    unoptimized
                  />
                ) : (
                  <div className="grid h-full place-items-center text-[#d0c1ab]">
                    <PackageOpen size={38} strokeWidth={1.2} />
                  </div>
                )}
                {/* Condition Tag */}
                <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/85 px-2.5 py-1 text-[11px] font-bold text-[#241e14] shadow-sm backdrop-blur-md">
                  {conditionOptions.find((c) => c.value === condition)?.label}
                </span>

                {/* Listing Mode Badges */}
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
                  <span className="text-[11px] text-[#8e8579]">
                    {quantity} available
                  </span>
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* CAMPUS SELLER ADVICE CARD */}
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
