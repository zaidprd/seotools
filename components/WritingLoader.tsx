"use client";

import { useEffect, useState } from "react";

// Dzikir muncul bertahap kata demi kata, lalu berkedip & mengulang selama proses menulis.
const STAGES = [
  "Menyiapkan struktur artikel",
  "Menulis isi utama",
  "Memeriksa format dan keterbacaan",
  "Menyimpan draf",
];

export default function WritingLoader() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStage(prev => (prev + 1) % STAGES.length);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm" role="status" aria-live="polite">
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
        <span className="animate-pulse">＋</span>
        <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900">Sedang menyiapkan draf Anda</p>
        <p className="mt-2 text-sm text-slate-600">{STAGES[stage]}</p>
      </div>
      <ol className="w-full max-w-sm space-y-2 text-left">
        {STAGES.map((label, index) => <li key={label} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${index === stage ? "bg-emerald-50 font-semibold text-emerald-900" : index < stage ? "text-emerald-700" : "text-slate-400"}`}><span aria-hidden="true">{index < stage ? "✓" : index === stage ? "●" : "○"}</span>{label}</li>)}
      </ol>
      <p className="text-xs leading-relaxed text-slate-500">Anda boleh tetap di halaman ini. Proses dapat memerlukan waktu berbeda untuk setiap artikel.</p>
    </div>
  );
}
