interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden rounded-xl sm:rounded-2xl">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-2.5 sm:p-4 space-y-2">
        <Skeleton className="h-3 sm:h-4 w-2/3" />
        <Skeleton className="h-4 sm:h-5 w-full" />
        <Skeleton className="h-3 sm:h-4 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 sm:h-5 w-16 sm:w-24" />
          <Skeleton className="h-8 w-8 sm:w-full sm:h-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

