type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className = "" }: BrandMarkProps) {
  const height = compact ? 28 : 36;
  const width = Math.round(height * (676 / 316));

  return (
    <span
      className={`inline-flex shrink-0 items-center brand-mark${compact ? " brand-mark-compact" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      <img
        src="/logo.png"
        alt="LOOPEC"
        width={width}
        height={height}
        loading="eager"
        decoding="sync"
        className="h-full w-auto object-contain select-none transition-transform hover:scale-105"
        style={{ width: "auto", height: `${height}px` }}
      />
    </span>
  );
}
