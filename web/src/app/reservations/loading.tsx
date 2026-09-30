function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-navy/10 ${className}`} />;
}

export default function ReservationsLoading() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pt-6 pb-10">
      <SkeletonBlock className="h-8 w-40" />
      <SkeletonBlock className="mt-4 h-12 w-full" />
      <div className="mt-4 flex flex-col gap-3">
        <SkeletonBlock className="h-[96px] w-full" />
        <SkeletonBlock className="h-[96px] w-full" />
        <SkeletonBlock className="h-[96px] w-full" />
      </div>
    </div>
  );
}
