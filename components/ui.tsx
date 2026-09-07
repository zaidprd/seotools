"use client";
import { useState, ReactNode } from "react";

export const Tog = ({ label, val, set, disabled }: { label: string; val: boolean; set: (v: boolean) => void; disabled?: boolean }) => (
  <div className={`flex min-h-11 items-center justify-between gap-3 ${disabled ? "opacity-40" : ""}`}>
    <span className="text-sm leading-tight text-slate-700">{label}</span>
    <button type="button" onClick={() => !disabled && set(!val)} disabled={disabled} aria-label={label} aria-pressed={val} className="grid h-11 w-12 flex-shrink-0 place-items-center rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2">
      <span className={`relative block h-6 w-11 rounded-full transition-colors duration-200 ${val ? "bg-amber-500" : "bg-stone-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${val ? "left-6" : "left-1"}`} /></span>
    </button>
  </div>
);

export const Sel = ({ label, opts, val, set, tooltip }: { label?: string; opts: string[]; val: string; set: (v: string) => void; tooltip?: string }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">{label}{tooltip && <span className="text-slate-400 cursor-help" title={tooltip}>ⓘ</span>}</label>}
    <select value={val} onChange={e => set(e.target.value)} className="h-11 w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export const Inp = ({ label, val, set, placeholder, multiline, rows = 3, maxLen, note, type }: { label?: string; val: string; set: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number; maxLen?: number; note?: string; type?: string }) => (
  <div className="flex flex-col gap-1.5">
    {label && <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-semibold text-slate-800">{label}</label>
      {maxLen && <span className="text-xs text-slate-400">{val.length}/{maxLen}</span>}
    </div>}
    {note && <p className="text-xs leading-relaxed text-slate-500 -mt-0.5">{note}</p>}
    {multiline
      ? <textarea value={val} onChange={e => set(e.target.value)} rows={rows} placeholder={placeholder} maxLength={maxLen} className="min-h-11 w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
      : <input type={type || "text"} value={val} onChange={e => set(e.target.value)} placeholder={placeholder} maxLength={maxLen} className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />}
  </div>
);

export const Sec = ({ title, icon, children, collapsible = true, defaultOpen }: { title: string; icon: string; children: ReactNode; collapsible?: boolean; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen ?? true);
  if (collapsible && !open) return (
    <button type="button" onClick={() => setOpen(true)} className="min-h-11 w-full flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-amber-200 hover:bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-300">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-amber-50 text-sm text-amber-700">{icon}</span>
      <span className="flex-1 text-sm font-semibold text-slate-700">{title}</span>
      <span className="text-xs text-slate-400">Pilihan tambahan · ▾</span>
    </button>
  );
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <button type="button" onClick={() => collapsible && setOpen(false)} className={`min-h-11 w-full flex items-center justify-between px-4 py-3.5 text-left ${collapsible ? "hover:bg-stone-50 cursor-pointer" : "cursor-default"} transition-colors`}>
        <div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-md bg-amber-50 text-sm text-amber-700">{icon}</span><span className="text-sm font-semibold text-slate-800">{title}</span></div>
        {collapsible && <span className="text-sm text-slate-400">▴</span>}
      </button>
      <div className="border-t border-stone-100 px-4 py-4 flex flex-col gap-3">{children}</div>
    </section>
  );
};

export const Badge = ({ text, v = "default" }: { text: string; v?: string }) => {
  const s: Record<string, string> = { GRATIS: "bg-emerald-50 text-emerald-700 border-emerald-200", PRO: "bg-amber-50 text-amber-700 border-amber-200", success: "bg-emerald-50 text-emerald-700 border-emerald-200", error: "bg-red-50 text-red-700 border-red-200", loading: "bg-blue-50 text-blue-700 border-blue-200", default: "bg-stone-100 text-slate-600 border-stone-200" };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s[v] || s[text] || s.default}`}>{text}</span>;
};

export const RunBtn = ({ onClick, loading, disabled, label, sublabel }: { onClick: () => void; loading?: boolean; disabled?: boolean; label: string; sublabel?: string }) => (
  <button type="button" onClick={onClick} disabled={disabled || loading} className="w-full rounded-xl bg-amber-500 px-4 py-3.5 font-bold text-sm text-stone-950 shadow-[0_10px_25px_rgba(217,119,6,.22)] transition hover:bg-amber-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2">
    {loading ? <><span className="w-4 h-4 border-[3px] border-stone-900/40 border-t-stone-900 rounded-full animate-spin" />{sublabel || "Memproses..."}</> : <><span className="text-base">✦</span>{label}</>}
  </button>
);
