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
    "bg-gradient-to-r from-amber-500 to-orange-600 font-semibold text-black shadow-[0_4px_14px_rgba(249,115,22,0.25)] transition-[filter,box-shadow] hover:brightness-110 hover:shadow-[0_0_25px_rgba(249,115,22,0.45)] disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:shadow-[0_4px_14px_rgba(249,115,22,0.25)]",
  subtle:
    "border border-white/10 bg-surface-2 text-foreground hover:border-amber-500/30 hover:bg-surface-hover",
  ghost: "text-muted hover:bg-white/5 hover:text-foreground",
  danger: "text-[#ff4500] hover:bg-[#ff4500]/10",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[13px] rounded-lg gap-1.5 max-md:h-10 max-md:px-3",
  md: "h-8 px-3 text-sm rounded-lg gap-2 max-md:h-10 max-md:px-3.5",
  lg: "h-9 px-4 text-sm rounded-lg gap-2 max-md:h-11 max-md:px-5",
  icon: "h-8 w-8 rounded-lg justify-center max-md:h-11 max-md:w-11",
};

export function buttonClasses(
  variant: Variant = "subtle",
  size: Size = "md",
  className?: string,
) {
  return cn(
    "inline-flex select-none items-center transition-all duration-200 ease-out-expo focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] active:duration-75",
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