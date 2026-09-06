// app/login/LoginClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Toast, FloatingInput } from "@/components/auth/AuthShared";
import { LoginRightPanel } from "@/components/auth/LoginRightPanel";

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const isReady = emailValid && passwordValid;

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Alamat email wajib diisi.";
    else if (!emailValid) e.email = "Format email tidak valid.";
    if (!password) e.password = "Kata sandi wajib diisi.";
    else if (!passwordValid) e.password = "Kata sandi minimal 6 karakter.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setToast({ type: "success", msg: "Login berhasil! Selamat datang kembali." });
  };

  const btnClass = (isReady && !loading)
    ? "bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
    : "bg-[#93c5fd] cursor-not-allowed";

  return (
    <div className="flex-1 min-h-screen flex flex-col lg:flex-row bg-[#f8fafc] overflow-auto lg:overflow-hidden lg:h-screen">
      {toast && <Toast type={toast.type} msg={toast.msg} onDismiss={() => setToast(null)} />}

      {/* LEFT: form */}
      <div className="flex flex-col items-center justify-center px-5 py-10 sm:px-8 lg:px-12 w-full lg:w-[460px] xl:w-[500px] shrink-0 lg:overflow-y-auto lg:h-full">
        <div className="w-full max-w-sm">
          {/* Brand badge */}
          <div
            className="rise-in flex items-center gap-2.5 mb-7"
            style={{ "--d": "0s" } as React.CSSProperties}
          >
            <div className="bg-[#2563eb] rounded-lg w-9 h-9 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.3)] soft-bob">
              <span className="material-symbols-outlined text-white text-[18px]" aria-hidden="true">calculate</span>
            </div>
            <span className="font-mono font-bold text-[11px] tracking-[1.1px] text-[#2563eb] uppercase">
              LINECHIP ID ACCESS
            </span>
          </div>

          <h1
            className="rise-in font-semibold text-[30px] leading-[1.25] tracking-[-0.8px] text-[#0f172a] mb-2"
            style={{ "--d": "0.08s" } as React.CSSProperties}
          >
            Selamat Datang Kembali
          </h1>
          <p
            className="rise-in text-[14px] text-[#64748b] mb-7 leading-relaxed"
            style={{ "--d": "0.16s" } as React.CSSProperties}
          >
            Masuk untuk melanjutkan petualangan matematika interaktifmu.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4 rise-in"
            style={{ "--d": "0.24s" } as React.CSSProperties}
          >
            <FloatingInput
              id="login-email"
              label="Alamat Email"
              type="email"
              placeholder="nama@sekolah.sch.id"
              value={email}
              onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: undefined })); }}
              icon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span>}
              error={errors.email}
              valid={emailValid && !errors.email}
              autoComplete="email"
            />

            <FloatingInput
              id="login-password"
              label="Kata Sandi"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: undefined })); }}
              icon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">lock</span>}
              error={errors.password}
              autoComplete="current-password"
              rightSlot={
                <div className="flex items-center gap-1.5">
                  {passwordValid && !errors.password && (
                    <span className="material-symbols-outlined text-[16px] text-[#10b981] animate-check-pop" aria-hidden="true">
                      check_circle
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#94a3b8] hover:text-[#475569] transition-colors"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              }
            />

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center shrink-0 transition-all duration-200 ${
                    rememberMe
                      ? "bg-[#2563eb] border-[#2563eb]"
                      : "bg-white border-[#cbd5e1] group-hover:border-[#2563eb]"
                  }`}
                  aria-hidden="true"
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 12 10" fill="none" className="animate-check-pop">
                      <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="sr-only"
                />
                <span className="text-[13px] text-[#475569]">Ingat saya 30 hari</span>
              </label>

              <button
                type="button"
                className="text-[13px] text-[#2563eb] hover:text-[#1d4ed8] transition-colors underline underline-offset-2 decoration-[#bfdbfe]"
              >
                Lupa Kata Sandi?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`relative w-full text-white font-semibold text-[15px] py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${btnClass}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#e2e8f0]" />
            <span className="font-mono text-[10px] text-[#94a3b8] tracking-[0.88px] uppercase">
              ATAU MASUK DENGAN
            </span>
            <div className="flex-1 h-px bg-[#e2e8f0]" />
          </div>

          {/* Google */}
          <button
            type="button"
            className="w-full border border-[#e2e8f0] hover:border-[#2563eb] bg-white hover:bg-[#eff6ff] rounded-xl py-3 flex items-center justify-center gap-3 transition-all duration-200 shadow-sm active:scale-[0.98] group"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.1-10.3 7.1-17.2z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.8-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.8v6.2C6.6 42.6 14.7 48 24 48z" />
              <path fill="#FBBC05" d="M10.8 28.8c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.3v-6.2H2.8C1 17.4 0 20.6 0 24s1 6.6 2.8 9.1l8-6.3z" />
              <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.5 30.4 0 24 0 14.7 0 6.6 5.4 2.8 14.2l8 6.2C12.7 14 17.9 9.5 24 9.5z" />
            </svg>
            <span className="text-[14px] text-[#334155] group-hover:text-[#1d4ed8] transition-colors">
              Masuk dengan Akun Google
            </span>
          </button>

          <p className="text-center text-[14px] text-[#64748b] mt-5">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors underline underline-offset-2 decoration-[#bfdbfe]"
            >
              Daftar gratis di sini
            </Link>
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-[#94a3b8]">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">verified_user</span>
            <span className="font-mono text-[10px] tracking-[0.5px] uppercase">
              Koneksi terenkripsi SSL/TLS
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: visual panel */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#eff6ff] via-[#f8fafc] to-[#fff1f2]"
        aria-hidden="true"
      >
        <div className="absolute top-[-60px] right-[-40px] w-80 h-80 bg-blue-200/30 rounded-full blur-3xl float-drift" />
        <div className="absolute bottom-[-60px] left-[-40px] w-72 h-72 bg-rose-200/20 rounded-full blur-3xl float-drift-slow" />
        <LoginRightPanel />
      </div>
    </div>
  );
}
