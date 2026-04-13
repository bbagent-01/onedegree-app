import { Skeleton } from "@/components/ui/skeleton";

export function ListingCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/3] rounded-xl" />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-4 w-20 mt-1" />
      </div>
    </div>
  );
}
