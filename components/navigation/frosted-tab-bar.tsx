"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Compass, Package, MessageSquare, User, Play, Pause } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

// Spring ODE evaluation for underdamped harmonic oscillator
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
  // v(t) = delta * (omega^2 / omegaD) * decay * sin(omegaD * t)
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

  // Mode: "auto" plays the exact 12-second SEL = [3, 1, 2, 0] seamless loop;
  // "interactive" responds to user taps with the exact spring physics.
  const [mode, setMode] = useState<"auto" | "interactive">(initialMode);
  const [activeTab, setActiveTab] = useState<number>(defaultTab);

  // Match active tab to current route when in interactive mode
  useEffect(() => {
    if (pathname.startsWith("/marketplace")) setActiveTab(0);
    else if (pathname.startsWith("/orders")) setActiveTab(1);
    else if (pathname.startsWith("/messages")) setActiveTab(2);
    else if (pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) setActiveTab(3);
  }, [pathname]);

  // Responsive scale for mobile devices (< 480px)
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const screenWidth = window.innerWidth;
        if (screenWidth < 490) {
          setScale(Math.max(0.68, Math.min(1, (screenWidth - 20) / 470)));
        } else {
          setScale(1);
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Tab definitions: fixed centers on 470px stage
  const tabPositions = [81, 184, 286, 389];
  const tabs = [
    { label: "Market", icon: Compass, href: "/marketplace" },
    { label: "Orders", icon: Package, href: "/orders" },
    { label: "Messages", icon: MessageSquare, href: "/messages" },
    { label: "Profile", icon: User, href: "/profile" },
  ];

  // Animation state refs for 60-120fps requestAnimationFrame loop
  const animRef = useRef<{
    startTime: number;
    userTap: {
      fromTab: number;
      toTab: number;
      tapTime: number;
    } | null;
  }>({
    startTime: 0,
    userTap: null,
  });

  const [renderState, setRenderState] = useState({
    leftX: 38,
    rightX: 124,
    width: 86,
    height: 64,
    centerY: 148,
    sn: 0,
    glassBlur: 1.5,
    frostAlpha: 0,
    activeTabState: defaultTab,
  });

  const handleTabClick = useCallback(
    (index: number) => {
      if (mode === "auto") {
        setMode("interactive");
      }
      const prevTab = activeTab;
      setActiveTab(index);
      animRef.current.userTap = {
        fromTab: prevTab,
        toTab: index,
        tapTime: performance.now(),
      };
      if (onTabSelect) {
        onTabSelect(index);
      } else if (tabs[index]?.href) {
        router.push(tabs[index].href);
      }
    },
    [activeTab, mode, onTabSelect, router, tabs]
  );

  useEffect(() => {
    let frameId: number;
    animRef.current.startTime = performance.now();

    const loop = (now: number) => {
      let fromTab = 0;
      let toTab = 0;
      let dt = 0;

      if (mode === "auto") {
        // T = seconds since video start (12s video)
        const T = ((now - animRef.current.startTime) / 1000) % 12;
        // u = (T + 0.25) mod 4
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
          dt = 2.0; // Settled
        }
      }

      const fromX = tabPositions[fromTab];
      const toX = tabPositions[toTab];
      const fromLeft = fromX - 43;
      const fromRight = fromX + 43;
      const toLeft = toX - 43;
      const toRight = toX + 43;

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

      // Constraints:
      // Left x = max(38, tab x(left position) − 43)
      // Right x = min(432, tab x(right position) + 43)
      const leftX = Math.max(38, rawLeft);
      const rightX = Math.min(432, rawRight);
      const w = Math.max(10, rightX - leftX);

      // s = clamp((w − 86)/86)
      const s = Math.max(0, Math.min(1, (w - 86) / 86));

      // height h = 64·(1 − 0.1s)
      const h = 64 * (1 - 0.1 * s);
      const centerY = 148;

      // Speed sn = clamp(|average of the two velAt values| / 7)
      const avgVel = Math.abs((velLeft + velRight) / 2);
      const sn = Math.max(0, Math.min(1, avgVel / 7));

      // glass blur = 1.5 + 6.5·sn
      const glassBlur = 1.5 + 6.5 * sn;

      // frost fill: rgba(225,225,245, 0.14·sn)
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

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [mode, activeTab]);

  return (
    <div
      className={`relative select-none ${
        isBottomBar
          ? "fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none pb-safe"
          : "inline-flex flex-col items-center"
      } ${className}`}
    >
      {/* 470×222px Stage */}
      <div
        className="relative w-[470px] h-[222px] max-w-full overflow-hidden rounded-t-[40px] pointer-events-auto shadow-2xl transition-all"
        style={{
          backgroundColor: "#13131C",
          clipPath: "inset(0 0 0 0 round 40px 40px 0 0)",
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: isBottomBar ? "bottom center" : "center center",
        }}
      >
        {/* Subtle stage ambient illumination & guide line */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(143,132,255,0.12),transparent_70%)] pointer-events-none" />
        <div className="absolute top-[148px] left-[38px] right-[38px] h-[1px] bg-white/[0.04] pointer-events-none" />

        {/* Fixed Icons Layer (Centers at x = [81, 184, 286, 389], y = 148) */}
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
                      ? "text-white scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                      : "text-[#7a789c]/80 hover:text-white/90"
                  }`}
                />
                <span
                  className={`mt-1 text-[10px] font-semibold tracking-tight transition-opacity ${
                    isSelected ? "text-white opacity-100" : "text-[#7a789c] opacity-60"
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Frosted Glass Pill (Moving Lens) */}
        <div
          className="absolute pointer-events-none transition-none"
          style={{
            left: `${renderState.leftX}px`,
            top: `${renderState.centerY - renderState.height / 2}px`,
            width: `${renderState.width}px`,
            height: `${renderState.height}px`,
            borderRadius: `${renderState.height / 2}px`,
            // Glass blur = 1.5 + 6.5·sn
            backdropFilter: `blur(${renderState.glassBlur}px)`,
            WebkitBackdropFilter: `blur(${renderState.glassBlur}px)`,
            // Shadow
            boxShadow: `
              0 10px 25px -5px rgba(0,0,0,0.6),
              0 0 1px 1px rgba(255,255,255,0.2) inset,
              0 2px 4px 0 rgba(255,255,255,0.3) inset
            `,
            overflow: "hidden",
          }}
        >
          {/* 1. Horizontal Tint */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.06) 100%)",
            }}
          />

          {/* 2. Frost fill: right after horizontal tint and before vertical gloss: rgba(225,225,245, 0.14·sn) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(225, 225, 245, ${renderState.frostAlpha})`,
              transition: "background-color 0.05s ease-out",
            }}
          />

          {/* 3. Vertical Gloss */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.00) 100%)",
            }}
          />

          {/* Dynamic Lens Center Sheen */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)",
            }}
          />
        </div>

        {/* Clickable Hitboxes for Tabs */}
        <div className="absolute inset-0 flex">
          {tabs.map((tab, idx) => (
            <button
              key={`hitbox-${tab.label}`}
              type="button"
              onClick={() => handleTabClick(idx)}
              className="flex-1 h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label={`Switch to ${tab.label}`}
            />
          ))}
        </div>

        {/* Stage Header Info / Controls */}
        <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-xs text-[#7a789c] pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] tracking-wide text-white/90">
              LOOPEC Frosted Tab Bar
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setMode(mode === "auto" ? "interactive" : "auto")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] transition-colors"
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
        <div className="absolute bottom-2 left-6 right-6 flex justify-between text-[9px] font-mono text-[#57557A] pointer-events-none">
          <span>sn: {renderState.sn.toFixed(3)}</span>
          <span>blur: {renderState.glassBlur.toFixed(2)}px</span>
          <span>w: {Math.round(renderState.width)}px</span>
        </div>
      </div>
    </div>
  );
}
