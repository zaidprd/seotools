import Link from "next/link";

export default function BrandMark({ href = "/", compact = false, inverse = false }: { href?: string; compact?: boolean; inverse?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
      <span className={`${compact ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"} grid place-items-center rounded-lg bg-emerald-400 font-black text-[#0a101b] shadow-[0_0_24px_rgba(251,191,36,0.14)]`}>A</span>
      <span className={`font-black tracking-[-0.04em] ${inverse ? "text-white" : "text-slate-900"}`}>
        Artikel <span className="text-emerald-700">SEO</span>
      </span>
    </Link>
  );
}
