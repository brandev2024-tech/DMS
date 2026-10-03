import { ProductCardSkeleton } from "@/components/product/product-card";

export default function Loading() {
  return (
    <div className="container-page pt-8" aria-busy="true" aria-label="Loading products">
      <div className="skeleton h-3 w-28 rounded" />
      <div className="skeleton mt-3 h-10 w-56 rounded-lg" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
