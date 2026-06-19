"use client";

export default function WritingLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
        <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-slate-200 text-sm font-semibold">Sedang menulis...</p>
        <p className="text-slate-600 text-xs mt-1">Sambil menunggu, yuk berdzikir</p>
        <p className="text-amber-400 text-sm font-bold mt-3 leading-relaxed" style={{ fontFamily: "Sora, sans-serif" }}>
          Subhanallah wal hamdulillah<br />wa laa ilaha illallah wallahu akbar
        </p>
      </div>
    </div>
  );
}
