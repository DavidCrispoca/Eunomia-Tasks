"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-base text-foreground placeholder:text-muted backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-200 ease-out-expo focus:border-violet-400/70 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-violet-400/20 max-md:text-base";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(baseField, "h-10 min-h-[44px]", className)} {...props} />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(baseField, "min-h-[80px] resize-y py-3 leading-relaxed", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(baseField, "h-10 min-h-[44px] cursor-pointer pr-10 appearance-none bg-no-repeat", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2382abff' stroke-width='1.5' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 12px center",
      }}
      {...props}
    >
      {children}
    </select>
  );
});