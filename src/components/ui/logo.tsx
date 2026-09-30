import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[0_4px_16px_rgba(63,118,216,0.35),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" aria-hidden />
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="3" width="7" height="18" rx="1.5" />
          <rect x="14" y="3" width="7" height="11" rx="1.5" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        <span className="t-shimmer" data-text="Eunomia Tasks">
          Eunomia Tasks
        </span>
      </span>
    </span>
  );
}