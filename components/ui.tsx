"use client";
import { useState, ReactNode } from "react";

export const Tog = ({ label, val, set, disabled }: { label: string; val: boolean; set: (v: boolean) => void; disabled?: boolean }) => (
  <div className={`flex items-center justify-between gap-2 py-0.5 ${disabled ? "opacity-40" : ""}`}>
    <span className="text-xs text-slate-300 leading-tight">{label}</span>
    <button type="button" onClick={() => !disabled && set(!val)} className={`relative w-9 h-[18px] rounded-full flex-shrink-0 transition-colors duration-200 ${val ? "bg-amber-500" : "bg-slate-700"}`}>
      <span className={`absolute top-0.5 w-[14px] h-[14px] rounded-full bg-white shadow transition-all duration-200 ${val ? "left-[18px]" : "left-0.5"}`} />
    </button>
  </div>
);

export const Sel = ({ label, opts, val, set, tooltip }: { label?: string; opts: string[]; val: string; set: (v: string) => void; tooltip?: string }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">{label}{tooltip && <span className="text-slate-700 cursor-help" title={tooltip}>ⓘ</span>}</label>}
    <select
      value={val}
      onChange={e => set(e.target.value)}
      style={{
        height: "36px", minHeight: "36px",
        backgroundColor: "#0f172a", color: "#e2e8f0",
        border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
        padding: "0 10px", fontSize: "12px",
        appearance: "auto", WebkitAppearance: "menulist",
        width: "100%", cursor: "pointer",
      }}
    >
      {opts.map(o => <option key={o} value={o} style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>{o}</option>)}
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
      ? <textarea
          value={val} onChange={e => set(e.target.value)} rows={rows} placeholder={placeholder} maxLength={maxLen}
          style={{ backgroundColor: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", width: "100%", resize: "none" }}
          className="focus:outline-none focus:border-amber-500/60 placeholder-slate-600" />
      : <input
          type={type || "text"} value={val} onChange={e => set(e.target.value)} placeholder={placeholder} maxLength={maxLen}
          style={{ height: "38px", minHeight: "38px", backgroundColor: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px", padding: "0 12px", fontSize: "12px", width: "100%" }}
          className="focus:outline-none focus:border-amber-500/60 placeholder-slate-600" />}
  </div>
);

export const Sec = ({ title, icon, children, collapsible = true, defaultOpen }: {
  title: string; icon: string; children: ReactNode; collapsible?: boolean; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen ?? true);

  if (collapsible && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-slate-800/40 transition-colors group border border-slate-800/60">
        <span className="text-amber-600/70 text-xs group-hover:text-amber-500 transition-colors flex-shrink-0">{icon}</span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-1 group-hover:text-slate-300 transition-colors">{title}</span>
        <span className="text-slate-600 text-[11px] group-hover:text-amber-500 transition-colors flex-shrink-0">▾</span>
      </button>
    );
  }

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button type="button" onClick={() => collapsible && setOpen(false)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/80 ${collapsible ? "hover:bg-slate-800/60 cursor-pointer" : "cursor-default"} transition-colors`}>
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-sm">{icon}</span>
          <span className="text-[11px] font-black text-slate-200 uppercase tracking-widest">{title}</span>
        </div>
        {collapsible && <span className="text-slate-500 text-[11px]">▴</span>}
      </button>
      <div className="px-4 py-3 bg-slate-950/40 flex flex-col gap-2.5">{children}</div>
    </div>
  );
};

export const Badge = ({ text, v = "default" }: { text: string; v?: string }) => {
  const s: Record<string, string> = { GRATIS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", HEMAT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", PRO: "bg-amber-500/15 text-amber-400 border-amber-500/25", MAX: "bg-violet-500/15 text-violet-400 border-violet-500/25", success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", error: "bg-red-500/15 text-red-400 border-red-500/25", loading: "bg-blue-500/15 text-blue-400 border-blue-500/25", default: "bg-slate-800 text-slate-400 border-slate-700" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s[v] || s[text] || s.default}`}>{text}</span>;
};

export const RunBtn = ({ onClick, loading, disabled, label, sublabel }: { onClick: () => void; loading?: boolean; disabled?: boolean; label: string; sublabel?: string }) => (
  <button type="button" onClick={onClick} disabled={disabled || loading} className="w-full py-3.5 rounded-xl font-black text-sm tracking-widest uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-900 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
    {loading ? <><span className="w-4 h-4 border-[3px] border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />{sublabel || "Memproses..."}</> : <><span className="text-base">▶</span>{label}</>}
  </button>
);