function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-navy/10 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-5 pt-6 pb-10">
      <SkeletonBlock className="h-8 w-52" />
      <SkeletonBlock className="mt-4 h-9 w-full" />
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <SkeletonBlock className="h-[100px] w-full" />
        <SkeletonBlock className="h-[100px] w-full" />
      </div>
    </div>
  );
}
