function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-navy/10 ${className}`} />;
}

export default function ExpensesLoading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <SkeletonBlock className="h-8 w-36" />
      <SkeletonBlock className="mt-4 h-12 w-full" />
      <div className="mt-4 flex flex-col gap-3">
        <SkeletonBlock className="h-[120px] w-full" />
        <SkeletonBlock className="h-[120px] w-full" />
        <SkeletonBlock className="h-[120px] w-full" />
      </div>
    </div>
  );
}
