"use client";

import React from "react";
import Image from "next/image";

interface CampusLoaderProps {
  label?: string;
  sublabel?: string;
  fullScreen?: boolean;
}

export function CampusLoader({
  label = "LOOPEC",
  sublabel = "Connecting to campus loop…",
  fullScreen = true,
}: CampusLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center transition-all duration-300 ${
        fullScreen
          ? "fixed inset-0 z-50 bg-[#eee9e2]/85 backdrop-blur-md"
          : "w-full min-h-[300px] bg-transparent"
      }`}
      aria-live="polite"
      aria-busy="true"
    >
      {/* Top indeterminate slim progress line */}
      {fullScreen && (
        <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] overflow-hidden bg-[#d0c1ab]/30">
          <div className="campus-loader-top-bar h-full w-1/3 rounded-full bg-gradient-to-r from-[#8e7a63] via-[#241e14] to-[#8e7a63]" />
        </div>
      )}

      {/* Centered Frosted Brand Card */}
      <div className="relative flex flex-col items-center rounded-3xl border border-[#d0c1ab]/60 bg-white/90 p-8 sm:p-10 shadow-[0_20px_50px_rgba(36,30,20,0.08)] backdrop-blur-xl">
        {/* Ambient warm glow behind icon */}
        <div className="absolute -top-6 size-28 rounded-full bg-gradient-to-br from-[#d0c1ab]/40 via-[#b8a58b]/20 to-transparent blur-2xl pointer-events-none" />

        {/* Dynamic Dual-Loop Animated Icon */}
        <div className="relative size-20 flex items-center justify-center mb-5">
          {/* Outer rotating dashed ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#b8a58b]/60 animate-[spin_8s_linear_infinite]" />

          {/* Inner smooth counter-rotating gradient accent ring */}
          <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#241e14] border-r-[#8e7a63] animate-[spin_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite]" />

          {/* Center Brand Emblem with breathing pulse */}
          <div className="relative size-12 rounded-2xl bg-[#241e14] text-[#eee9e2] flex items-center justify-center shadow-md animate-[pulse_2.4s_ease-in-out_infinite]">
            <Image
              src="/logo.png"
              alt="LOOPEC"
              width={34}
              height={16}
              priority
              className="h-auto w-7 object-contain invert brightness-200"
            />
          </div>
        </div>

        {/* Brand typography */}
        <h2 className="font-serif text-2xl font-bold tracking-tight text-[#241e14]">
          {label}
        </h2>
        <p className="mt-1.5 text-xs font-medium tracking-wide text-[#736b60]">
          {sublabel}
        </p>

        {/* Sleek pill progress track */}
        <div className="mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-[#eee9e2] border border-[#d0c1ab]/40">
          <div className="campus-loader-pill h-full rounded-full bg-[#241e14]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes campus-top-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(350%);
          }
        }
        @keyframes campus-pill-sweep {
          0% {
            transform: translateX(-100%);
            width: 30%;
          }
          50% {
            width: 60%;
          }
          100% {
            transform: translateX(250%);
            width: 30%;
          }
        }
        .campus-loader-top-bar {
          animation: campus-top-sweep 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .campus-loader-pill {
          animation: campus-pill-sweep 1.3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
      `}</style>
    </div>
  );
}
