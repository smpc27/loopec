"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Compass, Package, MessageSquare, User, Play, Pause } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

// Spring ODE evaluation for underdamped harmonic oscillator:
// d²x/dt² + 2·gamma·dx/dt + omega²·x = 0
function springF(omega: number, zeta: number, t: number, delta: number) {
  if (t <= 0) return { pos: 0, vel: 0 };
  const zetaClamped = Math.min(0.999, Math.max(0.01, zeta));
  const omegaD = omega * Math.sqrt(1 - zetaClamped * zetaClamped);
  const gamma = zetaClamped * omega;
  const decay = Math.exp(-gamma * t);
  const cosVal = Math.cos(omegaD * t);
  const sinVal = Math.sin(omegaD * t);

  // Position displacement from 0 to delta:
  // x(t) = delta * (1 - decay * (cos(omegaD * t) + (gamma / omegaD) * sin(omegaD * t)))
  const pos = delta * (1 - decay * (cosVal + (gamma / omegaD) * sinVal));

  // Velocity dx/dt:
  // v(t) = delta * (omega² / omegaD) * decay * sin(omegaD * t)
  const vel = delta * ((omega * omega) / omegaD) * decay * sinVal;

  return { pos, vel };
}

export interface FrostedTabBarProps {
  mode?: "auto" | "interactive";
  defaultTab?: number;
  onTabSelect?: (index: number) => void;
  className?: string;
  isBottomBar?: boolean;
}

export function FrostedTabBar({
  mode: initialMode = "interactive",
  defaultTab = 0,
  onTabSelect,
  className = "",
  isBottomBar = false,
}: FrostedTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mode, setMode] = useState<"auto" | "interactive">(initialMode);
  const [activeTab, setActiveTab] = useState<number>(defaultTab);

  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(isBottomBar ? 380 : 470);

  // Responsive width measurement for mobile bottom dock
  useEffect(() => {
    if (!isBottomBar) {
      setMeasuredWidth(470);
      return;
    }

    const updateWidth = () => {
      if (typeof window !== "undefined") {
        const screenW = window.innerWidth;
        // Floating dock fits inside screen with margins, capped at 420px
        const targetW = Math.min(420, Math.max(300, screenW - 24));
        setMeasuredWidth(targetW);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isBottomBar]);

  // Tab definitions
  const tabs = useMemo(
    () => [
      { label: "Market", icon: Compass, href: "/marketplace" },
      { label: "Orders", icon: Package, href: "/orders" },
      { label: "Messages", icon: MessageSquare, href: "/messages" },
      { label: "Profile", icon: User, href: "/profile" },
    ],
    []
  );

  // Compute 4 tab centers
  // In 470px stage mode: tabPositions = [81, 184, 286, 389]
  // In responsive mobile bottom bar mode: slots are evenly spaced across measuredWidth
  const tabPositions = useMemo(() => {
    if (!isBottomBar) {
      return [81, 184, 286, 389];
    }
    const slotW = measuredWidth / 4;
    return [
      slotW * 0.5,
      slotW * 1.5,
      slotW * 2.5,
      slotW * 3.5,
    ];
  }, [isBottomBar, measuredWidth]);

  const pillBaseWidth = useMemo(() => {
    if (!isBottomBar) return 86;
    return Math.max(66, Math.min(94, measuredWidth / 4 - 8));
  }, [isBottomBar, measuredWidth]);

  const pillBaseHeight = isBottomBar ? 50 : 64;
  const pillCenterY = isBottomBar ? 33 : 148;

  // Animation state ref
  const animRef = useRef<{
    startTime: number;
    userTap: {
      fromTab: number;
      toTab: number;
      tapTime: number;
    } | null;
    isSettled: boolean;
  }>({
    startTime: 0,
    userTap: null,
    isSettled: false,
  });

  const [renderState, setRenderState] = useState(() => {
    const initX = isBottomBar
      ? (measuredWidth / 4) * 0.5
      : 81;
    const half = (isBottomBar ? Math.max(66, Math.min(94, measuredWidth / 4 - 8)) : 86) / 2;
    return {
      leftX: initX - half,
      rightX: initX + half,
      width: half * 2,
      height: pillBaseHeight,
      centerY: pillCenterY,
      sn: 0,
      glassBlur: 1.5,
      frostAlpha: 0,
      activeTabState: defaultTab,
    };
  });

  // Handle route change sync
  useEffect(() => {
    let nextTab = 0;
    if (pathname.startsWith("/marketplace")) nextTab = 0;
    else if (pathname.startsWith("/orders")) nextTab = 1;
    else if (pathname.startsWith("/messages")) nextTab = 2;
    else if (pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) nextTab = 3;
    else return;

    if (nextTab !== activeTab) {
      const prev = activeTab;
      setActiveTab(nextTab);
      animRef.current.userTap = {
        fromTab: prev,
        toTab: nextTab,
        tapTime: performance.now(),
      };
      animRef.current.isSettled = false;
    }
  }, [pathname, activeTab]);

  const handleTabClick = useCallback(
    (index: number) => {
      if (mode === "auto") {
        setMode("interactive");
      }
      if (index === activeTab) return;

      const prevTab = activeTab;
      setActiveTab(index);
      animRef.current.userTap = {
        fromTab: prevTab,
        toTab: index,
        tapTime: performance.now(),
      };
      animRef.current.isSettled = false;

      if (onTabSelect) {
        onTabSelect(index);
      } else if (tabs[index]?.href) {
        router.push(tabs[index].href, { scroll: false });
      }
    },
    [activeTab, mode, onTabSelect, router, tabs]
  );

  // Animation Loop with Idle Sleep Optimization
  useEffect(() => {
    let frameId: number;
    animRef.current.startTime = performance.now();
    animRef.current.isSettled = false;

    const loop = (now: number) => {
      let fromTab = 0;
      let toTab = 0;
      let dt = 0;

      if (mode === "auto") {
        const T = ((now - animRef.current.startTime) / 1000) % 12;
        const u = (T + 0.25) % 4;
        const k = Math.floor(u);
        dt = u - k;
        const SEL = [3, 1, 2, 0];
        toTab = SEL[k];
        fromTab = SEL[(k + 3) % 4];
      } else {
        // Interactive mode
        if (animRef.current.userTap) {
          fromTab = animRef.current.userTap.fromTab;
          toTab = animRef.current.userTap.toTab;
          dt = (now - animRef.current.userTap.tapTime) / 1000;
        } else {
          fromTab = activeTab;
          toTab = activeTab;
          dt = 2.0;
        }
      }

      const fromX = tabPositions[fromTab] ?? tabPositions[0];
      const toX = tabPositions[toTab] ?? tabPositions[0];
      const halfPill = pillBaseWidth / 2;

      const fromLeft = fromX - halfPill;
      const fromRight = fromX + halfPill;
      const toLeft = toX - halfPill;
      const toRight = toX + halfPill;

      let rawLeft = toLeft;
      let rawRight = toRight;
      let velLeft = 0;
      let velRight = 0;

      if (toX > fromX) {
        // Moving right: Leading end is RIGHT (springF(19, 0.55)), trailing end is LEFT (springF(11, 0.72))
        const rSpring = springF(19, 0.55, dt, toRight - fromRight);
        const lSpring = springF(11, 0.72, dt, toLeft - fromLeft);
        rawRight = fromRight + rSpring.pos;
        velRight = rSpring.vel;
        rawLeft = fromLeft + lSpring.pos;
        velLeft = lSpring.vel;
      } else if (toX < fromX) {
        // Moving left: Leading end is LEFT (springF(19, 0.55)), trailing end is RIGHT (springF(11, 0.72))
        const lSpring = springF(19, 0.55, dt, toLeft - fromLeft);
        const rSpring = springF(11, 0.72, dt, toRight - fromRight);
        rawLeft = fromLeft + lSpring.pos;
        velLeft = lSpring.vel;
        rawRight = fromRight + rSpring.pos;
        velRight = rSpring.vel;
      }

      // Constraints
      const minLeft = isBottomBar ? 4 : 38;
      const maxRight = isBottomBar ? measuredWidth - 4 : 432;
      const leftX = Math.max(minLeft, rawLeft);
      const rightX = Math.min(maxRight, rawRight);
      const w = Math.max(20, rightX - leftX);

      // Width stretch ratio: s = clamp((w - pillBaseWidth) / pillBaseWidth)
      const s = Math.max(0, Math.min(1, (w - pillBaseWidth) / pillBaseWidth));

      // Height compression: h = pillBaseHeight · (1 - 0.1s)
      const h = pillBaseHeight * (1 - 0.1 * s);
      const centerY = pillCenterY;

      // Speed sn = clamp(|avg velocity| / 7)
      const avgVel = Math.abs((velLeft + velRight) / 2);
      const sn = Math.max(0, Math.min(1, avgVel / 7));

      // Glass blur = 1.5 + 6.5·sn
      const glassBlur = 1.5 + 6.5 * sn;

      // Frost fill alpha = 0.14·sn
      const frostAlpha = 0.14 * sn;

      setRenderState({
        leftX,
        rightX,
        width: w,
        height: h,
        centerY,
        sn,
        glassBlur,
        frostAlpha,
        activeTabState: toTab,
      });

      // IDLE SLEEP CHECK:
      // If interactive mode and dt > 1.2s, the spring is fully settled.
      // Cancel RAF loop to eliminate continuous 60-120fps re-renders on mobile.
      if (mode === "interactive" && dt >= 1.2) {
        animRef.current.isSettled = true;
        return;
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [mode, activeTab, tabPositions, pillBaseWidth, pillBaseHeight, pillCenterY, measuredWidth, isBottomBar]);

  // =========================================================================
  // RENDER: MOBILE BOTTOM NAVIGATION BAR MODE (Warm Luxury LOOPEC Glass Theme)
  // Palette: Linen (#eee9e2), Espresso (#241e14), Sand (#d0c1ab), White Glass
  // =========================================================================
  if (isBottomBar) {
    return (
      <nav
        aria-label="Mobile Navigation"
        className={`fixed bottom-3 sm:bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-3 select-none pb-[env(safe-area-inset-bottom,0px)] ${className}`}
      >
        <div
          ref={containerRef}
          style={{ width: `${measuredWidth}px` }}
          className="relative h-[66px] rounded-full overflow-hidden pointer-events-auto bg-white/85 backdrop-blur-2xl border border-[#d0c1ab]/70 shadow-[0_20px_45px_-12px_rgba(36,30,20,0.18),0_0_0_1px_rgba(255,255,255,0.85),inset_0_1px_2px_rgba(255,255,255,0.95)] transition-all duration-300"
        >
          {/* Subtle Ambient Sand Glow inside dock */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(208,193,171,0.30),transparent_70%)] pointer-events-none" />

          {/* 1. LAYER ONE: Moving Active Pill Lens (Deep Espresso & Warm Gold Glow) */}
          <div
            className="absolute pointer-events-none will-change-transform"
            style={{
              left: `${renderState.leftX}px`,
              top: `${renderState.centerY - renderState.height / 2}px`,
              width: `${renderState.width}px`,
              height: `${renderState.height}px`,
              borderRadius: `${renderState.height / 2}px`,
              background: "linear-gradient(135deg, #241e14 0%, #352c1f 100%)",
              border: "1px solid rgba(208, 193, 171, 0.65)",
              boxShadow: `
                0 8px 22px -4px rgba(36, 30, 20, 0.35),
                0 0 0 1px rgba(36, 30, 20, 0.15),
                inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)
              `,
              overflow: "hidden",
            }}
          >
            {/* Speed-dependent Sand Gold Sheen */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: `rgba(208, 193, 171, ${renderState.frostAlpha * 1.5})`,
                transition: "background-color 0.05s ease-out",
              }}
            />
            {/* Top Vertical Light Gloss */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
              }}
            />
            {/* Center Radial Highlight */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background:
                  "radial-gradient(circle at 50% 25%, rgba(255,255,255,0.5) 0%, transparent 60%)",
              }}
            />
          </div>

          {/* 2. LAYER TWO: Sharp, Themed Icons & Text (ON TOP of Lens) */}
          <div className="absolute inset-0 pointer-events-none flex">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isSelected = renderState.activeTabState === idx;

              return (
                <div
                  key={tab.label}
                  className="flex-1 flex flex-col items-center justify-center transition-transform duration-200"
                >
                  <Icon
                    size={20}
                    strokeWidth={isSelected ? 2.4 : 1.9}
                    className={`transition-all duration-200 ${
                      isSelected
                        ? "text-white scale-110 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                        : "text-[#6e6659] hover:text-[#241e14]"
                    }`}
                  />
                  <span
                    className={`mt-1 text-[10px] tracking-tight transition-all duration-200 ${
                      isSelected
                        ? "text-white font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                        : "text-[#6e6659] font-medium"
                    }`}
                  >
                    {tab.label}
                  </span>
                  {/* Subtle active accent indicator */}
                  {isSelected && (
                    <span className="mt-0.5 size-1 rounded-full bg-[#d0c1ab] shadow-xs" />
                  )}
                </div>
              );
            })}
          </div>

          {/* 3. LAYER THREE: Perfectly Aligned Touch Targets */}
          <div className="absolute inset-0 flex">
            {tabs.map((tab, idx) => (
              <button
                key={`hitbox-${tab.label}`}
                type="button"
                onClick={() => handleTabClick(idx)}
                className="flex-1 h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#241e14]/40 active:opacity-75"
                aria-label={`Switch to ${tab.label}`}
              />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // =========================================================================
  // RENDER: DESKTOP SHOWCASE STAGE MODE (470×222px Warm LOOPEC Stage on /tabbar)
  // =========================================================================
  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* 470×222px Stage */}
      <div
        className="relative w-[470px] h-[222px] max-w-full overflow-hidden rounded-t-[40px] pointer-events-auto shadow-2xl transition-all"
        style={{
          backgroundColor: "#1e1912",
          clipPath: "inset(0 0 0 0 round 40px 40px 0 0)",
        }}
      >
        {/* Stage ambient illumination & guide line in Sand Gold */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(208,193,171,0.18),transparent_70%)] pointer-events-none" />
        <div className="absolute top-[148px] left-[38px] right-[38px] h-[1px] bg-[#d0c1ab]/15 pointer-events-none" />

        {/* 1. Frosted Glass Pill (Moving Lens) */}
        <div
          className="absolute pointer-events-none transition-none"
          style={{
            left: `${renderState.leftX}px`,
            top: `${renderState.centerY - renderState.height / 2}px`,
            width: `${renderState.width}px`,
            height: `${renderState.height}px`,
            borderRadius: `${renderState.height / 2}px`,
            background: "linear-gradient(135deg, rgba(208,193,171,0.25) 0%, rgba(208,193,171,0.10) 100%)",
            backdropFilter: `blur(${renderState.glassBlur}px)`,
            WebkitBackdropFilter: `blur(${renderState.glassBlur}px)`,
            boxShadow: `
              0 10px 25px -5px rgba(0,0,0,0.6),
              0 0 1px 1px rgba(208,193,171,0.3) inset,
              0 2px 4px 0 rgba(255,255,255,0.2) inset
            `,
            overflow: "hidden",
          }}
        >
          {/* Horizontal Tint */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(208,193,171,0.08) 0%, rgba(208,193,171,0.20) 50%, rgba(208,193,171,0.08) 100%)",
            }}
          />

          {/* Sand frost fill */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(208, 193, 171, ${renderState.frostAlpha * 1.5})`,
              transition: "background-color 0.05s ease-out",
            }}
          />

          {/* Vertical Gloss */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
            }}
          />

          {/* Sheen */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)",
            }}
          />
        </div>

        {/* 2. Fixed Icons Layer (Centers at x = [81, 184, 286, 389], y = 148) */}
        <div className="absolute inset-0 pointer-events-none">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const x = tabPositions[idx];
            const isSelected = renderState.activeTabState === idx;

            return (
              <div
                key={tab.label}
                className="absolute flex flex-col items-center justify-center transition-colors duration-200"
                style={{
                  left: `${x}px`,
                  top: "148px",
                  transform: "translate(-50%, -50%)",
                  width: "60px",
                  height: "60px",
                }}
              >
                <Icon
                  size={24}
                  strokeWidth={isSelected ? 2.5 : 2}
                  className={`transition-all duration-200 ${
                    isSelected
                      ? "text-[#eee9e2] scale-110 drop-shadow-[0_0_12px_rgba(208,193,171,0.6)]"
                      : "text-[#8e7a63] hover:text-[#eee9e2]"
                  }`}
                />
                <span
                  className={`mt-1 text-[10px] font-semibold tracking-tight transition-opacity ${
                    isSelected ? "text-[#eee9e2] opacity-100 font-bold" : "text-[#8e7a63] opacity-70"
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* 3. Clickable Hitboxes for Tabs */}
        <div className="absolute inset-0 flex">
          {tabs.map((tab, idx) => (
            <button
              key={`hitbox-${tab.label}`}
              type="button"
              onClick={() => handleTabClick(idx)}
              className="flex-1 h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d0c1ab]/40"
              aria-label={`Switch to ${tab.label}`}
            />
          ))}
        </div>

        {/* Stage Header Info / Controls */}
        <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-xs text-[#8e7a63] pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] tracking-wide text-[#eee9e2]">
              LOOPEC Frosted Tab Bar
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setMode(mode === "auto" ? "interactive" : "auto")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 text-[#eee9e2] font-mono text-[10px] border border-[#d0c1ab]/20 transition-colors"
            >
              {mode === "auto" ? (
                <>
                  <Pause size={10} /> 12s Loop Active
                </>
              ) : (
                <>
                  <Play size={10} /> Play 12s Loop
                </>
              )}
            </button>
          </div>
        </div>

        {/* Speed & Blur Status Readout */}
        <div className="absolute bottom-2 left-6 right-6 flex justify-between text-[9px] font-mono text-[#8e7a63] pointer-events-none">
          <span>sn: {renderState.sn.toFixed(3)}</span>
          <span>blur: {renderState.glassBlur.toFixed(2)}px</span>
          <span>w: {Math.round(renderState.width)}px</span>
        </div>
      </div>
    </div>
  );
}
