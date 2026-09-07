"use client";
import { useState } from "react";
import { WPSite } from "@/lib/constants";
import { Badge } from "./ui";

export default function WPPanel({ sites, addSite, removeSite, selected, setSelected }: {
  sites: WPSite[]; addSite: (s: WPSite) => void; removeSite: (id: number) => void;
  selected: WPSite | null; setSelected: (s: WPSite | null) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ name: "", url: "", user: "", pass: "" });
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  const testConn = async () => {
    setTesting(true); setTestOk(null);
    try {
      const r = await fetch("/api/publish/wordpress", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: f, post: { title: "Test Koneksi Artikel SEO", content: "Tes koneksi.", status: "draft" } }),
      });
      setTestOk(r.ok);
    } catch { setTestOk(false); }
    setTesting(false);
  };
  const save = () => {
    if (!f.name || !f.url || !f.user || !f.pass) return;
    addSite({ ...f, id: Date.now() });
    setF({ name: "", url: "", user: "", pass: "" }); setShowForm(false); setTestOk(null);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-sm font-semibold text-slate-700">Target Website</label>
      {sites.length === 0 && !showForm && (
        <div className="border border-dashed border-stone-300 rounded-xl p-4 text-center flex flex-col gap-2">
          <span className="text-2xl">🔌</span>
          <p className="text-xs font-semibold text-slate-500">Belum ada situs terhubung</p>
          <p className="text-xs text-slate-500 leading-relaxed">Buat Application Password di WordPress kamu lalu sambungkan</p>
          <button onClick={() => setShowForm(true)} className="text-xs text-slate-500 hover:text-slate-800 border border-stone-300 hover:border-slate-600 rounded-lg py-1.5 transition-colors mt-1">Sambungkan Situs</button>
        </div>
      )}
      {sites.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {sites.map(s => (
            <div key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${selected?.id === s.id ? "bg-blue-500/10 border-blue-500/30" : "bg-white border-stone-200 hover:border-stone-300"}`}>
              <div className="flex items-center gap-2.5"><span className="text-lg">🌐</span><div><p className="text-xs font-semibold text-slate-800">{s.name}</p><p className="text-xs text-slate-500 truncate max-w-[130px]">{s.url}</p></div></div>
              <div className="flex items-center gap-1.5"><Badge text="Aktif" v="success" /><button onClick={e => { e.stopPropagation(); removeSite(s.id); }} className="text-slate-400 hover:text-red-400 transition-colors ml-1">×</button></div>
            </div>
          ))}
          <button onClick={() => setShowForm(!showForm)} className="text-xs text-amber-500 hover:text-amber-700 text-center py-1 transition-colors">+ Tambah situs lain</button>
        </div>
      )}
      {showForm && (
        <div className="bg-white border border-stone-300 rounded-xl p-3.5 flex flex-col gap-2.5">
          <p className="text-xs font-bold text-slate-800">Sambungkan WordPress</p>
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-800 leading-relaxed">💡 WP Admin → Users → Profile → <strong>Application Passwords</strong></div>
          {[{ k: "name", l: "Nama Situs", p: "cth: Blog Utama" }, { k: "url", l: "URL WordPress", p: "https://situskamu.com" }, { k: "user", l: "Username", p: "admin" }, { k: "pass", l: "Application Password", p: "xxxx xxxx xxxx xxxx", t: "password" }].map(({ k, l, p, t }) => (
            <div key={k} className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">{l}</label>
              <input type={t || "text"} value={(f as any)[k]} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} placeholder={p} className="bg-white border border-stone-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-stone-400" />
            </div>
          ))}
          <div className="flex gap-2 mt-0.5">
            <button onClick={testConn} disabled={testing} className="flex-1 text-xs border border-stone-300 hover:border-slate-600 text-slate-500 hover:text-slate-800 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all">{testing ? <><span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />Menguji...</> : "🔍 Uji Koneksi"}</button>
            <button onClick={save} className="flex-1 text-xs bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 rounded-lg transition-colors">Simpan</button>
          </div>
          {testOk === true && <p className="text-xs text-emerald-700 text-center font-semibold">✓ Koneksi berhasil!</p>}
          {testOk === false && <p className="text-xs text-red-400 text-center">✗ Gagal. Periksa URL & password.</p>}
          <button onClick={() => { setShowForm(false); setTestOk(null); }} className="text-xs text-slate-400 hover:text-slate-500 text-center transition-colors">Batal</button>
        </div>
      )}
    </div>
  );
}
