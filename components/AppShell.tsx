"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", icon: "✏️", label: "Builder" },
  { href: "/documents", icon: "📄", label: "Dokumen" },
  { href: "/account", icon: "👤", label: "Akun" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

interface UserInfo {
  id: string;
  email: string;
  plan: string;
  credits: number;
  full_name?: string;
  role?: string;
  plan_expires_at?: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tutup sidebar otomatis saat navigasi (mobile/tablet)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Tutup sidebar saat resize ke desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      fetch(`/api/user`).then(r => r.json()).then(setUserInfo);
    });
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  const isAdmin = userInfo?.role === "admin";

  const planBadge = isAdmin
    ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/30"
    : userInfo?.plan && userInfo.plan !== "free"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-slate-500 bg-slate-800/80 border-slate-700";

  const planLabel = isAdmin ? "OWNER" : (userInfo?.plan || "FREE").toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#0c0e14] text-slate-100" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* ─── Hamburger button — mobile & tablet only ─── */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        aria-label={sidebarOpen ? "Tutup menu" : "Buka menu"}
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-xl bg-slate-900/95 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-lg backdrop-blur-sm"
      >
        <span className="text-base leading-none select-none">
          {sidebarOpen ? "✕" : "☰"}
        </span>
      </button>

      {/* ─── Backdrop overlay — mobile & tablet only ─── */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ─── Sidebar ─────────────────────────────────────────────
          Mobile/tablet: fixed overlay, slides in/out
          Desktop:       sticky, participates in flex layout     ─── */}
      <aside className={`
        fixed lg:sticky top-0 h-screen z-40
        w-64 lg:w-56 flex-shrink-0 flex flex-col
        border-r border-slate-800/80 bg-[#0c0e14]
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0 shadow-2xl shadow-black/40" : "-translate-x-full"}
        lg:translate-x-0 lg:shadow-none
      `}>

        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-800/60 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">S</div>
            <span className="font-black text-base tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              <span className="text-white">Artikel</span><span className="text-amber-400"> SEO</span>
            </span>
          </a>
          {/* Close button inside sidebar — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors flex-shrink-0"
            aria-label="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV.map(item => {
            const isActive = item.href === "/dashboard"
              ? (pathname === "/dashboard" || pathname?.startsWith("/dashboard/"))
              : pathname === item.href;

            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent"
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-4 border-t border-slate-800/60 pt-3 flex flex-col gap-2">
          {userInfo ? (
            <>
              <div className="flex items-center gap-2.5 px-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${
                  isAdmin
                    ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-[#0c0e14]"
                    : "bg-gradient-to-br from-amber-500 to-orange-600 text-[#0c0e14]"
                }`}>
                  {isAdmin ? "👑" : (userInfo.full_name || userInfo.email || "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {userInfo.full_name || userInfo.email.split("@")[0]}
                  </p>
                  <span className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded border ${planBadge}`}>
                    {isAdmin && <span className="mr-0.5">👑</span>}{planLabel}
                  </span>
                </div>
              </div>

              {!isAdmin && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-500">Kredit tersisa</p>
                  <p className="text-sm font-black text-amber-400">{userInfo.credits} 💎</p>
                </div>
              )}

              {isAdmin && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-yellow-500/70">Akses penuh aktif</p>
                  <p className="text-xs font-bold text-yellow-400">∞ Unlimited</p>
                </div>
              )}

              <button onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-red-400 text-xs transition-colors rounded-lg hover:bg-red-500/5">
                <span>⏏</span> Sign Out
              </button>
            </>
          ) : (
            <div className="px-3 py-4 flex justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-amber-500 animate-spin" />
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
