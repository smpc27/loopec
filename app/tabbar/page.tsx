"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Sliders, Smartphone, Monitor } from "lucide-react";
import { FrostedTabBar } from "@/components/navigation/frosted-tab-bar";

export default function TabBarShowcasePage() {
  const [mode, setMode] = useState<"auto" | "interactive">("auto");
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"stage" | "bottom">("stage");

  const tabNames = ["Marketplace (Tab 0)", "Orders (Tab 1)", "Messages (Tab 2)", "Profile (Tab 3)"];

  return (
    <main className="min-h-screen bg-[#0d0d14] text-white p-4 sm:p-8 flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8F84FF] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to LOOPEC
        </Link>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-white/70">Stage Physics: springF(19, 0.55) & springF(11, 0.72)</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-8">
        <div className="text-center max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e1e2d] border border-white/10 text-[#8F84FF] text-xs font-mono mb-3">
            <Sparkles size={14} /> Dual-Spring Frosted Glass Pill
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
            Campus Tab Bar Animation
          </h1>
          <p className="mt-2 text-sm text-[#7a789c]">
            470×222px stage (#13131C) with independent leading and trailing end springs, speed-based frost tint, dynamic stretch width, height compression, and fixed icons.
          </p>
        </div>

        {/* View & Mode Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-[#13131C] p-2 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === "auto"
                ? "bg-[#8F84FF] text-white shadow-lg"
                : "text-[#7a789c] hover:text-white hover:bg-white/5"
            }`}
          >
            12s Seamless Loop (SEL = [3, 1, 2, 0])
          </button>
          <button
            type="button"
            onClick={() => setMode("interactive")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === "interactive"
                ? "bg-[#8F84FF] text-white shadow-lg"
                : "text-[#7a789c] hover:text-white hover:bg-white/5"
            }`}
          >
            Interactive Tap Mode
          </button>
          <div className="w-[1px] h-6 bg-white/10 mx-1 hidden sm:block" />
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "stage" ? "bottom" : "stage")}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 transition-all inline-flex items-center gap-1.5"
          >
            {viewMode === "stage" ? (
              <>
                <Smartphone size={14} /> Preview Bottom Docked
              </>
            ) : (
              <>
                <Monitor size={14} /> Preview Centered Stage
              </>
            )}
          </button>
        </div>

        {/* The Tab Bar Render Stage */}
        <div className="w-full flex flex-col items-center justify-center py-6">
          <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#1a1a26]/80 to-[#12121b]/80 border border-white/10 shadow-2xl flex flex-col items-center">
            <FrostedTabBar
              key={`${mode}-${viewMode}`}
              mode={mode}
              defaultTab={selectedTab}
              onTabSelect={(idx) => setSelectedTab(idx)}
              isBottomBar={viewMode === "bottom"}
              className="my-2"
            />

            {viewMode === "bottom" && (
              <p className="mt-4 text-xs text-[#7a789c] font-mono">
                Tab bar is docked at the bottom of the screen (scroll down or check on mobile).
              </p>
            )}
          </div>
        </div>

        {/* Interactive manual trigger buttons */}
        {mode === "interactive" && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs text-[#7a789c] font-mono uppercase tracking-wider">
              Tap a tab to test spring physics:
            </span>
            <div className="flex flex-wrap gap-2">
              {tabNames.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedTab(i)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedTab === i
                      ? "bg-white text-[#13131C] shadow-md"
                      : "bg-[#1a1a26] text-white/80 hover:bg-[#252538] border border-white/10"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Technical Specification Reference Card */}
        <div className="w-full max-w-2xl rounded-2xl bg-[#13131C] border border-white/10 p-6 text-xs text-[#7a789c] space-y-3">
          <div className="flex items-center gap-2 text-white font-mono text-sm font-bold">
            <Sliders size={16} className="text-[#8F84FF]" />
            Physics & Rendering Specification
          </div>
          <ul className="list-disc list-inside space-y-1.5 leading-relaxed font-mono text-[11px]">
            <li><b className="text-white">Stage:</b> 470×222px, background #13131C, rounded-t 40px, top-left origin coordinates</li>
            <li><b className="text-white">12s Loop:</b> u = (T + 0.25) mod 4, taps at u=0,1,2,3 selecting tabs SEL = [3, 1, 2, 0]</li>
            <li><b className="text-white">Springs:</b> Leading end springF(19, 0.55), Trailing end springF(11, 0.72)</li>
            <li><b className="text-white">Dimensions:</b> Left x = max(38, tab_x - 43), Right x = min(432, tab_x + 43), w = right - left</li>
            <li><b className="text-white">Height:</b> s = clamp((w - 86)/86), h = 64·(1 - 0.1s), centerY = 148</li>
            <li><b className="text-white">Frost & Blur:</b> sn = clamp(|v_avg| / 7), blur = 1.5 + 6.5·sn, frost fill rgba(225,225,245, 0.14·sn)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
