export default function SearchSkeleton() {
  return (
    <section className="mt-10 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-card border border-black/[0.04] px-6 py-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-apple-silver" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-apple-silver rounded-lg w-1/3" />
              <div className="h-3 bg-apple-silver rounded-lg w-1/4" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-6 w-20 bg-apple-silver rounded-full" />
              <div className="h-6 w-16 bg-apple-silver rounded-full" />
              <div className="h-5 w-5 bg-apple-silver rounded" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
