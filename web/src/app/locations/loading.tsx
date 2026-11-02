function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-navy/10 ${className}`} />;
}

export default function LocationsLoading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <SkeletonBlock className="h-8 w-36" />
      <SkeletonBlock className="mt-4 h-12 w-full" />
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonBlock className="h-[120px] w-full" />
        <SkeletonBlock className="h-[120px] w-full" />
        <SkeletonBlock className="h-[120px] w-full" />
      </div>
    </div>
  );
}
