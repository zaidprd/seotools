"use client";
import { useState, ReactNode } from "react";

export const Tog = ({ label, val, set, disabled }: { label: string; val: boolean; set: (v: boolean) => void; disabled?: boolean }) => (
  <div className={`flex items-center justify-between gap-2 py-0.5 ${disabled ? "opacity-40" : ""}`}>
    <span className="text-xs text-slate-300 leading-tight">{label}</span>
    <button onClick={() => !disabled && set(!val)} className={`relative w-9 h-[18px] rounded-full flex-shrink-0 transition-colors duration-200 ${val ? "bg-amber-500" : "bg-slate-700"}`}>
      <span className={`absolute top-0.5 w-[14px] h-[14px] rounded-full bg-white shadow transition-all duration-200 ${val ? "left-[18px]" : "left-0.5"}`} />
    </button>
  </div>
);

export const Sel = ({ label, opts, val, set, tooltip }: { label?: string; opts: string[]; val: string; set: (v: string) => void; tooltip?: string }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">{label}{tooltip && <span className="text-slate-700 cursor-help" title={tooltip}>ⓘ</span>}</label>}
    <select value={val} onChange={e => set(e.target.value)} className="bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500/60 transition-colors cursor-pointer">
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
);

export const Inp = ({ label, val, set, placeholder, multiline, rows = 3, maxLen, note, type }: { label?: string; val: string; set: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number; maxLen?: number; note?: string; type?: string }) => (
  <div className="flex flex-col gap-1">
    {label && <div className="flex items-center justify-between">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      {maxLen && <span className="text-[10px] text-slate-700">{val.length}/{maxLen}</span>}
    </div>}
    {note && <p className="text-[10px] text-slate-600 -mt-0.5">{note}</p>}
    {multiline
      ? <textarea value={val} onChange={e => set(e.target.value)} rows={rows} placeholder={placeholder} maxLength={maxLen} className="bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 resize-none transition-colors" />
      : <input type={type || "text"} value={val} onChange={e => set(e.target.value)} placeholder={placeholder} maxLength={maxLen} className="bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 transition-colors" />}
  </div>
);

export const Sec = ({ title, icon, children, collapsible = true }: { title: string; icon: string; children: ReactNode; collapsible?: boolean }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button onClick={() => collapsible && setOpen(!open)} className={`w-full flex items-center justify-between px-4 py-3 bg-slate-900/80 ${collapsible ? "hover:bg-slate-800/60 cursor-pointer" : "cursor-default"} transition-colors`}>
        <div className="flex items-center gap-2"><span className="text-amber-500 text-sm">{icon}</span><span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{title}</span></div>
        {collapsible && <span className="text-slate-600 text-xs">{open ? "▲" : "▼"}</span>}
      </button>
      {open && <div className="px-4 py-3 bg-slate-950/40 flex flex-col gap-2.5">{children}</div>}
    </div>
  );
};

export const Badge = ({ text, v = "default" }: { text: string; v?: string }) => {
  const s: Record<string, string> = { GRATIS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", PRO: "bg-amber-500/15 text-amber-400 border-amber-500/25", success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", error: "bg-red-500/15 text-red-400 border-red-500/25", loading: "bg-blue-500/15 text-blue-400 border-blue-500/25", default: "bg-slate-800 text-slate-400 border-slate-700" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s[v] || s[text] || s.default}`}>{text}</span>;
};

export const RunBtn = ({ onClick, loading, disabled, label, sublabel }: { onClick: () => void; loading?: boolean; disabled?: boolean; label: string; sublabel?: string }) => (
  <button onClick={onClick} disabled={disabled || loading} className="w-full py-3.5 rounded-xl font-black text-sm tracking-widest uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-900 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
    {loading ? <><span className="w-4 h-4 border-[3px] border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />{sublabel || "Memproses..."}</> : <><span className="text-base">▶</span>{label}</>}
  </button>
);
