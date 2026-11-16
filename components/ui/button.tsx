import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d0c1ab]/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[#241e14] text-white shadow-[0_8px_22px_-12px_rgba(36,30,20,0.65)] hover:-translate-y-0.5 hover:bg-[#382f20]",
        secondary:
          "border border-[#d0c1ab] bg-white text-[#241e14] hover:border-[#b8a58b] hover:bg-[#eee9e2]/60",
        quiet: "text-[#736b60] hover:bg-[#eee9e2]/60 hover:text-[#241e14]",
      },
      size: {
        sm: "min-h-10 px-4 text-[13px]",
        md: "min-h-12 px-5 text-sm",
        lg: "min-h-[54px] px-6 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
