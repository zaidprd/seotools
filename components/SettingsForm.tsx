"use client";
import { useState } from "react";
import { Config, WPSite, ModelInfo, LANGUAGES, ARTICLE_TYPES, ARTICLE_SIZES, TONES, POVS, READABILITY, COUNTRIES, LINK_TYPES, IMG_STYLES, IMG_SIZES, IMG_COUNTS, YT_COUNTS, LAYOUT_OPTS, FREE_MAX_WORDS, CREDIT_COST } from "@/lib/constants";
import { Sec, Sel, Inp, Tog } from "./ui";
import ModelSelector from "./ModelSelector";
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

export default function SettingsForm({ cfg, set, model, setModel, wpSites, addWp, removeWp, wpSel, setWpSel, mode = "single", credits, isPro }: {
  cfg: Config; set: (fn: (p: Config) => Config) => void; model: ModelInfo; setModel: (m: ModelInfo) => void;
  wpSites: WPSite[]; addWp: (s: WPSite) => void; removeWp: (id: number) => void;
  wpSel: WPSite | null; setWpSel: (s: WPSite | null) => void; mode?: "single" | "bulk";
  credits: number; isPro: boolean;
}) {
  const f = (k: keyof Config, v: any) => set(p => ({ ...p, [k]: v }));

  // Artikel sizes — user gratis hanya boleh max Sedang
  const availableSizes = !isPro
    ? ARTICLE_SIZES.slice(0, 3) // Mini, Pendek, Sedang
    : ARTICLE_SIZES;

  return (
    <div className="flex flex-col gap-1.5 pb-6 pr-0.5">

      {/* Core Settings — SELALU TERBUKA */}
      <Sec title="Core Settings" icon="⚙" collapsible={false}>
        <div className="grid grid-cols-2 gap-2">
          <Sel label="Bahasa" opts={LANGUAGES} val={cfg.language} set={v => f("language", v)} />
          <Sel label="Tipe Artikel" opts={ARTICLE_TYPES} val={cfg.articleType} set={v => f("articleType", v)} />
          <div className="col-span-2">
            <Sel label="Ukuran Artikel" opts={availableSizes} val={!isPro ? FREE_MAX_WORDS : cfg.articleSize} set={v => f("articleSize", v)} />
            {!isPro && <p className="text-[10px] text-amber-500/70 mt-1">⚡ Gratis maks 1.000 kata · Upgrade untuk lebih</p>}
          </div>
        </div>
        <div className="border-t border-slate-800 pt-2.5 mt-0.5">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">AI Settings</p>
          <div className="grid grid-cols-2 gap-2">
            <Sel label="Nada Tulisan" opts={TONES} val={cfg.tone} set={v => f("tone", v)} />
            <Sel label="Sudut Pandang" opts={POVS} val={cfg.pov} set={v => f("pov", v)} />
            <Sel label="Keterbacaan" opts={READABILITY} val={cfg.readability} set={v => f("readability", v)} />
            <Sel label="Target Negara" opts={COUNTRIES} val={cfg.country} set={v => f("country", v)} />
          </div>
          <div className="mt-2"><Tog label="AI Content Cleaning" val={cfg.aiCleaning} set={v => f("aiCleaning", v)} /></div>
        </div>
        <div className="border-t border-slate-800 pt-2.5 mt-0.5">
          <ModelSelector sel={model} set={setModel} credits={credits} isPro={isPro} />
        </div>
      </Sec>

      {/* Semua section lain — TERTUTUP secara default */}
      <Sec title="Brand Voice" icon="🎙" defaultOpen={true}>
        <p className="text-[10px] text-slate-600 leading-relaxed">Buat gaya unik agar konten selalu konsisten.</p>
        <Inp val={cfg.brandVoice} set={v => f("brandVoice", v)} placeholder="cth: profesional namun hangat..." multiline rows={3} maxLen={500} />
      </Sec>

      <Sec title="Details to Include" icon="📝" defaultOpen={true}>
        <Inp val={cfg.details} set={v => f("details", v)} placeholder="cth: sertakan data BPS 2024, sebutkan Tokopedia..." multiline rows={3} maxLen={6000} />
      </Sec>

      <Sec title="Media Hub" icon="🖼" defaultOpen={true}>
        {/* Gambar AI — hanya plan berbayar */}
        <div className="relative">
          <div className={`bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 mb-1 ${!isPro ? "opacity-50 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">🤖 Gambar AI Otomatis</p>
              {isPro && (
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Aktif</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Sel label="Jumlah" opts={["0", ...IMG_COUNTS]} val={isPro ? cfg.imgCount : "0"} set={v => f("imgCount", v)} />
              <Sel label="Ukuran" opts={IMG_SIZES} val={cfg.imgSize} set={v => f("imgSize", v)} />
              <Sel label="Style" opts={IMG_STYLES} val={cfg.imgStyle} set={v => f("imgStyle", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Tog label="Keyword utama di gambar pertama" val={cfg.imgFirstKeyword} set={v => f("imgFirstKeyword", v)} />
              <Tog label="Alt-text SEO otomatis" val={cfg.imgAltText} set={v => f("imgAltText", v)} />
            </div>
            <div className="mt-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Style Gambar (opsional)</label>
              <input
                value={cfg.imgPrompt}
                onChange={e => f("imgPrompt", e.target.value)}
                placeholder="cth: foto profesional, ilustrasi flat, infografis, cartoon..."
                className="w-full bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-700"
              />
              <p className="text-[10px] text-slate-600 mt-0.5">
                {cfg.imgPrompt ? "Digabung: keyword + style kamu" : "Kosong = prompt otomatis dari keyword artikel"}
              </p>
            </div>
            {isPro && parseInt(cfg.imgCount || "0") > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800/60">
                <p className="text-[10px] text-slate-500">
                  💡 Gambar disisipkan otomatis saat artikel dibuat. Setiap gambar = <span className="text-amber-400 font-bold">1 💎</span>
                </p>
                <div className="mt-1.5 bg-slate-900/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5">
                  <p className="text-[10px] text-slate-400">
                    Estimasi kredit: <span className="text-white font-bold">{(CREDIT_COST[model.id] ?? 1) + parseInt(cfg.imgCount || "0")} 💎</span>
                    <span className="text-slate-600 ml-1">(artikel {CREDIT_COST[model.id] ?? 1} + {cfg.imgCount} gambar)</span>
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Kamu punya {credits} 💎 tersisa</p>
                </div>
              </div>
            )}
          </div>
          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-lg backdrop-blur-[2px]">
              <div className="text-center px-4 py-2">
                <p className="text-amber-400 text-xs font-bold">🔒 Hanya Paket Berbayar</p>
                <p className="text-slate-500 text-[10px] mt-0.5">Upgrade untuk gambar AI otomatis</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">▶ YouTube Videos</p>
          <div className="grid grid-cols-2 gap-2">
            <Sel label="Jumlah" opts={YT_COUNTS} val={cfg.ytCount} set={v => f("ytCount", v)} />
            <Sel label="Layout" opts={LAYOUT_OPTS} val={cfg.ytLayout} set={v => f("ytLayout", v)} />
          </div>
        </div>
      </Sec>

      {mode === "single" && (
        <Sec title="SEO" icon="🔍" defaultOpen={true}>
          <Inp label="Keywords untuk disertakan" val={cfg.seoKeywords} set={v => f("seoKeywords", v)} placeholder="keyword1, keyword2..." multiline rows={2} maxLen={2000} />
        </Sec>
      )}

      <Sec title="Structure" icon="🏗" defaultOpen={true}>
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

      <Sec title="Internal Linking" icon="🔗" defaultOpen={true}>
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
                <p className="text-[10px] text-slate-600 mt-0.5">Satu halaman per baris. AI akan memilih yang relevan.</p>
              </div>

              {/* Fetch dari sitemap */}
              <FetchSitemap baseUrl={cfg.internalLinkBaseUrl} onFetch={pages => f("internalLinkPages", pages)} />
            </div>
          )}
        </div>
      </Sec>

      <Sec title="External Linking" icon="↗" defaultOpen={true}>
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            {LINK_TYPES.map(t => (
              <button key={t} onClick={() => f("extLinkType", t)}
                className={`text-[10px] px-2 py-1 rounded-lg border transition-all flex-1 ${cfg.extLinkType === t ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "border-slate-700 text-slate-500 hover:border-slate-600"}`}>
                {t}
              </button>
            ))}
          </div>
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
              <p className="text-[10px] text-slate-600 mt-0.5">Satu URL per baris. AI akan menyisipkan sebagai referensi.</p>
            </div>
          )}
        </div>
      </Sec>

      <Sec title="Connect to Web" icon="🌐" defaultOpen={true}>
        <div className="relative">
          <div className={!isPro ? "opacity-40 pointer-events-none select-none" : ""}>
            <Sel label="Akses Real-time" opts={["Tidak","Ya"]} val={cfg.connectWeb?"Ya":"Tidak"} set={v=>f("connectWeb",v==="Ya")} />
          </div>
          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-end pr-1">
              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">🔒 Pro</span>
            </div>
          )}
        </div>
      </Sec>

      <Sec title="Sindikasi" icon="📡" defaultOpen={true}>
        <div className="relative">
          <div className={`grid grid-cols-2 gap-2 ${!isPro ? "opacity-40 pointer-events-none select-none" : ""}`}>
            {([["𝕏 Twitter","twitter"],["in LinkedIn","linkedin"],["f Facebook","facebook"],["✉ Email","email"],["📱 WhatsApp","wa"],["📌 Pinterest","pinterest"]] as [string,keyof Config["synds"]][]).map(([l,k]) => (
              <Tog key={k} label={l} val={cfg.synds[k]} set={v=>set(p=>({...p,synds:{...p.synds,[k]:v}}))} />
            ))}
          </div>
          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 rounded-lg backdrop-blur-[2px]">
              <div className="text-center">
                <p className="text-amber-400 text-xs font-bold">🔒 Hanya Pro</p>
                <p className="text-slate-500 text-[10px] mt-0.5">Upgrade untuk sindikasi konten</p>
              </div>
            </div>
          )}
        </div>
      </Sec>

      <Sec title="Document" icon="📁" defaultOpen={true}>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-slate-500">Simpan ke:</p>
          {["Home","Blog","Produk"].map(d => (
            <button key={d} onClick={() => f("saveFolder",d)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${cfg.saveFolder===d?"bg-amber-500/15 border-amber-500/40 text-amber-300":"border-slate-700 text-slate-500 hover:border-slate-600"}`}>{d}</button>
          ))}
        </div>
      </Sec>

      {/* Publishing — terbuka HANYA jika sudah ada situs WP */}
      <Sec title="Publishing to Website" icon="🚀" defaultOpen={true}>
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
                  <p className="text-[10px] text-slate-600">Artikel akan dipublish otomatis pada waktu ini.</p>
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