"use client";

import React from "react";

interface ThinkingShimmerProps {
  text?: string;
  className?: string;
  fontSize?: string;
}

export function ThinkingShimmer({
  text = "Thinking…",
  className = "",
  fontSize = "text-2xl sm:text-3xl",
}: ThinkingShimmerProps) {
  return (
    <>
      <style jsx>{`
        @keyframes thinking-shimmer-sweep {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
        .thinking-shimmer-text {
          background: linear-gradient(
            90deg,
            #57557a 0%,
            #57557a 35%,
            #8f84ff 40%,
            #ffffff 45%,
            #38c6ff 50%,
            #57557a 55%,
            #57557a 100%
          );
          background-size: 500% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: thinking-shimmer-sweep 1.6s linear infinite;
          display: inline-block;
        }
      `}</style>
      <span
        className={`font-sans font-bold tracking-tight select-none thinking-shimmer-text ${fontSize} ${className}`}
        aria-label={text}
      >
        {text}
      </span>
    </>
  );
}

export function ThinkingLoader({
  text = "Thinking…",
  fullScreen = false,
}: {
  text?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 transition-opacity duration-300 ${
        fullScreen
          ? "fixed inset-0 z-50 bg-[#13131C]"
          : "w-full min-h-[320px] rounded-3xl bg-[#13131C]"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Subtle glowing ring aura */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#8F84FF]/20 via-[#ffffff]/10 to-[#38C6FF]/20 blur-xl animate-pulse" />
          <div className="relative size-12 rounded-2xl bg-[#1d1d2b] border border-[#2a2a3e] flex items-center justify-center shadow-inner">
            <div className="size-3 rounded-full bg-[#8F84FF] animate-ping" />
            <div className="absolute size-2 rounded-full bg-[#38C6FF]" />
          </div>
        </div>

        <ThinkingShimmer text={text} />

        <p className="text-xs font-medium tracking-wider uppercase text-[#7a789c]">
          LOOPEC Campus
        </p>
      </div>
    </div>
  );
}
