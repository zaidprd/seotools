"use client";
import { useState } from "react";
import { Config, WPSite, ModelInfo, LANGUAGES, ARTICLE_TYPES, ARTICLE_SIZES, TONES, POVS, READABILITY, COUNTRIES, LINK_TYPES, FREE_MAX_WORDS } from "@/lib/constants";
import { Sec, Sel, Inp, Tog } from "./ui";

import WPPanel from "./WPPanel";

// ─── Fetch halaman dari sitemap XML ───────────────────────────────────────────
function FetchSitemap({ baseUrl, onFetch }: { baseUrl: string; onFetch: (pages: string) => void }) {
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = async () => {
    const url = sitemapUrl.trim() || (baseUrl.replace(/\/+$/, "") + "/sitemap.xml");
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/fetch-sitemap?url=${encodeURIComponent(url)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gagal fetch sitemap");
      onFetch(data.pages);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="border-t border-slate-800 pt-2">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fetch dari Sitemap</p>
      <div className="flex gap-1.5">
        <input value={sitemapUrl} onChange={e => setSitemapUrl(e.target.value)}
          placeholder={baseUrl ? `${baseUrl.replace(/\/+$/,"")}/sitemap.xml` : "https://example.com/sitemap.xml"}
          className="flex-1 bg-slate-900 border border-slate-700/60 text-slate-200 text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/60 placeholder-slate-700" />
        <button onClick={fetch_} disabled={loading || !baseUrl}
          className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/5 disabled:opacity-40 transition-colors">
          {loading ? "⟳" : "Fetch"}
        </button>
      </div>
      {error && <p className="text-[10px] text-red-400 mt-1">✗ {error}</p>}
    </div>
  );
}

export default function SettingsForm({ cfg, set, model, setModel, wpSites, addWp, removeWp, wpSel, setWpSel, mode = "single", credits, isPro, isAio, isAdmin }: {
  cfg: Config; set: (fn: (p: Config) => Config) => void; model: ModelInfo; setModel: (m: ModelInfo) => void;
  wpSites: WPSite[]; addWp: (s: WPSite) => void; removeWp: (id: number) => void;
  wpSel: WPSite | null; setWpSel: (s: WPSite | null) => void; mode?: "single" | "bulk";
  credits: number; isPro: boolean; isAio?: boolean; isAdmin?: boolean;
}) {
  const f = (k: keyof Config, v: any) => set(p => ({ ...p, [k]: v }));


  return (
    <div className="flex flex-col gap-1.5 pb-6 pr-0.5">

      <Sec title="Gaya & audiens" icon="Aa" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <Sel label="Bahasa" opts={LANGUAGES} val={cfg.language} set={v => f("language", v)} />
          <Sel label="Tipe Artikel" opts={ARTICLE_TYPES} val={cfg.articleType} set={v => f("articleType", v)} />

        </div>
        <div className="border-t border-slate-800 pt-2.5 mt-0.5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Gaya penulisan</p>
          <div className="grid grid-cols-2 gap-2">
            <Sel label="Nada Tulisan" opts={TONES} val={cfg.tone} set={v => f("tone", v)} />
            <Sel label="Sudut Pandang" opts={POVS} val={cfg.pov} set={v => f("pov", v)} />
            <Sel label="Keterbacaan" opts={READABILITY} val={cfg.readability} set={v => f("readability", v)} />
            <Sel label="Target Negara" opts={COUNTRIES} val={cfg.country} set={v => f("country", v)} />
          </div>
          <div className="mt-2"><Tog label="Rapikan hasil penulisan" val={cfg.aiCleaning} set={v => f("aiCleaning", v)} /></div>
        </div>
        <div className="border-t border-slate-800 pt-2.5 mt-0.5 flex items-start gap-2">
          <span className="text-emerald-400">✓</span>
          <div>
            <p className="text-xs font-bold text-slate-300">Konfigurasi penulisan dipilih otomatis</p>
            <p className="text-xs text-slate-400">Dioptimalkan untuk artikel panjang, natural, dan konsisten.</p>
          </div>
        </div>
      </Sec>

      {/* Semua section lain — TERTUTUP secara default */}
      <Sec title="Suara merek" icon="✎" defaultOpen={false}>
        <p className="text-xs text-slate-400 leading-relaxed">Buat gaya unik agar konten selalu konsisten.</p>
        <Inp val={cfg.brandVoice} set={v => f("brandVoice", v)} placeholder="cth: profesional namun hangat..." multiline rows={3} maxLen={500} />
      </Sec>


      <Sec title="Featured image" icon="▧" defaultOpen={false}>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs leading-relaxed text-emerald-300">
          Pilih dan review gambar preset setelah artikel selesai dibuat. Preset hanya digunakan sebagai featured image; gambar di isi artikel dapat diunggah manual dari editor.
        </div>
      </Sec>

      {mode === "single" && (
        <Sec title="Keyword SEO" icon="⌕" defaultOpen={false}>
          <Inp label="Keywords untuk disertakan" val={cfg.seoKeywords} set={v => f("seoKeywords", v)} placeholder="keyword1, keyword2..." multiline rows={2} maxLen={2000} />
        </Sec>
      )}

      <Sec title="Elemen struktur" icon="§" defaultOpen={false}>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pengantar / Hook</label>
        <div className="flex gap-1 flex-wrap mb-2">
          {["Hook","Pertanyaan","Cerita","Statistik","Kutipan","Pernyataan Berani"].map(t => (
            <button key={t} onClick={() => f("introType", t)} className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${cfg.introType===t?"bg-amber-500/15 border-amber-500/40 text-amber-300":"border-slate-700 text-slate-500 hover:border-slate-600"}`}>{t}</button>
          ))}
        </div>
        <div className="border-t border-slate-800 pt-2.5 mt-1">
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
            {([["Kesimpulan","withConclusion"],["Tabel","withTables"],["H3","withH3"],["Lists","withLists"],["Notes","withNotes"],["Outline","withOutlineEl"],["Key Takeaways","withKeyTakeaways"],["FAQ","withFAQ"],["Bold","withBold"],["Quotes","withQuotes"]] as [string,keyof Config][]).map(([l,k]) => (
              <Tog key={k} label={l} val={cfg[k] as boolean} set={v => f(k,v)} />
            ))}
          </div>
        </div>
      </Sec>

      <Sec title="Tautan internal" icon="↳" defaultOpen={false}>
        <div className="flex flex-col gap-2">
          {/* Mode selector */}
          <div className="flex gap-1">
            {["Tidak Ada", "Manual"].map(m => (
              <button key={m} onClick={() => { f("internalLinkSite", m); if (m === "Tidak Ada") f("internalLinkBaseUrl", ""); }}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all flex-1 ${cfg.internalLinkSite === m || (m === "Manual" && cfg.internalLinkSite !== "Tidak Ada") ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "border-slate-700 text-slate-500 hover:border-slate-600"}`}>
                {m}
              </button>
            ))}
          </div>

          {cfg.internalLinkSite !== "Tidak Ada" && (
            <div className="flex flex-col gap-2 mt-1">
              {/* Base URL */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Base URL Website</label>
                <input
                  value={cfg.internalLinkBaseUrl}
                  onChange={e => f("internalLinkBaseUrl", e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-700"
                />
                {cfg.internalLinkBaseUrl && cfg.internalLinkBaseUrl.includes("//") && (
                  <p className="text-[10px] text-emerald-500/70 mt-0.5">✓ {cfg.internalLinkBaseUrl.replace(/\/+$/, "")}/path-artikel</p>
                )}
              </div>

              {/* Daftar halaman manual */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Daftar Halaman (opsional)</label>
                <textarea
                  value={cfg.internalLinkPages}
                  onChange={e => f("internalLinkPages", e.target.value)}
                  placeholder={`/cara-membuat-blog — Cara Membuat Blog\n/tips-seo — Tips SEO Terbaik\natau tempel URL lengkap satu per baris`}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">Satu halaman per baris. Hanya URL/path dalam daftar ini yang boleh digunakan.</p>
              </div>

              {/* Fetch dari sitemap */}
              <FetchSitemap baseUrl={cfg.internalLinkBaseUrl} onFetch={pages => f("internalLinkPages", pages)} />
            </div>
          )}
        </div>
      </Sec>

      <Sec title="Tautan eksternal" icon="↗" defaultOpen={false}>
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            {LINK_TYPES.map(t => (
              <button key={t} onClick={() => f("extLinkType", t)}
                className={`text-[10px] px-2 py-1 rounded-lg border transition-all flex-1 ${cfg.extLinkType === t ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "border-slate-700 text-slate-500 hover:border-slate-600"}`}>
                {t}
              </button>
            ))}
          </div>
          {cfg.extLinkType === "Otomatis" && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
              <p className="text-[10px] leading-relaxed text-blue-300">Mencari maksimal 3 halaman nyata melalui Wikipedia Indonesia. Jika tidak ada hasil yang relevan, artikel dibuat tanpa external link.</p>
            </div>
          )}
          {cfg.extLinkType === "Manual" && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">URL External</label>
              <textarea
                value={cfg.extLinkUrls}
                onChange={e => f("extLinkUrls", e.target.value)}
                placeholder={"https://wikipedia.org/wiki/topik\nhttps://sumber-terpercaya.com/artikel"}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">Satu URL lengkap per baris. AI hanya boleh memakai URL yang Anda berikan.</p>
            </div>
          )}
        </div>
      </Sec>


      <Sec title="Penyimpanan" icon="□" defaultOpen={false}>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-slate-500">Simpan ke:</p>
          {["Home","Blog","Produk"].map(d => (
            <button key={d} onClick={() => f("saveFolder",d)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${cfg.saveFolder===d?"bg-amber-500/15 border-amber-500/40 text-amber-300":"border-slate-700 text-slate-500 hover:border-slate-600"}`}>{d}</button>
          ))}
        </div>
      </Sec>

      {/* Publishing — terbuka HANYA jika sudah ada situs WP */}
      <Sec title="WordPress" icon="W" defaultOpen={false}>
        <WPPanel sites={wpSites} addSite={addWp} removeSite={removeWp} selected={wpSel} setSelected={setWpSel} />
        {wpSel && (
          <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-2">
            <Sel label="Status Publish" opts={["draft","publish","pending","schedule"]} val={cfg.postStatus} set={v=>f("postStatus",v)} />
            {/* Schedule date picker — muncul saat status = schedule (Starter+) */}
            {cfg.postStatus === "schedule" && (
              isPro ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Jadwal Publish</label>
                  <input type="datetime-local" value={cfg.scheduleDate || ""}
                    onChange={e => f("scheduleDate", e.target.value)}
                    className="bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60" />
                  <p className="text-xs text-slate-400">Artikel akan dipublikasikan otomatis pada waktu ini.</p>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-amber-400 font-bold">🔒 Schedule hanya untuk paket berbayar</p>
                  <a href="/pricing" className="text-[10px] text-amber-300 underline">Upgrade ke Starter →</a>
                </div>
              )
            )}
          </div>
        )}
      </Sec>
    </div>
  );
}