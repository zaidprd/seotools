"use client";
import { useState } from "react";
import { MODELS, ModelInfo, FREE_MODEL_ID, FREE_MODEL_LABEL } from "@/lib/constants";

interface Props {
  sel: ModelInfo;
  set: (m: ModelInfo) => void;
  credits: number;
  isPro: boolean;
  isAio?: boolean;    // jika true, semua model di-lock kecuali AIO_MODEL_ID
  isAdmin?: boolean;  // jika true, unlimited — semua model bisa dipilih tanpa cek kredit
}

export default function ModelSelector({ sel, set, credits, isPro, isAio, isAdmin }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!isPro) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Model</label>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-slate-800/60 border border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">{FREE_MODEL_LABEL}</span>
            </div>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">1 💎</span>
          </div>
          <p className="text-[10px] text-slate-600 text-center leading-relaxed">
            Upgrade untuk akses GPT-4.1 Mini, GPT-4.1, dan GPT-5.4
          </p>
          <button onClick={() => setShowUpgrade(true)}
            className="text-[10px] text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 py-1.5 rounded-lg transition-colors">
            Lihat Model Lainnya →
          </button>
        </div>

        {showUpgrade && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="text-3xl mb-3">⭐</div>
              <h3 className="font-black text-xl text-white mb-2">Model AI Pro</h3>
              <p className="text-sm text-slate-400 mb-4">Upgrade untuk akses semua model premium.</p>
              <div className="flex flex-col gap-2 mb-5">
                {MODELS.filter(m => m.id !== FREE_MODEL_ID).map(m => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="flex items-center gap-2 text-xs text-slate-300">
                      {m.label}
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold">{m.credits} 💎</span>
                  </div>
                ))}
              </div>
              <a href="/pricing" className="block w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-3 rounded-xl transition-colors text-center mb-2">
                Upgrade Sekarang
              </a>
              <button onClick={() => setShowUpgrade(false)} className="w-full text-slate-600 hover:text-slate-400 text-xs py-2 transition-colors">
                Nanti saja
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
        <span>AI Model</span>
        <span className="text-amber-400 normal-case font-normal">
          {isAdmin ? "💎 Unlimited" : `💎 ${credits} kredit tersisa`}
        </span>
      </label>
      <div className="flex flex-col gap-1 bg-slate-900 border border-slate-800 rounded-xl p-2">
        {MODELS.map(m => {
          const canAfford = isAdmin || credits >= m.credits;
          const disabled = !canAfford;

          return (
            <button key={m.id}
              onClick={() => !disabled && set(m)}
              disabled={disabled}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all border ${
                sel.id === m.id
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : canAfford
                    ? "hover:bg-slate-800/60 text-slate-400 border-transparent"
                    : "opacity-40 cursor-not-allowed text-slate-600 border-transparent"
              }`}>
              <span className="flex items-center gap-1.5">
                {m.label}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
                  m.badge === "HEMAT" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                  m.badge === "MAX"   ? "text-purple-400 border-purple-500/30 bg-purple-500/10" :
                                        "text-blue-400 border-blue-500/30 bg-blue-500/10"
                }`}>{m.badge}</span>
              </span>
              <span className={`text-[10px] font-bold ${canAfford ? "text-amber-400" : "text-slate-600"}`}>
                {m.credits} 💎
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
