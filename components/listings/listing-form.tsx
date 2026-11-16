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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
      {/* LEFT FORM COLUMN (lg:col-span-7) */}
      <div className="lg:col-span-7">
        <form action={createListing} className="space-y-8">
          {/* STEP 1: LISTING TYPE SELECTOR */}
          <div className="rounded-3xl border border-[#eae6ef] bg-white p-6 sm:p-7 shadow-[0_10px_35px_-20px_rgba(40,25,65,0.07)]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[.15em] text-violet-700">
                  Step 1
                </span>
                <h2 className="mt-1 text-lg font-bold text-[#28232f]">
                  What type of listing is this?
                </h2>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900 border border-violet-100">
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
                className={`relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                  listingType === "sale"
                    ? "border-violet-600 bg-gradient-to-b from-violet-50/90 to-white ring-2 ring-violet-600/20 shadow-md"
                    : "border-gray-200 bg-white hover:border-violet-200 hover:bg-gray-50/50"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`grid size-10 place-items-center rounded-xl ${
                      listingType === "sale"
                        ? "bg-violet-700 text-white shadow-sm"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Tag size={19} />
                  </div>
                  {listingType === "sale" && (
                    <CheckCircle2 size={18} className="text-violet-700" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#28232f]">For Sale</span>
                  <span className="mt-0.5 block text-xs text-[#716a7a]">
                    Sell for cash or direct UPI
                  </span>
                </div>
              </button>

              {/* Trade Option */}
              <button
                type="button"
                onClick={() => setListingType("trade")}
                className={`relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                  listingType === "trade"
                    ? "border-indigo-600 bg-gradient-to-b from-indigo-50/90 to-white ring-2 ring-indigo-600/20 shadow-md"
                    : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50/50"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`grid size-10 place-items-center rounded-xl ${
                      listingType === "trade"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <RefreshCw size={19} />
                  </div>
                  {listingType === "trade" && (
                    <CheckCircle2 size={18} className="text-indigo-600" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#28232f]">
                    Trade / Barter
                  </span>
                  <span className="mt-0.5 block text-xs text-[#716a7a]">
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
                className={`relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                  listingType === "giveaway"
                    ? "border-emerald-600 bg-gradient-to-b from-emerald-50/90 to-white ring-2 ring-emerald-600/20 shadow-md"
                    : "border-gray-200 bg-white hover:border-emerald-200 hover:bg-gray-50/50"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`grid size-10 place-items-center rounded-xl ${
                      listingType === "giveaway"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Gift size={19} />
                  </div>
                  {listingType === "giveaway" && (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-[#28232f]">
                    Free Giveaway
                  </span>
                  <span className="mt-0.5 block text-xs text-[#716a7a]">
                    Senior campus donation
                  </span>
                </div>
              </button>
            </div>

            <input type="hidden" name="listing_type" value={listingType} />

            {/* Contextual Banner for Trade */}
            {listingType === "trade" && (
              <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4.5 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                  <RefreshCw size={14} className="text-indigo-600" />
                  <span>Trade Wishlist</span>
                </div>
                <label className="block text-xs font-semibold text-indigo-950">
                  What specific item(s) are you looking to exchange for? *
                </label>
                <input
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm text-[#2b2436] outline-none placeholder:text-indigo-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                  name="trade_wishlist"
                  value={tradeWishlist}
                  onChange={(e) => setTradeWishlist(e.target.value)}
                  placeholder="e.g. Casio fx-991CW Calculator, Mini Drafter, or 2nd Year CSE Books"
                  required={listingType === "trade"}
                />
                <p className="text-[11px] text-indigo-800">
                  Peers will see this wish-list directly on the card and message you on WhatsApp to propose swaps.
                </p>
              </div>
            )}

            {/* Contextual Banner for Giveaway */}
            {listingType === "giveaway" && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 animate-in fade-in duration-200">
                <Gift className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
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
          <div className="rounded-3xl border border-[#eae6ef] bg-white p-6 sm:p-7 shadow-[0_10px_35px_-20px_rgba(40,25,65,0.07)] space-y-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[.15em] text-violet-700">
                Step 2
              </span>
              <h2 className="mt-1 text-lg font-bold text-[#28232f]">Item Details</h2>
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#494254]">
                  Item Title *
                </label>
                <span className="text-[11px] text-[#938b99]">{name.length}/140</span>
              </div>
              <input
                className="mt-2 w-full rounded-xl border border-[#e4e0e8] bg-white px-3.5 py-3 text-sm font-medium text-[#28232f] outline-none transition placeholder:text-[#aaa4af] focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
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

            {/* Category and Condition Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#494254]">
                  Category *
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-[#e4e0e8] bg-white px-3.5 py-3 text-sm text-[#28232f] outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
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
                <label className="text-xs font-bold uppercase tracking-wider text-[#494254]">
                  Quantity Available *
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-[#e4e0e8] bg-white px-3.5 py-3 text-sm text-[#28232f] outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
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
              <label className="text-xs font-bold uppercase tracking-wider text-[#494254] block mb-2">
                Condition *
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {conditionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCondition(opt.value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      condition === opt.value
                        ? "border-violet-600 bg-violet-50/80 text-violet-950 ring-2 ring-violet-600/20 font-bold"
                        : "border-[#e6e2ea] bg-white text-[#554d60] hover:border-violet-200"
                    }`}
                  >
                    <span className="block text-xs font-bold">{opt.label}</span>
                    <span className="mt-0.5 block text-[10px] text-[#7d7586] leading-tight">
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
                <label className="text-xs font-bold uppercase tracking-wider text-[#494254]">
                  Description & Campus Pickup Details *
                </label>
                <span className="text-[11px] text-[#938b99]">{description.length}/5000</span>
              </div>
              <textarea
                className="mt-2 min-h-32 w-full rounded-xl border border-[#e4e0e8] bg-white p-3.5 text-sm text-[#28232f] outline-none transition placeholder:text-[#aaa4af] focus:border-violet-600 focus:ring-4 focus:ring-violet-100 resize-y"
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

          {/* STEP 3: PRICING (IF SALE OR ESTIMATED TRADE VALUE) */}
          <div className="rounded-3xl border border-[#eae6ef] bg-white p-6 sm:p-7 shadow-[0_10px_35px_-20px_rgba(40,25,65,0.07)]">
            <span className="text-[11px] font-bold uppercase tracking-[.15em] text-violet-700">
              Step 3
            </span>
            <h2 className="mt-1 text-lg font-bold text-[#28232f]">
              {listingType === "giveaway"
                ? "Free Item Notice"
                : listingType === "trade"
                ? "Estimated Value (Optional)"
                : "Pricing"}
            </h2>

            <div className="mt-4">
              {listingType === "giveaway" ? (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4">
                  <div className="grid size-12 place-items-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-[#494254] block mb-2">
                    {listingType === "trade" ? "Estimated Value (INR)" : "Listing Price (INR) *"}
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-base font-bold text-[#6a6275]">₹</span>
                    <input
                      className="w-full rounded-xl border border-[#e4e0e8] bg-white pl-9 pr-4 py-3 text-lg font-bold text-[#28232f] outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
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
                  <p className="mt-2 text-[11px] text-[#7d7586]">
                    {listingType === "trade"
                      ? "Helps peers gauge item value for fair exchanges."
                      : "Direct buyer payment via WhatsApp UPI or cash upon handover."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 4: PHOTOS */}
          <div className="rounded-3xl border border-[#eae6ef] bg-white p-6 sm:p-7 shadow-[0_10px_35px_-20px_rgba(40,25,65,0.07)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[.15em] text-violet-700">
                  Step 4
                </span>
                <h2 className="mt-1 text-lg font-bold text-[#28232f]">Photos (1–5 photos) *</h2>
              </div>
              <span className="text-xs text-[#827a8c]">JPG, PNG, or WebP</span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              required={imagePreviews.length === 0}
              onChange={handleImageChange}
              className="sr-only"
            />

            {/* Drag & Drop Visual Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-6 text-center transition hover:border-violet-400 hover:bg-violet-50/70"
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm group-hover:scale-105 transition-transform">
                <UploadCloud size={24} />
              </div>
              <p className="mt-3 text-sm font-bold text-violet-950">
                Click to upload photos from your device
              </p>
              <p className="mt-1 text-xs text-[#71697a]">
                High-quality photos get 3x faster responses on campus.
              </p>
            </div>

            {/* Photo Previews Grid */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 pt-2">
                {imagePreviews.map((url, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl border border-violet-100 bg-gray-50 shadow-sm"
                  >
                    <Image
                      src={url}
                      alt={`Photo ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="space-y-3 pt-2">
            <Button
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-950 via-purple-900 to-indigo-950 text-base font-bold shadow-lg shadow-violet-950/20 hover:opacity-95 transition"
              size="lg"
              type="submit"
            >
              <ShieldCheck size={20} className="mr-2" />
              Publish Listing to Campus Loop
            </Button>
            <p className="text-center text-xs text-[#87808f]">
              Protected by NIT Calicut member authentication · 0% commission on peer exchanges
            </p>
          </div>
        </form>
      </div>

      {/* RIGHT PREVIEW COLUMN (lg:col-span-5) - STICKY */}
      <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-6">
        <div className="rounded-3xl border border-[#eae6ef] bg-white p-6 shadow-[0_12px_40px_-25px_rgba(40,25,65,0.08)]">
          <div className="flex items-center justify-between pb-4 border-b border-[#f0edf2]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#494254]">
                Live Marketplace Card Preview
              </span>
            </div>
            <span className="text-[11px] font-medium text-[#87808f]">Buyer view</span>
          </div>

          {/* RENDER LIVE PRODUCT CARD */}
          <div className="mt-5">
            <article className="overflow-hidden rounded-2xl border border-[#e8e4ee] bg-white shadow-sm transition hover:shadow-md">
              <div className="relative aspect-[1.25/1] overflow-hidden bg-[#f3eff7]">
                {imagePreviews.length > 0 ? (
                  <Image
                    className="object-cover"
                    src={imagePreviews[0]}
                    alt={name || "Listing preview"}
                    fill
                    unoptimized
                  />
                ) : (
                  <div className="grid h-full place-items-center text-violet-300">
                    <PackageOpen size={42} strokeWidth={1.2} />
                  </div>
                )}
                {/* Condition Tag */}
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-[#453e4f] shadow-sm backdrop-blur-sm">
                  {conditionOptions.find((c) => c.value === condition)?.label}
                </span>

                {/* Listing Mode Badges */}
                {listingType === "giveaway" ? (
                  <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                    <Gift size={11} /> FREE
                  </span>
                ) : listingType === "trade" ? (
                  <span className="absolute right-3 top-3 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                    <RefreshCw size={11} /> TRADE
                  </span>
                ) : (
                  <span className="absolute right-3 top-3 rounded-full bg-violet-950 px-3 py-1 text-[10px] font-semibold text-white shadow-sm">
                    Verified
                  </span>
                )}
              </div>

              <div className="p-4">
                <p className="truncate text-[10px] font-bold uppercase tracking-[.12em] text-violet-700">
                  {selectedCategoryName}
                </p>
                <h3 className="mt-1 line-clamp-2 min-h-[40px] text-sm font-bold text-[#2a2533]">
                  {name || "Your item title will appear here..."}
                </h3>

                {listingType === "trade" && tradeWishlist && (
                  <div className="mt-2 rounded-lg bg-indigo-50/80 px-2.5 py-1.5 border border-indigo-100 text-[11px] text-indigo-900 truncate">
                    <strong>Wants:</strong> {tradeWishlist}
                  </div>
                )}

                <div className="mt-3.5 flex items-end justify-between border-t border-[#f2eff4] pt-3">
                  <div>
                    <p
                      className={`text-lg font-extrabold tracking-tight ${
                        listingType === "giveaway"
                          ? "text-emerald-700"
                          : listingType === "trade"
                          ? "text-indigo-950 text-base"
                          : "text-[#282230]"
                      }`}
                    >
                      {formattedPrice}
                    </p>
                    <span className="block text-[11px] text-[#847e8c] truncate max-w-[150px]">
                      {sellerName}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-[#928b96]">
                    {quantity} available
                  </span>
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* CAMPUS SELLER ADVICE CARD */}
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-purple-50/40 to-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-violet-950 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={16} className="text-violet-700" />
            <span>NITC Campus Handover Tips</span>
          </div>
          <ul className="space-y-2.5 text-xs text-[#524b5c] leading-relaxed">
            <li className="flex items-start gap-2">
              <MapPin size={14} className="text-violet-700 shrink-0 mt-0.5" />
              <span>Meet at central campus spots like Library lawns, Hostels gate, or Canteen.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>0% Commission:</strong> LOOPEC does not deduct fees; you keep 100% of sales or swaps.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
