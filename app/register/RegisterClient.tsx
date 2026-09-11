// app/register/RegisterClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Toast, FloatingInput } from "@/components/auth/AuthShared";
import { RegisterRightPanel } from "@/components/auth/RegisterRightPanel";
import { useRegisterForm } from "@/features/auth";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Lemah", color: "bg-[#f43f5e]" },
    { label: "Sedang", color: "bg-[#f59e0b]" },
    { label: "Kuat", color: "bg-[#2563eb]" },
    { label: "Sangat Kuat", color: "bg-[#10b981]" },
  ];
  return { score, ...levels[Math.max(0, score - 1)] };
}

export function RegisterClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { onSubmit, loading, errors, toast, clearToast } = useRegisterForm();

  const strength = getPasswordStrength(password);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearErr = (_key: string) => { /* errors are managed by useRegisterForm */ };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name, email, password, school);
  };

  const isValid =
    name.length > 0 && email.length > 0 &&
    password.length >= 8 && confirmPassword === password && agreed;

  const steps = [
    { label: "Identitas", done: name.length > 0 && email.length > 0 },
    { label: "Keamanan", done: password.length >= 8 && confirmPassword === password },
    { label: "Persetujuan", done: agreed },
  ];
  const progressCount = steps.filter((s) => s.done).length;

  const btnClass = (isValid && !loading)
    ? "bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
    : "bg-[#93c5fd] cursor-not-allowed";

  return (
    <div className="flex-1 min-h-screen flex flex-col lg:flex-row bg-[#f8fafc] overflow-auto lg:overflow-hidden lg:h-screen">
      {toast && <Toast type={toast.type} msg={toast.message} onDismiss={clearToast} />}

      {/* LEFT: form */}
      <div className="flex-1 flex flex-col px-5 py-8 sm:px-8 lg:px-12 overflow-y-auto lg:h-full">
        {/* Brand icon */}
        <div
          className="mb-7 rise-in"
          style={{ "--d": "0s" } as React.CSSProperties}
        >
          <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.3)] soft-bob">
            <span className="font-mono font-bold text-white text-[14px]">LC</span>
          </div>
        </div>

        <div className="max-w-xl w-full">
          {/* Badge */}
          <div
            className="rise-in inline-flex items-center gap-2 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-3.5 py-1.5 mb-3"
            style={{ "--d": "0.08s" } as React.CSSProperties}
          >
            <svg width="14" height="15" viewBox="0 0 14.6667 14.6667" fill="none" aria-hidden="true">
              <path
                d="M12 5.33333L11.1667 3.5L9.33333 2.66667L11.1667 1.83333L12 0L12.8333 1.83333L14.6667 2.66667L12.8333 3.5L12 5.33333V5.33333M12 14.6667L11.1667 12.8333L9.33333 12L11.1667 11.1667L12 9.33333L12.8333 11.1667L14.6667 12L12.8333 12.8333L12 14.6667V14.6667M5.33333 12.6667L3.66667 9L0 7.33333L3.66667 5.66667L5.33333 2L7 5.66667L10.6667 7.33333L7 9L5.33333 12.6667V12.6667"
                fill="#2563EB"
              />
            </svg>
            <span className="font-mono font-bold text-[11px] tracking-[0.55px] text-[#1d4ed8] uppercase">
              REGISTRASI AKUN SISWA
            </span>
          </div>

          <h1
            className="rise-in font-bold text-[30px] leading-[1.25] tracking-[-0.8px] text-[#0f172a] mb-2"
            style={{ "--d": "0.14s" } as React.CSSProperties}
          >
            Mulai Petualangan Belajar
          </h1>
          <p
            className="rise-in text-[15px] text-[#475569] mb-5 leading-relaxed"
            style={{ "--d": "0.2s" } as React.CSSProperties}
          >
            Daftarkan akun LineChip dan taklukkan konsep bilangan bulat lewat simulasi &amp; game seru.
          </p>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 transition-all duration-300 ${s.done ? "opacity-100" : "opacity-40"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] transition-all duration-300 ${s.done ? "bg-[#2563eb] text-white" : "bg-[#e2e8f0] text-[#94a3b8]"}`}>
                      {s.done ? (
                        <span className="material-symbols-outlined text-[12px]" aria-hidden="true">check</span>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.5px] text-[#64748b] uppercase hidden sm:block">
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-8 h-px bg-[#e2e8f0] mx-1" aria-hidden="true" />
                  )}
                </div>
              ))}
              <span className="ml-auto font-mono text-[10px] tracking-[0.5px] text-[#94a3b8]">
                {progressCount}/{steps.length} langkah
              </span>
            </div>
            <div
              className="h-1 bg-[#e2e8f0] rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressCount}
              aria-valuemin={0}
              aria-valuemax={steps.length}
            >
              <div
                className="h-full bg-[#2563eb] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(progressCount / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name */}
            <FloatingInput
              id="reg-name"
              label="Nama Lengkap"
              type="text"
              placeholder="Muhammad Kevin Al-Farabi"
              value={name}
              onChange={(v) => { setName(v); clearErr("name"); }}
              icon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">person</span>}
              error={errors.name}
              valid={name.trim().length > 0 && !errors.name}
              autoComplete="name"
            />

            {/* Email + School grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatingInput
                id="reg-email"
                label="Alamat Email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(v) => { setEmail(v); clearErr("email"); }}
                icon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span>}
                error={errors.email}
                valid={email.trim().length > 0 && !errors.email}
                autoComplete="email"
              />
              <FloatingInput
                id="reg-school"
                label="Kelas & Sekolah"
                type="text"
                placeholder="Kelas 7 / SMPN 1 Jakarta"
                value={school}
                onChange={setSchool}
                icon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">school</span>}
                error={errors.school}
                valid={school.trim().length > 0 && !errors.school}
                autoComplete="organization"
              />
            </div>

            {/* Password + Confirm grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatingInput
                id="reg-password"
                label="Kata Sandi"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(v) => { setPassword(v); clearErr("password"); }}
                icon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">lock</span>}
                error={errors.password}
                autoComplete="new-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#94a3b8] hover:text-[#475569] transition-colors"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                }
              />
              <FloatingInput
                id="reg-confirm"
                label="Konfirmasi Kata Sandi"
                type={showConfirm ? "text" : "password"}
                placeholder="Ulangi kata sandi"
                value={confirmPassword}
                onChange={(v) => { setConfirmPassword(v); clearErr("confirm"); }}
                icon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">lock_reset</span>}
                error={errors.confirm}
                valid={confirmPassword.length > 0 && confirmPassword === password && !errors.confirm}
                autoComplete="new-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-[#94a3b8] hover:text-[#475569] transition-colors"
                    aria-label={showConfirm ? "Sembunyikan konfirmasi" : "Tampilkan konfirmasi"}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      {showConfirm ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                }
              />
            </div>

            {/* Password strength */}
            {password && (
              <div className="animate-fade-slide-in">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] tracking-[0.88px] text-[#64748b] uppercase">
                    KEKUATAN SANDI
                  </span>
                  <span
                    className={`font-mono font-bold text-[10px] tracking-[0.88px] ${
                      strength.score >= 3
                        ? "text-[#10b981]"
                        : strength.score === 2
                        ? "text-[#2563eb]"
                        : "text-[#f43f5e]"
                    }`}
                  >
                    {strength.label}
                  </span>
                </div>
                <div className="flex gap-1.5 h-[5px]">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.score ? strength.color : "bg-[#e2e8f0]"
                      }`}
                    />
                  ))}
                </div>
                {strength.score < 4 && (
                  <p className="mt-1.5 text-[11px] text-[#94a3b8]">
                    {strength.score === 1 && "Tambahkan huruf besar, angka, atau simbol."}
                    {strength.score === 2 && "Sedikit lagi — coba tambahkan angka atau simbol."}
                    {strength.score === 3 && "Hampir sempurna! Tambahkan simbol untuk memperkuat."}
                  </p>
                )}
              </div>
            )}

            {/* Terms checkbox */}
            <div>
              <label className="flex items-start gap-3 pt-1 cursor-pointer group">
                <div
                  className={`mt-0.5 w-[18px] h-[18px] rounded-[4px] border shrink-0 flex items-center justify-center transition-all duration-200 ${
                    agreed
                      ? "bg-[#2563eb] border-[#2563eb]"
                      : "bg-white border-[#cbd5e1] group-hover:border-[#2563eb]"
                  }`}
                  aria-hidden="true"
                  onClick={() => { setAgreed(!agreed); clearErr("agreed"); }}
                >
                  {agreed && (
                    <svg width="10" height="8" viewBox="0 0 12 10" fill="none" className="animate-check-pop">
                      <path
                        d="M1 5l3.5 3.5L11 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={() => { setAgreed(!agreed); clearErr("agreed"); }}
                  className="sr-only"
                />
                <span className="text-[13px] text-[#475569] leading-relaxed">
                  Saya menyetujui{" "}
                  <span className="text-[#2563eb] underline underline-offset-2 decoration-[#bfdbfe]">
                    Ketentuan Layanan
                  </span>
                  {" "}dan{" "}
                  <span className="text-[#2563eb] underline underline-offset-2 decoration-[#bfdbfe]">
                    Kebijakan Privasi
                  </span>
                  {" "}LineChip.
                </span>
              </label>
              {errors.agreed && (
                <p
                  className="flex items-center gap-1 text-[#f43f5e] text-[12px] mt-1.5 ml-7 animate-fade-slide-in"
                  role="alert"
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                  {errors.agreed}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-semibold text-[15px] py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${btnClass}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                <>
                  <span>Daftar Akun Sekarang</span>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <span className="text-[13px] text-[#64748b]">Sudah punya akun?{" "}</span>
              <Link
                href="/login"
                className="font-semibold text-[#2563eb] text-[13px] hover:text-[#1d4ed8] transition-colors underline underline-offset-2 decoration-[#bfdbfe]"
              >
                Masuk di sini
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT: visual panel */}
      <div
        className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#eff6ff] via-[#f8fafc] to-[#fff1f2]"
        style={{ width: "40%" }}
        aria-hidden="true"
      >
        <div className="absolute top-[-40px] right-[-40px] w-72 h-72 bg-blue-200/30 rounded-full blur-3xl float-drift" />
        <div className="absolute bottom-[-40px] left-[-40px] w-64 h-64 bg-rose-200/20 rounded-full blur-3xl float-drift-slow" />
        <RegisterRightPanel />
      </div>
    </div>
  );
}
