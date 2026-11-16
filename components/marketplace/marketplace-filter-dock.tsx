"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
  BookOpen,
  Laptop,
  Watch,
  Compass,
  Home,
  Bike,
  Sparkles,
  Tag,
  RefreshCw,
  Gift,
  ArrowUpDown,
  Layers,
} from "lucide-react";

type Category = { id: string; name: string; slug?: string };

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("book") || lower.includes("study") || lower.includes("notes") || lower.includes("textbook")) return BookOpen;
  if (lower.includes("electr") || lower.includes("gadget") || lower.includes("calc") || lower.includes("laptop")) return Laptop;
  if (lower.includes("access") || lower.includes("bag") || lower.includes("watch") || lower.includes("fashion")) return Watch;
  if (lower.includes("station") || lower.includes("draft") || lower.includes("tool")) return Compass;
  if (lower.includes("hostel") || lower.includes("room") || lower.includes("furnit") || lower.includes("lamp")) return Home;
  if (lower.includes("sport") || lower.includes("cycle") || lower.includes("bike")) return Bike;
  return Sparkles;
}

export function MarketplaceFilterDock({
  categories,
  initialSearch = "",
  initialCategoryId = "",
  initialMinPrice = "",
  initialMaxPrice = "",
  initialSort = "recent",
  initialType = "all",
}: {
  categories: Category[];
  initialSearch?: string;
  initialCategoryId?: string;
  initialMinPrice?: string;
  initialMaxPrice?: string;
  initialSort?: string;
  initialType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [sort, setSort] = useState(initialSort);
  const [listingType, setListingType] = useState(initialType);

  // Custom Dropdown Open States
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pushNavigation = (overrides: {
    category?: string;
    type?: string;
    q?: string;
    min?: string;
    max?: string;
    sort?: string;
  } = {}) => {
    const p = new URLSearchParams();
    const finalSearch = overrides.q !== undefined ? overrides.q : search;
    const finalCategory = overrides.category !== undefined ? overrides.category : selectedCategory;
    const finalMin = overrides.min !== undefined ? overrides.min : minPrice;
    const finalMax = overrides.max !== undefined ? overrides.max : maxPrice;
    const finalSort = overrides.sort !== undefined ? overrides.sort : sort;
    const finalType = overrides.type !== undefined ? overrides.type : listingType;

    if (finalSearch.trim()) p.set("q", finalSearch.trim());
    if (finalCategory) p.set("category", finalCategory);
    if (finalMin) p.set("min", finalMin);
    if (finalMax) p.set("max", finalMax);
    if (finalSort && finalSort !== "recent") p.set("sort", finalSort);
    if (finalType && finalType !== "all") p.set("type", finalType);

    const qs = p.toString();
    router.push(`/marketplace${qs ? `?${qs}` : ""}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushNavigation();
  };

  const selectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setIsCategoryOpen(false);
    pushNavigation({ category: catId });
  };

  const selectType = (type: string) => {
    setListingType(type);
    pushNavigation({ type });
  };

  const selectSort = (sortVal: string) => {
    setSort(sortVal);
    setIsSortOpen(false);
    pushNavigation({ sort: sortVal });
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setMinPrice("");
    setMaxPrice("");
    setSort("recent");
    setListingType("all");
    router.push("/marketplace");
  };

  const currentCategoryObj = categories.find((c) => c.id === selectedCategory);
  const CurrentCatIcon = currentCategoryObj ? getCategoryIcon(currentCategoryObj.name) : Layers;

  const hasActiveFilters = Boolean(
    search || selectedCategory || minPrice || maxPrice || sort !== "recent" || listingType !== "all"
  );

  const sortLabels: Record<string, string> = {
    recent: "Recently added",
    price_low: "Price: Low to High",
    price_high: "Price: High to Low",
  };

  return (
    <div className="relative z-30 space-y-4">
      {/* 1. VISUAL CATEGORY PILLS BAR (AIRBNB / APPLE STYLE) */}
      <div className="overflow-x-auto pb-1 scrollbar-none -mx-2 px-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-max">
          {/* All Categories Chip */}
          <button
            type="button"
            onClick={() => selectCategory("")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
              !selectedCategory
                ? "bg-[#241e14] text-white shadow-md shadow-[#241e14]/20 ring-2 ring-[#d0c1ab]"
                : "border border-white/80 bg-white/75 backdrop-blur-md text-[#241e14]/80 hover:bg-white hover:border-[#d0c1ab] shadow-sm"
            }`}
          >
            <Layers size={15} className={!selectedCategory ? "text-[#d0c1ab]" : "text-[#241e14]"} />
            <span>All Categories</span>
          </button>

          {/* Individual Category Chips with Icons */}
          {categories.map((cat) => {
            const IconComponent = getCategoryIcon(cat.name);
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-[#241e14] text-white shadow-md shadow-[#241e14]/20 ring-2 ring-[#d0c1ab]"
                    : "border border-white/80 bg-white/75 backdrop-blur-md text-[#241e14]/80 hover:bg-white hover:border-[#d0c1ab] shadow-sm"
                }`}
              >
                <IconComponent size={15} className={isSelected ? "text-[#d0c1ab]" : "text-[#241e14]"} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LISTING TYPE TABS (All Items / For Sale / Trade / Free Giveaways) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => selectType("all")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              listingType === "all"
                ? "bg-[#241e14] text-white shadow-md shadow-[#241e14]/20 ring-1 ring-[#d0c1ab]"
                : "border border-white/80 bg-white/75 backdrop-blur-md text-[#241e14]/80 hover:bg-white hover:border-[#d0c1ab] shadow-sm"
            }`}
          >
            All Items
          </button>

          <button
            type="button"
            onClick={() => selectType("sale")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              listingType === "sale"
                ? "bg-[#241e14] text-white shadow-md shadow-[#241e14]/20 ring-1 ring-[#d0c1ab]"
                : "border border-white/80 bg-white/75 backdrop-blur-md text-[#241e14]/80 hover:bg-white hover:border-[#d0c1ab] shadow-sm"
            }`}
          >
            <Tag size={13} className={listingType === "sale" ? "text-[#d0c1ab]" : "text-[#8e7a63]"} />
            <span>For Sale</span>
          </button>

          <button
            type="button"
            onClick={() => selectType("trade")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              listingType === "trade"
                ? "bg-[#241e14] text-white shadow-md shadow-[#241e14]/20 ring-1 ring-[#d0c1ab]"
                : "border border-white/80 bg-white/75 backdrop-blur-md text-[#241e14]/80 hover:bg-white hover:border-[#d0c1ab] shadow-sm"
            }`}
          >
            <RefreshCw size={13} className={listingType === "trade" ? "text-[#d0c1ab]" : "text-[#8e7a63]"} />
            <span>Trade / Barter</span>
          </button>

          <button
            type="button"
            onClick={() => selectType("giveaway")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              listingType === "giveaway"
                ? "bg-[#241e14] text-white shadow-md shadow-[#241e14]/20 ring-1 ring-[#d0c1ab]"
                : "border border-white/80 bg-white/75 backdrop-blur-md text-[#241e14]/80 hover:bg-white hover:border-[#d0c1ab] shadow-sm"
            }`}
          >
            <Gift size={13} className={listingType === "giveaway" ? "text-[#d0c1ab]" : "text-[#8e7a63]"} />
            <span>Free Giveaways</span>
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8b4539] hover:text-[#5e2d24] bg-white/80 backdrop-blur-sm border border-[#d0c1ab] px-3 py-1.5 rounded-full transition cursor-pointer"
          >
            <X size={13} />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* 3. ULTRA-MODERN FROSTED GLASS SEARCH & FILTER DOCK */}
      <form
        onSubmit={handleSearchSubmit}
        className="relative z-20 rounded-[28px] border border-white/80 bg-white/75 backdrop-blur-2xl p-3 sm:p-3.5 shadow-[0_20px_50px_-25px_rgba(36,30,20,0.08),_inset_0_1px_2px_rgba(255,255,255,0.95)] grid grid-cols-1 gap-2.5 sm:grid-cols-12 sm:items-center"
      >
        {/* Main Keyword Search Input (5 Cols) */}
        <div className="relative sm:col-span-4 lg:col-span-4">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e7a63]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search textbooks, calculators, drafters, cycles..."
            className="h-11 w-full rounded-2xl bg-white/80 border border-[#d0c1ab]/50 pl-10 pr-4 text-xs sm:text-sm text-[#241e14] outline-none placeholder:text-[#8a8175] transition focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner"
          />
        </div>

        {/* Custom Frosted Category Dropdown (3 Cols) - Replaces ugly native select! */}
        <div ref={categoryRef} className="relative z-30 sm:col-span-3 lg:col-span-3">
          <button
            type="button"
            onClick={() => {
              setIsCategoryOpen(!isCategoryOpen);
              setIsSortOpen(false);
            }}
            className="h-11 w-full flex items-center justify-between rounded-2xl border border-[#d0c1ab]/50 bg-white/80 px-3.5 text-xs sm:text-sm text-[#241e14] outline-none transition hover:bg-white hover:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <CurrentCatIcon size={15} className="text-[#241e14] shrink-0" />
              <span className="truncate font-medium">
                {currentCategoryObj ? currentCategoryObj.name : "All Categories"}
              </span>
            </div>
            <ChevronDown
              size={15}
              className={`text-[#8a8175] shrink-0 transition-transform duration-200 ${
                isCategoryOpen ? "rotate-180 text-[#241e14]" : ""
              }`}
            />
          </button>

          {/* Custom Frosted Glass Dropdown Menu */}
          {isCategoryOpen && (
            <div className="absolute left-0 top-full mt-2 z-50 w-64 max-h-72 overflow-y-auto rounded-2xl border border-white/95 bg-white/95 backdrop-blur-2xl p-2 shadow-[0_20px_50px_-10px_rgba(36,30,20,0.25)] animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => selectCategory("")}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-left transition cursor-pointer ${
                  !selectedCategory
                    ? "bg-[#eee9e2] text-[#241e14] font-bold"
                    : "text-[#5f574d] hover:bg-[#eee9e2]/60 hover:text-[#241e14]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers size={14} className="text-[#241e14]" />
                  <span>All Categories</span>
                </div>
                {!selectedCategory && <Check size={14} className="text-[#241e14]" />}
              </button>

              <div className="my-1 border-t border-[#d0c1ab]/30" />

              {categories.map((c) => {
                const Icon = getCategoryIcon(c.name);
                const isItemSel = selectedCategory === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCategory(c.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-left transition cursor-pointer ${
                      isItemSel
                        ? "bg-[#eee9e2] text-[#241e14] font-bold"
                        : "text-[#5f574d] hover:bg-[#eee9e2]/60 hover:text-[#241e14]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon size={14} className="text-[#241e14] shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </div>
                    {isItemSel && <Check size={14} className="text-[#241e14] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Price Inputs: Min & Max (3 Cols: 1.5 + 1.5) */}
        <div className="grid grid-cols-2 gap-2 sm:col-span-3 lg:col-span-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8e7a63]">
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
              className="h-11 w-full rounded-2xl bg-white/80 border border-[#d0c1ab]/50 pl-6 pr-2.5 text-xs text-[#241e14] outline-none transition focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner"
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8e7a63]">
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
              className="h-11 w-full rounded-2xl bg-white/80 border border-[#d0c1ab]/50 pl-6 pr-2.5 text-xs text-[#241e14] outline-none transition focus:bg-white focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-inner"
            />
          </div>
        </div>

        {/* Custom Sort Dropdown & Submit Button (2 Cols) */}
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-2">
          {/* Custom Sort Popover */}
          <div ref={sortRef} className="relative z-30 flex-1">
            <button
              type="button"
              onClick={() => {
                setIsSortOpen(!isSortOpen);
                setIsCategoryOpen(false);
              }}
              title="Sort products"
              className="h-11 w-full flex items-center justify-center gap-1.5 rounded-2xl border border-[#d0c1ab]/50 bg-white/80 px-2.5 text-xs text-[#241e14] outline-none hover:bg-white hover:border-[#241e14] transition shadow-inner cursor-pointer"
            >
              <ArrowUpDown size={14} className="text-[#241e14] shrink-0" />
              <span className="hidden xl:inline text-[11px] font-medium truncate">
                {sort === "price_low" ? "Low" : sort === "price_high" ? "High" : "Recent"}
              </span>
            </button>

            {isSortOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-2xl border border-white/95 bg-white/95 backdrop-blur-2xl p-2 shadow-[0_20px_50px_-10px_rgba(36,30,20,0.25)] animate-in fade-in zoom-in-95 duration-150">
                {(["recent", "price_low", "price_high"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => selectSort(s)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition cursor-pointer ${
                      sort === s
                        ? "bg-[#eee9e2] text-[#241e14] font-bold"
                        : "text-[#5f574d] hover:bg-[#eee9e2]/60 hover:text-[#241e14]"
                    }`}
                  >
                    <span>{sortLabels[s]}</span>
                    {sort === s && <Check size={14} className="text-[#241e14]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Filter Button */}
          <button
            type="submit"
            className="h-11 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#241e14] hover:bg-[#382f20] px-4 text-xs font-bold text-white shadow-md shadow-[#241e14]/20 transition cursor-pointer"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </form>
    </div>
  );
}
