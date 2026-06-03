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
  { href: "/blog", icon: "📰", label: "Blog" },
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
      {/* ─── Sidebar ─── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-slate-800/80 bg-[#0c0e14] sticky top-0 h-screen z-40">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-800/60">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">S</div>
            <span className="font-black text-base tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              <span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span>
            </span>
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(item => {
            const isActive = item.href === "/dashboard"
              ? (pathname === "/dashboard" || pathname?.startsWith("/dashboard/"))
              : pathname === item.href;

            return (
              <Link key={item.href} href={item.href}
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
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${
                  isAdmin
                    ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-[#0c0e14]"
                    : "bg-gradient-to-br from-amber-500 to-orange-600 text-[#0c0e14]"
                }`}>
                  {isAdmin ? "👑" : (userInfo.full_name || userInfo.email || "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-white truncate">
                      {userInfo.full_name || userInfo.email.split("@")[0]}
                    </p>
                  </div>
                  <span className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded border ${planBadge}`}>
                    {isAdmin && <span className="mr-0.5">👑</span>}{planLabel}
                  </span>
                </div>
              </div>

              {/* Kredit — sembunyikan untuk admin */}
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
