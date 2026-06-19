"use client";

import { useEffect, useState } from "react";

// Dzikir muncul bertahap kata demi kata, lalu berkedip & mengulang selama proses menulis.
const DZIKIR = ["Subhanallah", "wal", "hamdulillah", "wa", "laa", "ilaha", "illallah", "wallahu", "akbar"];

export default function WritingLoader() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setShown(prev => (prev >= DZIKIR.length ? 0 : prev + 1)); // selesai → ulang dari awal
    }, 450);
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
        <p className="text-slate-600 text-xs mt-1">Sambil menunggu, yuk berdzikir</p>
        <p
          className="text-amber-400 text-sm font-bold mt-3 leading-relaxed min-h-[2.5rem] flex flex-wrap justify-center gap-x-1.5"
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          {DZIKIR.map((word, i) => (
            <span
              key={i}
              className={`transition-all duration-500 ${
                i < shown
                  ? i === shown - 1
                    ? "opacity-100 animate-pulse" // kata terbaru: kedap-kedip
                    : "opacity-100"
                  : "opacity-0"
              }`}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
