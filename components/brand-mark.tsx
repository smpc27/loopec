type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className = "" }: BrandMarkProps) {
  const height = compact ? 26 : 32;
  const width = Math.round(height * (676 / 316));

  return (
    <span
      className={`inline-flex items-center brand-mark${compact ? " brand-mark-compact" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      <img
        src="/logo.png"
        alt="LOOPEC"
        width={width}
        height={height}
        className="h-full w-auto object-contain select-none"
        style={{ width: "auto", height: `${height}px` }}
      />
    </span>
  );
}
