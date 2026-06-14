"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase handles the token from URL hash automatically via onAuthStateChange
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Password tidak cocok"); return; }
    if (password.length < 6) { setError("Password minimal 6 karakter"); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else { setDone(true); setTimeout(() => router.push("/dashboard"), 2000); }
    setLoading(false);
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
          {done ? (
            <div className="text-center flex flex-col gap-4">
              <div className="text-4xl">✅</div>
              <h1 className="text-xl font-black text-white" style={{ fontFamily: "Sora,sans-serif" }}>Password diperbarui!</h1>
              <p className="text-sm text-slate-400">Kamu akan diarahkan ke dashboard...</p>
            </div>
          ) : !ready ? (
            <div className="text-center flex flex-col gap-4 py-4">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Memverifikasi link reset...</p>
              <p className="text-xs text-slate-600">Jika lama, coba klik ulang link dari email.</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-black text-white mb-1" style={{ fontFamily: "Sora,sans-serif" }}>Buat password baru</h1>
              <p className="text-xs text-slate-500 mb-6">Masukkan password baru untuk akunmu.</p>

              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300 mb-4">{error}</div>}

              <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password Baru</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" minLength={6}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Konfirmasi Password</label>
                  <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" minLength={6}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 transition-colors" />
                </div>
                <button type="submit" disabled={loading}
                  className="mt-2 bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <span className="w-4 h-4 border-2 border-[#0c0e14]/40 border-t-[#0c0e14] rounded-full animate-spin" /> : "Simpan Password Baru"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
