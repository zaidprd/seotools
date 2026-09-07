"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", icon: "＋", label: "Tulis artikel" },
  { href: "/documents", icon: "▤", label: "Dokumen" },
  { href: "/account", icon: "○", label: "Akun" },
  { href: "/settings", icon: "⌘", label: "Pengaturan" },
];
interface UserInfo { id: string; email: string; plan: string; credits: number; full_name?: string; role?: string; plan_expires_at?: string; }

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null); const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  useEffect(() => { const onResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); }; window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, []);
  useEffect(() => { const sb = createClient(); sb.auth.getUser().then(({ data: { user } }) => { if (!user) { router.push("/login"); return; } fetch("/api/user").then(async r => r.ok ? r.json() : null).then(data => data && setUserInfo(data)); }); }, [router]);
  const logout = async () => { await createClient().auth.signOut(); router.push("/login"); };
  const isAdmin = userInfo?.role === "admin";
  const planLabel = isAdmin ? "Owner" : userInfo?.plan === "free" ? "Gratis" : userInfo?.plan || "Gratis";

  return <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
    <button onClick={() => setSidebarOpen(o => !o)} aria-label={sidebarOpen ? "Tutup menu" : "Buka menu"} className="lg:hidden fixed top-3 left-3 z-50 grid h-11 w-11 place-items-center rounded-lg border border-stone-200 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">{sidebarOpen ? "✕" : "☰"}</button>
    <div onClick={() => setSidebarOpen(false)} className={`lg:hidden fixed inset-0 bg-slate-900/25 z-30 transition-opacity ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} />
    <aside className={`fixed lg:sticky top-0 z-40 flex h-screen w-72 flex-shrink-0 flex-col border-r border-slate-700 bg-slate-800 text-white transition-transform duration-300 lg:w-60 ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"} lg:translate-x-0 lg:shadow-none`}>
      <div className="flex items-center justify-between border-b border-slate-700 px-5 py-5"><a href="/" className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 font-black text-slate-900">A</div><span className="text-base font-bold tracking-tight text-white">Artikel<span className="text-emerald-400">SEO</span></span></a><button onClick={() => setSidebarOpen(false)} className="lg:hidden grid h-11 w-11 place-items-center text-slate-300" aria-label="Tutup sidebar">✕</button></div>
      <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto">{NAV.map(item => { const isActive = item.href === "/dashboard" ? (pathname === "/dashboard" || pathname?.startsWith("/dashboard/")) : pathname === item.href; return <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-emerald-500 text-slate-900" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}><span className="text-base">{item.icon}</span>{item.label}</Link>; })}</nav>
      <div className="border-t border-slate-700 px-4 pb-5 pt-4">{userInfo ? <><div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">{isAdmin ? "A" : (userInfo.full_name || userInfo.email || "U")[0].toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{userInfo.full_name || userInfo.email?.split("@")[0] || "Pengguna"}</p><p className="text-xs capitalize text-slate-400">{planLabel}</p></div></div>{!isAdmin && <div className="mt-4 rounded-lg bg-slate-700 px-3 py-2"><p className="text-xs text-slate-400">Status paket</p><p className="text-sm font-semibold text-emerald-700">{userInfo.plan === "free" ? "Siap digunakan" : "Aktif"}</p></div>}<button onClick={logout} className="mt-3 min-h-11 text-sm text-slate-300 hover:text-white">↪ Keluar</button></> : <div className="py-4 flex justify-center"><div className="w-4 h-4 rounded-full border-2 border-stone-300 border-t-emerald-500 animate-spin" /></div>}</div>
    </aside>
    <main className="flex-1 min-w-0 h-screen overflow-y-auto">{children}</main>
  </div>;
}
