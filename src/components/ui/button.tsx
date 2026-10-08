"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "subtle" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand font-semibold text-white shadow-sm transition-[filter] hover:bg-brand-hover disabled:opacity-50 disabled:hover:bg-brand",
  subtle:
    "surface text-foreground hover:border-violet-400/40 hover:bg-surface-hover",
  ghost: "text-muted hover:bg-white/5 hover:text-foreground",
  danger: "text-rose-400 hover:bg-rose-500/10",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-3 text-[13px] rounded-[10px] gap-1.5 min-h-[44px] max-md:h-11 max-md:px-5 max-md:text-base",
  md: "h-8 px-4 text-sm rounded-[10px] gap-2 min-h-[44px] max-md:h-11 max-md:px-5 max-md:text-base",
  lg: "h-9 px-5 text-sm rounded-[10px] gap-2 min-h-[44px] max-md:h-12 max-md:px-6 max-md:text-base",
  icon: "h-8 w-8 rounded-[10px] justify-center min-h-[44px] min-w-[44px] max-md:h-11 max-md:w-11",
};

export function buttonClasses(
  variant: Variant = "subtle",
  size: Size = "md",
  className?: string,
) {
  return cn(
    "inline-flex select-none items-center transition-all duration-200 ease-out-expo focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px active:scale-[0.98] active:duration-75",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "subtle",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}