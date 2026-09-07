"use client";
import { useRouter } from "next/navigation";

export default function UpgradePopup({ onClose, reason }: { onClose: () => void; reason?: string }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-slate-950/45 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <div className="bg-white border border-stone-200 rounded-2xl p-7 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-xl text-emerald-800">＋</div>
        <h3 id="upgrade-title" className="font-black text-xl text-slate-900 mb-2 text-center">{reason || "Kuota belum mencukupi"}</h3>
        <p className="text-sm text-slate-600 text-center mb-5 leading-relaxed">
          Pilih paket dengan kuota kata yang sesuai agar Anda dapat melanjutkan menulis.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={() => router.push("/pricing")}
            className="w-full min-h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition-colors">
            Lihat paket dan harga
          </button>
          <button onClick={onClose} className="w-full min-h-11 text-slate-600 hover:text-slate-900 text-sm py-2 transition-colors">
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  );
}
