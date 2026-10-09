function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-navy/10 ${className}`} />;
}

export default function PropertiesLoading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <SkeletonBlock className="h-8 w-36" />
      <SkeletonBlock className="mt-4 h-12 w-full" />
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonBlock className="h-[88px] w-full" />
        <SkeletonBlock className="h-[88px] w-full" />
        <SkeletonBlock className="h-[88px] w-full" />
      </div>
    </div>
  );
}
