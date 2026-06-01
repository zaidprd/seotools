"use client";
import { useRef } from "react";

interface Row { type: string; text: string; }
export default function OutlineEditor({ rows, setRows }: { rows: Row[]; setRows: (r: Row[]) => void }) {
  const drag = useRef<number | null>(null);
  const onDrop = (i: number) => {
    if (drag.current === null || drag.current === i) return;
    const next = [...rows]; const [m] = next.splice(drag.current, 1); next.splice(i, 0, m);
    setRows(next); drag.current = null;
  };
  const add = (type: string) => setRows([...rows, { type, text: "" }]);
  const upd = (i: number, v: string) => setRows(rows.map((x, idx) => idx === i ? { ...x, text: v } : x));
  const rm = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const tc: Record<string, string> = { H1: "text-amber-400", H2: "text-blue-400", H3: "text-emerald-400" };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 flex-wrap">
        {["H1", "H2", "H3", "Paragraf"].map(t => <button key={t} onClick={() => add(t)} className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-700 hover:border-amber-500/40 text-slate-400 hover:text-amber-400 transition-all">{t}</button>)}
        <button onClick={() => add("🛒 Tombol Beli")} className="text-[10px] px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 transition-all">🛒 Tombol Beli</button>
      </div>
      {rows.length === 0 && <p className="text-[11px] text-slate-700 text-center py-3">Tambahkan elemen outline di atas</p>}
      {rows.map((row, i) => (
        <div key={i} draggable onDragStart={() => drag.current = i} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing group">
          <span className="text-slate-700 text-xs">⠿</span>
          <span className={`text-[10px] font-bold w-16 flex-shrink-0 ${tc[row.type] || "text-slate-500"}`}>{row.type}</span>
          <input value={row.text} onChange={e => upd(i, e.target.value)} placeholder={`Teks ${row.type}...`} className="flex-1 bg-transparent text-slate-300 text-xs focus:outline-none placeholder-slate-700" />
          <button onClick={() => rm(i)} className="text-slate-800 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">×</button>
        </div>
      ))}
    </div>
  );
}
