export function LoadingBlock({ height = 280 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <div className="skeleton h-3 w-40" />
      <div className="skeleton w-full" style={{ height }} />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-64" />
      <div className="skeleton h-4 w-full max-w-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton h-32" />
        ))}
      </div>
      <div className="skeleton h-[360px] w-full" />
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="card border-[#e9c6c1] bg-[#fdf4f2] p-5">
      <div className="text-[13px] font-semibold text-[#8f2b24]">Data gagal dimuat</div>
      <p className="mt-1 text-[12px] leading-5 text-[#8f2b24]/80">{message}</p>
      <p className="mt-2 text-[11.5px] leading-5 text-[#8f2b24]/70">
        Pastikan folder <code className="num">public/data</code> sudah dibuat dengan menjalankan
        <code className="num"> python scripts/etl.py</code>.
      </p>
    </div>
  );
}
