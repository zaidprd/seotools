"use client";
import { Config, WPSite, ModelInfo, LANGUAGES, ARTICLE_TYPES, ARTICLE_SIZES, TONES, POVS, READABILITY, COUNTRIES, LINK_TYPES, IMG_STYLES, IMG_SIZES, IMG_COUNTS, YT_COUNTS, LAYOUT_OPTS, FREE_MAX_WORDS } from "@/lib/constants";
import { Sec, Sel, Inp, Tog } from "./ui";
import ModelSelector from "./ModelSelector";
import WPPanel from "./WPPanel";

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
    <div className="flex flex-col gap-3 overflow-y-auto pb-6 pr-0.5">

      <Sec title="Core Settings" icon="⚙" collapsible={false}>
        <div className="grid grid-cols-2 gap-2">
          <Sel label="Bahasa" opts={LANGUAGES} val={cfg.language} set={v => f("language", v)} />
          <Sel label="Tipe Artikel" opts={ARTICLE_TYPES} val={cfg.articleType} set={v => f("articleType", v)} />
          <div className="col-span-2">
            <Sel label="Ukuran Artikel" opts={availableSizes} val={!isPro ? FREE_MAX_WORDS : cfg.articleSize} set={v => f("articleSize", v)} />
            {!isPro && <p className="text-[10px] text-amber-500/70 mt-1">⚡ Gratis maks 1.500 kata · Upgrade untuk lebih</p>}
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

      <Sec title="Brand Voice" icon="🎙">
        <p className="text-[10px] text-slate-600 leading-relaxed">Buat gaya unik agar konten selalu konsisten.</p>
        <Inp val={cfg.brandVoice} set={v => f("brandVoice", v)} placeholder="cth: profesional namun hangat..." multiline rows={3} maxLen={500} />
      </Sec>

      <Sec title="Details to Include" icon="📝">
        <Inp val={cfg.details} set={v => f("details", v)} placeholder="cth: sertakan data BPS 2024, sebutkan Tokopedia..." multiline rows={3} maxLen={6000} />
      </Sec>

      <Sec title="Media Hub" icon="🖼">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 mb-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">🤖 Gambar AI</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <Sel label="Jumlah" opts={IMG_COUNTS} val={cfg.imgCount} set={v => f("imgCount", v)} />
            <Sel label="Ukuran" opts={IMG_SIZES} val={cfg.imgSize} set={v => f("imgSize", v)} />
            <Sel label="Style" opts={IMG_STYLES} val={cfg.imgStyle} set={v => f("imgStyle", v)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Tog label="Keyword utama di gambar pertama" val={cfg.imgFirstKeyword} set={v => f("imgFirstKeyword", v)} />
            <Tog label="Alt-text SEO otomatis" val={cfg.imgAltText} set={v => f("imgAltText", v)} />
          </div>
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
        <Sec title="SEO" icon="🔍">
          <Inp label="Keywords untuk disertakan" val={cfg.seoKeywords} set={v => f("seoKeywords", v)} placeholder="keyword1, keyword2..." multiline rows={2} maxLen={2000} />
        </Sec>
      )}

      <Sec title="Structure" icon="🏗">
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

      <Sec title="Internal Linking" icon="🔗">
        <Sel label="Pilih Website" opts={["Tidak Ada",...wpSites.map(s=>s.name)]} val={cfg.internalLinkSite} set={v=>f("internalLinkSite",v)} />
      </Sec>

      <Sec title="External Linking" icon="↗">
        <Sel label="Tipe Link" opts={LINK_TYPES} val={cfg.extLinkType} set={v=>f("extLinkType",v)} />
      </Sec>

      <Sec title="Connect to Web" icon="🌐">
        <Sel label="Akses Real-time" opts={["Tidak","Ya"]} val={cfg.connectWeb?"Ya":"Tidak"} set={v=>f("connectWeb",v==="Ya")} />
      </Sec>

      <Sec title="Syndication" icon="📡">
        <div className="grid grid-cols-2 gap-2">
          {([["𝕏 Twitter","twitter"],["in LinkedIn","linkedin"],["f Facebook","facebook"],["✉ Email","email"],["📱 WhatsApp","wa"],["📌 Pinterest","pinterest"]] as [string,keyof Config["synds"]][]).map(([l,k]) => (
            <Tog key={k} label={l} val={cfg.synds[k]} set={v=>set(p=>({...p,synds:{...p.synds,[k]:v}}))} />
          ))}
        </div>
      </Sec>

      <Sec title="Document" icon="📁">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-slate-500">Simpan ke:</p>
          {["Home","Blog","Produk"].map(d => (
            <button key={d} onClick={() => f("saveFolder",d)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${cfg.saveFolder===d?"bg-amber-500/15 border-amber-500/40 text-amber-300":"border-slate-700 text-slate-500 hover:border-slate-600"}`}>{d}</button>
          ))}
        </div>
      </Sec>

      <Sec title="Publishing to Website" icon="🚀">
        <WPPanel sites={wpSites} addSite={addWp} removeSite={removeWp} selected={wpSel} setSelected={setWpSel} />
        {wpSel && <div className="mt-2 pt-2 border-t border-slate-800"><Sel label="Status Publish" opts={["draft","publish","pending"]} val={cfg.postStatus} set={v=>f("postStatus",v)} /></div>}
      </Sec>
    </div>
  );
}
