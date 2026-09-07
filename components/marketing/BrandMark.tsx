import Link from "next/link";

export default function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
      <span className={`${compact ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"} grid place-items-center rounded-lg bg-amber-400 font-black text-[#0a101b] shadow-[0_0_24px_rgba(251,191,36,0.14)]`}>A</span>
      <span className="font-black tracking-[-0.04em] text-slate-900" style={{ fontFamily: "Sora,sans-serif" }}>
        Artikel <span className="text-amber-700">SEO</span>
      </span>
    </Link>
  );
}
