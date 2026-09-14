import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_14px_rgba(245,158,11,0.4)]">
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
        <span className="text-gold-gradient">Eunomia</span>{" "}
        <span className="text-white/70">Tasks</span>
      </span>
    </span>
  );
}