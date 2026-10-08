import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid h-6 w-6 place-items-center rounded-lg bg-brand text-white shadow-sm">
        <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20" aria-hidden />
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
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        Eunomia Tasks
      </span>
    </span>
  );
}