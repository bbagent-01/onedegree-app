import { cn } from "@/lib/utils";

export function ListingCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="aspect-[4/3] rounded-xl bg-muted" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="mt-1 h-4 w-1/4 rounded bg-muted" />
      </div>
    </div>
  );
}
