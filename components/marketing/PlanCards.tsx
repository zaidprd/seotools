"use client";

import Link from "next/link";

export const DISPLAY_PLANS = [
  { id: "starter", name: "Starter", price: "Rp25.000", quota: "6.000 kata", estimate: "hingga 3 artikel panjang", description: "Untuk blog pribadi dan bisnis yang baru rutin menerbitkan konten.", featured: false },
  { id: "pro", name: "Pro", price: "Rp75.000", quota: "25.000 kata", estimate: "hingga 12 artikel panjang", description: "Ruang kerja utama untuk tim kecil dan kalender konten aktif.", featured: true },
  { id: "max", name: "Max", price: "Rp150.000", quota: "60.000 kata", estimate: "hingga 30 artikel panjang", description: "Kuota lebih lapang untuk agensi dan banyak situs WordPress.", featured: false },
] as const;

export default function PlanCards({ onBuy, loading }: { onBuy?: (id: string) => void; loading?: string | null }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 lg:grid-cols-3">
      {DISPLAY_PLANS.map((plan) => (
        <article key={plan.id} className={`relative flex min-h-[390px] flex-col bg-white p-6 sm:p-8 ${plan.featured ? "shadow-[inset_0_3px_0_#fbbf24]" : ""}`}>
          {plan.featured && <span className="mb-6 w-fit border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-800">Direkomendasikan</span>}
          <p className="text-sm font-bold text-slate-400">{plan.name}</p>
          <div className="mt-4 flex items-end gap-2"><strong className="text-3xl text-slate-900 sm:text-4xl" style={{ fontFamily: "Sora,sans-serif" }}>{plan.price}</strong><span className="pb-1 text-xs text-slate-500">/ 30 hari</span></div>
          <div className="mt-7 border-y border-stone-200 py-5">
            <p className="text-lg font-bold text-amber-800">{plan.quota}</p>
            <p className="mt-1 text-xs text-slate-500">{plan.estimate} berdasarkan target hingga 2.000 kata</p>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-500">{plan.description}</p>
          <ul className="mt-5 space-y-2 text-sm text-slate-400">
            <li><span className="mr-2 text-emerald-700">✓</span>Editor dan pemeriksaan SEO</li>
            <li><span className="mr-2 text-emerald-700">✓</span>Preset featured image</li>
            <li><span className="mr-2 text-emerald-700">✓</span>Publikasi WordPress</li>
          </ul>
          {onBuy ? (
            <button onClick={() => onBuy(plan.id)} disabled={loading === plan.id} className={`mt-auto w-full rounded-lg px-4 py-3 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60 ${plan.featured ? "bg-amber-400 text-[#0a101b] hover:bg-amber-300" : "border border-stone-300 text-slate-900 hover:border-amber-400/50 hover:bg-amber-400/5"}`}>
              {loading === plan.id ? "Memproses..." : `Pilih ${plan.name}`}
            </button>
          ) : (
            <Link href="/pricing" className={`mt-auto block rounded-lg px-4 py-3 text-center text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${plan.featured ? "bg-amber-400 text-[#0a101b] hover:bg-amber-300" : "border border-stone-300 text-slate-900 hover:border-amber-400/50"}`}>Lihat {plan.name}</Link>
          )}
        </article>
      ))}
    </div>
  );
}
