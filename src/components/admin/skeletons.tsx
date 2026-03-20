function Pulse({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />
  );
}

export function OrdersTableSkeleton() {
  return (
    <div>
      {/* フィルタ・ソート */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <Pulse className="h-8 w-28" />
        <Pulse className="h-8 w-24" />
      </div>
      {/* 件数表示 */}
      <Pulse className="mb-3 h-5 w-20" />
      {/* 注文カード */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Pulse className="h-4 w-24" />
                <Pulse className="h-5 w-16" />
                <Pulse className="h-4 w-20" />
              </div>
              <div className="flex items-center gap-3">
                <Pulse className="h-6 w-14 rounded-full" />
                <Pulse className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <Pulse className="mt-2 h-4 w-48" />
            <div className="mt-3 flex justify-end">
              <Pulse className="h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Pulse className="h-5 w-32" />
              <Pulse className="h-4 w-44" />
            </div>
            <Pulse className="h-7 w-14 rounded" />
          </div>
          <Pulse className="mt-2 h-4 w-20" />
          <div className="mt-3 flex gap-2">
            <Pulse className="h-7 w-12 rounded" />
            <Pulse className="h-7 w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LegalFormSkeleton() {
  return (
    <div className="mx-auto max-w-2xl">
      <Pulse className="mb-6 h-7 w-56" />
      <div className="space-y-4">
        {Array.from({ length: 13 }).map((_, i) => (
          <div key={i}>
            <Pulse className="mb-1 h-4 w-24" />
            <Pulse className={`w-full ${i === 2 || i === 11 || i === 12 ? "h-20" : "h-10"}`} />
          </div>
        ))}
        <Pulse className="h-10 w-20 rounded" />
      </div>
    </div>
  );
}
