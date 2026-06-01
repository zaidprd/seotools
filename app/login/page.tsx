"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login"|"register">("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    }
    setLoading(false);
  };

  const signInGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl" />
      <div className="relative w-full max-w-sm">
        <a href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-lg">S</div>
          <span className="font-black text-xl tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
            <span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span>
          </span>
        </a>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-7 backdrop-blur">
          <h1 className="text-xl font-black text-white mb-1" style={{ fontFamily: "Sora,sans-serif" }}>
            {mode === "login" ? "Selamat datang kembali" : "Buat akun gratis"}
          </h1>
          <p className="text-xs text-slate-500 mb-6">
            {mode === "login" ? "Masuk untuk mulai membuat konten" : "Daftar dan dapatkan 1 artikel gratis"}
          </p>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300 mb-4">{error}</div>}

          <form id="auth-form" onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
              <input id="email" name="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <input id="password" name="password" type="password" required value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••" minLength={6}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="mt-2 bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <span className="w-4 h-4 border-2 border-[#0c0e14]/40 border-t-[#0c0e14] rounded-full animate-spin" /> : (mode === "login" ? "Masuk" : "Daftar Gratis")}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] text-slate-600">atau</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <button onClick={signInGoogle}
            className="w-full border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Lanjut dengan Google
          </button>

          <p className="text-center text-xs text-slate-500 mt-5">
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <button onClick={() => { setMode(mode==="login"?"register":"login"); setError(""); }}
              className="text-amber-400 hover:text-amber-300 font-semibold">
              {mode === "login" ? "Daftar gratis" : "Masuk"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
