"use client";
import { useEffect, useState } from "react";

// Dzikir yang ditampilkan bergantian (muncul-hilang) selama AI menulis.
const DZIKIR = ["Allahu Akbar", "Subhanallah", "Alhamdulillah", "Laa ilaaha illallah"];

export default function WritingLoader() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % DZIKIR.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
        <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-slate-200 text-sm font-semibold">Sedang menulis...</p>
        <p className="text-slate-600 text-xs mt-1">Sambil menunggu, ayo sambil dzikir</p>
        {/* key={i} agar elemen remount tiap ganti → animasi fade muncul-hilang berulang */}
        <p key={i} className="animate-dzikir text-amber-400 text-base font-bold mt-3" style={{ fontFamily: "Sora, sans-serif" }}>
          {DZIKIR[i]}
        </p>
      </div>
    </div>
  );
}
