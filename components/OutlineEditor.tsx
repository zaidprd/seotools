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
  const tc: Record<string, string> = { H1: "text-amber-700", H2: "text-blue-400", H3: "text-emerald-700" };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 flex-wrap">
        {["H2", "H3", "Paragraf"].map(t => <button key={t} onClick={() => add(t)} className="text-xs px-2.5 py-1 rounded-lg border border-stone-300 hover:border-amber-500/40 text-slate-500 hover:text-amber-700 transition-all">{t}</button>)}
      </div>
      {rows.length === 0 && <p className="text-xs text-slate-500 text-center py-3">Opsional. Biarkan kosong agar struktur SEO dibuat otomatis.</p>}
      {rows.map((row, i) => (
        <div key={i} draggable onDragStart={() => drag.current = i} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)} className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing group">
          <span className="text-slate-400 text-xs">⠿</span>
          <span className={`text-xs font-bold w-16 flex-shrink-0 ${tc[row.type] || "text-slate-500"}`}>{row.type}</span>
          <input value={row.text} onChange={e => upd(i, e.target.value)} placeholder={`Teks ${row.type}...`} className="flex-1 bg-transparent text-slate-400 text-xs focus:outline-none placeholder-stone-400" />
          <button onClick={() => rm(i)} className="text-slate-800 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">×</button>
        </div>
      ))}
    </div>
  );
}
