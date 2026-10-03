export default function Loading() {
  return (
    <div className="container-page pt-8" aria-busy="true" aria-label="Loading product">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="skeleton aspect-[4/5] rounded-3xl" />
        <div className="space-y-4">
          <div className="skeleton h-6 w-24 rounded-full" />
          <div className="skeleton h-10 w-3/4 rounded-lg" />
          <div className="skeleton h-8 w-32 rounded-lg" />
          <div className="skeleton mt-6 h-24 w-full rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-9 w-14 rounded-full" />
            ))}
          </div>
          <div className="skeleton h-11 w-full rounded-full" />
          <div className="skeleton h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
