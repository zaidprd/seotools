"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
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
            <span className="text-white">Artikel</span><span className="text-amber-400"> SEO</span>
          </span>
        </a>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-7 backdrop-blur">
          {sent ? (
            <div className="text-center flex flex-col gap-4">
              <div className="text-4xl">📧</div>
              <h1 className="text-xl font-black text-white" style={{ fontFamily: "Sora,sans-serif" }}>Email terkirim!</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Cek inbox <span className="text-white font-semibold">{email}</span> dan klik link reset password. Cek folder spam jika tidak muncul.
              </p>
              <a href="/login" className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition-colors">← Kembali ke Login</a>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-black text-white mb-1" style={{ fontFamily: "Sora,sans-serif" }}>Lupa password?</h1>
              <p className="text-xs text-slate-500 mb-6">Masukkan email akun kamu, kami kirim link reset password.</p>

              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300 mb-4">{error}</div>}

              <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="kamu@email.com"
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 transition-colors" />
                </div>
                <button type="submit" disabled={loading}
                  className="mt-2 bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <span className="w-4 h-4 border-2 border-[#0c0e14]/40 border-t-[#0c0e14] rounded-full animate-spin" /> : "Kirim Link Reset"}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 mt-5">
                Ingat password? <a href="/login" className="text-amber-400 hover:text-amber-300 font-semibold">Masuk</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
