"use client";
import { useRouter } from "next/navigation";

export default function UpgradePopup({ onClose, reason }: { onClose: () => void; reason?: string }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-7 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-4xl mb-3 text-center">💎</div>
        <h3 className="font-black text-xl text-white mb-2 text-center">{reason || "Kredit Habis"}</h3>
        <p className="text-sm text-slate-400 text-center mb-5 leading-relaxed">
          Upgrade untuk terus membuat artikel SEO berkualitas tinggi tanpa batas.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={() => router.push("/pricing")}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-3 rounded-xl transition-colors">
            Lihat Paket & Harga
          </button>
          <button onClick={onClose} className="w-full text-slate-500 hover:text-slate-300 text-xs py-2 transition-colors">
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  );
}
