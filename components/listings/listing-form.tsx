"use client";

import { useState } from "react";
import { Tag, RefreshCw, Gift, ImagePlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClassName, labelClassName } from "@/components/auth/auth-shell";
import { createListing } from "@/app/listings/actions";

type Category = { id: string; name: string };

export function ListingForm({ categories }: { categories: Category[] }) {
  const [listingType, setListingType] = useState<"sale" | "trade" | "giveaway">("sale");
  const [price, setPrice] = useState("");
  const [tradeWishlist, setTradeWishlist] = useState("");

  return (
    <form action={createListing} className="space-y-5">
      {/* Listing Mode Selection: Sale vs Trade vs Giveaway */}
      <div>
        <label className={labelClassName}>Listing Type</label>
        <div className="mt-2 grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setListingType("sale");
              if (price === "0") setPrice("");
            }}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
              listingType === "sale"
                ? "border-violet-600 bg-violet-50/70 text-violet-950 font-bold shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-violet-200"
            }`}
          >
            <Tag className={`h-5 w-5 ${listingType === "sale" ? "text-violet-700" : "text-gray-400"}`} />
            <span className="text-xs">For Sale</span>
          </button>

          <button
            type="button"
            onClick={() => setListingType("trade")}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
              listingType === "trade"
                ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-indigo-200"
            }`}
          >
            <RefreshCw className={`h-5 w-5 ${listingType === "trade" ? "text-indigo-600" : "text-gray-400"}`} />
            <span className="text-xs">Trade / Barter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setListingType("giveaway");
              setPrice("0");
            }}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
              listingType === "giveaway"
                ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200"
            }`}
          >
            <Gift className={`h-5 w-5 ${listingType === "giveaway" ? "text-emerald-600" : "text-gray-400"}`} />
            <span className="text-xs">Free Giveaway</span>
          </button>
        </div>
        <input type="hidden" name="listing_type" value={listingType} />
      </div>

      {/* Trade Specific Input */}
      {listingType === "trade" && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2">
          <label className="block text-xs font-bold text-indigo-950">
            What item(s) are you looking to exchange for? *
          </label>
          <input
            className={inputClassName}
            name="trade_wishlist"
            value={tradeWishlist}
            onChange={(e) => setTradeWishlist(e.target.value)}
            placeholder="e.g. Casio fx-991CW Calculator, Drafter, or 2nd Year CSE books"
            required={listingType === "trade"}
          />
          <p className="text-[11px] text-indigo-800">
            Peers will see what you want in exchange and can propose swaps via WhatsApp.
          </p>
        </div>
      )}

      {/* Giveaway Specific Banner */}
      {listingType === "giveaway" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
          <Gift className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Senior Campus Donation / Free Giveaway</p>
            <p className="mt-0.5 text-emerald-800 leading-relaxed">
              Price is set to ₹0. Juniors or peers can claim this item freely and arrange physical pickup on campus.
            </p>
          </div>
        </div>
      )}

      {/* Item Name */}
      <label className={labelClassName}>
        Item name
        <input
          className={inputClassName}
          name="name"
          minLength={3}
          maxLength={140}
          required
          placeholder={
            listingType === "giveaway"
              ? "e.g. Engineering Graphics Drafter (Free for 1st Year)"
              : listingType === "trade"
              ? "e.g. Casio fx-991ES Calculator (Trade for Drafter)"
              : "e.g. Introductory chemistry textbook"
          }
        />
      </label>

      {/* Description */}
      <label className={labelClassName}>
        Description
        <textarea
          className={`${inputClassName} min-h-28 resize-y py-3`}
          name="description"
          minLength={10}
          maxLength={5000}
          required
          placeholder="Describe the item clearly, including condition and campus pickup availability."
        />
      </label>

      {/* Price & Quantity */}
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClassName}>
          Price (INR)
          {listingType === "giveaway" ? (
            <input
              className={`${inputClassName} bg-gray-100 text-gray-500 cursor-not-allowed`}
              name="price"
              type="number"
              value="0"
              readOnly
            />
          ) : (
            <input
              className={inputClassName}
              name="price"
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={listingType === "trade" ? "0 (or estimated value)" : "e.g. 450"}
              required={listingType === "sale"}
            />
          )}
        </label>
        <label className={labelClassName}>
          Quantity
          <input
            className={inputClassName}
            name="quantity"
            type="number"
            min="1"
            max="1000"
            step="1"
            required
            defaultValue="1"
          />
        </label>
      </div>

      {/* Category */}
      <label className={labelClassName}>
        Category
        <select className={inputClassName} name="category_id" required defaultValue="">
          <option value="" disabled>Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      {/* Condition */}
      <label className={labelClassName}>
        Condition
        <select className={inputClassName} name="item_condition" required defaultValue="good">
          <option value="new">New (Unused)</option>
          <option value="like_new">Like new (Barely used)</option>
          <option value="good">Good (Normal campus wear)</option>
          <option value="used">Used (Functional)</option>
        </select>
      </label>

      {/* Photos */}
      <label className={labelClassName}>
        Photos
        <input
          className={`${inputClassName} file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-950`}
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          required
        />
        <span className="mt-1.5 block text-xs font-normal leading-5 text-[#87818c]">
          Add 1–5 photos (JPG, PNG or WebP; up to 4 MB each).
        </span>
      </label>

      <div className="flex gap-3 rounded-2xl bg-[#f6f3fa] p-4 text-xs leading-5 text-[#625b6b]">
        <ImagePlus className="mt-0.5 shrink-0 text-violet-800" size={16} />
        <p>Listings are published to your campus community after admin verification.</p>
      </div>

      <Button className="w-full" size="lg" type="submit">
        <ShieldCheck size={16} /> Submit listing for review
      </Button>
    </form>
  );
}
