"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FloatingInput } from "@/components/auth/AuthShared";
import { validateCreateUserInput } from "@/lib/admin/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  email: string;
  password: string;
  name: string;
  school: string;
};

type SubmitState = "idle" | "loading" | "success" | "error";

type FieldErrors = Partial<Record<keyof FormState, string>>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateUserForm() {
  const router = useRouter();

  // Form field values
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    name: "",
    school: "",
  });

  // Submission state machine
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  // Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Global (non-field) error banner message
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Email of newly created user (shown in success banner)
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const isLoading = submitState === "loading";

  // ─── Escape key → navigate back ────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/admin/users");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // ─── Per-field change handler ───────────────────────────────────────────────

  const handleChange = useCallback(
    (field: keyof FormState) => (value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ─── onBlur validation ──────────────────────────────────────────────────────

  const handleBlur = useCallback(
    (field: keyof FormState) => () => {
      const result = validateCreateUserInput({
        ...form,
        [field]: form[field],
      });
      setFieldErrors((prev) => ({
        ...prev,
        [field]: result.errors[field],
      }));
    },
    [form]
  );

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Full client-side validation before sending
    const validation = validateCreateUserInput(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setSubmitState("loading");
    setGlobalError(null);
    setFieldErrors({});

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 201) {
        setCreatedEmail(form.email);
        setSubmitState("success");
        setTimeout(() => router.push("/admin/users"), 2000);
      } else if (res.status === 400) {
        const body = await res.json();
        setFieldErrors({ email: body.error });
        setSubmitState("idle");
      } else {
        setGlobalError("Gagal membuat akun. Silakan coba lagi.");
        setSubmitState("error");
      }
    } catch {
      clearTimeout(timeoutId);
      setGlobalError("Terjadi kesalahan. Silakan coba lagi.");
      setSubmitState("error");
    }
  };

  // ─── Derived valid-field flags (for checkmark feedback) ────────────────────

  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && !fieldErrors.email;
  const passwordValid =
    form.password.length >= 6 &&
    form.password.length <= 256 &&
    !fieldErrors.password;
  const nameValid =
    form.name.trim().length >= 1 &&
    form.name.trim().length <= 100 &&
    !fieldErrors.name;
  const schoolValid =
    form.school.trim().length >= 1 &&
    form.school.trim().length <= 100 &&
    !fieldErrors.school;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Page heading */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/admin/users"
            className="text-[#64748b] hover:text-[#2563eb] transition-colors"
            aria-label="Kembali ke daftar pengguna"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              arrow_back
            </span>
          </Link>
          <h1 className="text-[22px] font-bold text-[#0f172a] tracking-tight">
            Buat Pengguna Baru
          </h1>
        </div>
        <p className="text-[14px] text-[#64748b] ml-7">
          Akun baru akan memiliki role{" "}
          <span className="font-semibold text-[#0f172a]">user</span>.
        </p>
      </div>

      {/* ── Info banner (static, Requirements 5.4) ── */}
      <div className="mb-5 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3.5 flex gap-3">
        <span
          className="material-symbols-outlined text-[#2563eb] text-[20px] shrink-0 mt-0.5"
          aria-hidden="true"
        >
          info
        </span>
        <div className="text-[13px] text-[#1e40af] leading-relaxed space-y-1">
          <p>
            <strong>Password sementara</strong> yang Anda atur akan diberikan kepada pengguna
            melalui saluran komunikasi terpisah (mis. pesan/email manual).
          </p>
          <p>
            Sarankan pengguna untuk <strong>mengubah password</strong> setelah login pertama
            melalui menu akun atau fitur "Lupa Kata Sandi".
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Formulir buat pengguna baru"
        className="space-y-4"
      >
        {/* ── Success banner ── */}
        {submitState === "success" && createdEmail && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-3 rounded-xl border border-[#6ee7b7] bg-[#f0fdf4] px-4 py-3.5"
          >
            <span
              className="material-symbols-outlined text-[#10b981] text-[20px] shrink-0 mt-0.5"
              aria-hidden="true"
            >
              check_circle
            </span>
            <div className="text-[13px] text-[#065f46] leading-relaxed">
              <p className="font-semibold">Akun berhasil dibuat!</p>
              <p>
                Pengguna dengan email{" "}
                <strong>{createdEmail}</strong> telah terdaftar. Mengalihkan ke
                daftar pengguna…
              </p>
            </div>
          </div>
        )}

        {/* ── Global error banner ── */}
        {globalError && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-3 rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3.5"
          >
            <span
              className="material-symbols-outlined text-[#f43f5e] text-[20px] shrink-0 mt-0.5"
              aria-hidden="true"
            >
              error
            </span>
            <p className="text-[13px] text-[#be123c] leading-relaxed">{globalError}</p>
          </div>
        )}

        {/* ── Email ── */}
        <div>
          {/*
           * aria-describedby points to a visually-hidden <p> that carries the error ID.
           * FloatingInput renders the visible error with role="alert" internally;
           * the sr-only sibling below provides the accessible description link without
           * double-announcing (it has no role="alert" — the inner one already announces).
           */}
          <FloatingInput
            id="create-user-email"
            label="Alamat Email"
            type="email"
            placeholder="pengguna@sekolah.sch.id"
            value={form.email}
            onChange={handleChange("email")}
            onBlur={handleBlur("email")}
            icon={
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                mail
              </span>
            }
            error={fieldErrors.email}
            valid={emailValid && form.email.length > 0}
            autoComplete="off"
            disabled={isLoading}
            aria-invalid={!!fieldErrors.email}
            aria-describedby="create-user-email-hint"
          />
          <p id="create-user-email-hint" className="sr-only">
            {fieldErrors.email ?? "Masukkan alamat email yang valid."}
          </p>
        </div>

        {/* ── Password ── */}
        <div>
          <FloatingInput
            id="create-user-password"
            label="Password Sementara"
            type={showPassword ? "text" : "password"}
            placeholder="Minimal 6 karakter"
            value={form.password}
            onChange={handleChange("password")}
            onBlur={handleBlur("password")}
            icon={
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                lock
              </span>
            }
            error={fieldErrors.password}
            autoComplete="new-password"
            disabled={isLoading}
            aria-invalid={!!fieldErrors.password}
            aria-describedby="create-user-password-hint"
            rightSlot={
              <div className="flex items-center gap-1.5">
                {passwordValid && form.password.length > 0 && (
                  <span
                    className="material-symbols-outlined text-[16px] text-[#10b981] animate-check-pop"
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                  className="text-[#94a3b8] hover:text-[#475569] transition-colors disabled:opacity-50"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            }
          />
          <p id="create-user-password-hint" className="sr-only">
            {fieldErrors.password ?? "Password harus minimal 6 karakter."}
          </p>
        </div>

        {/* ── Nama Lengkap ── */}
        <div>
          <FloatingInput
            id="create-user-name"
            label="Nama Lengkap"
            type="text"
            placeholder="Muhammad Kevin Al-Farabi"
            value={form.name}
            onChange={handleChange("name")}
            onBlur={handleBlur("name")}
            icon={
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                person
              </span>
            }
            error={fieldErrors.name}
            valid={nameValid && form.name.length > 0}
            autoComplete="off"
            disabled={isLoading}
            aria-invalid={!!fieldErrors.name}
            aria-describedby="create-user-name-hint"
          />
          <p id="create-user-name-hint" className="sr-only">
            {fieldErrors.name ?? "Masukkan nama lengkap pengguna."}
          </p>
        </div>

        {/* ── Sekolah ── */}
        <div>
          <FloatingInput
            id="create-user-school"
            label="Sekolah"
            type="text"
            placeholder="SMPN 1 Jakarta"
            value={form.school}
            onChange={handleChange("school")}
            onBlur={handleBlur("school")}
            icon={
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                school
              </span>
            }
            error={fieldErrors.school}
            valid={schoolValid && form.school.length > 0}
            autoComplete="off"
            disabled={isLoading}
            aria-invalid={!!fieldErrors.school}
            aria-describedby="create-user-school-hint"
          />
          <p id="create-user-school-hint" className="sr-only">
            {fieldErrors.school ?? "Masukkan nama sekolah pengguna."}
          </p>
        </div>

        {/* ── Action row ── */}
        <div className="flex items-center gap-3 pt-2">
          {/* Cancel link */}
          <Link
            href="/admin/users"
            className="flex-1 text-center border border-[#e2e8f0] hover:border-[#cbd5e1] bg-white text-[#475569] hover:text-[#0f172a] font-semibold text-[14px] py-3 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            tabIndex={isLoading ? -1 : 0}
            aria-disabled={isLoading}
          >
            Batal
          </Link>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || submitState === "success"}
            className={`flex-[2] flex items-center justify-center gap-2 font-semibold text-[14px] py-3 rounded-xl text-white transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] ${
              isLoading || submitState === "success"
                ? "bg-[#93c5fd] cursor-not-allowed"
                : "bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.35)] hover:-translate-y-0.5"
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="white"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="white"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Membuat Akun...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  person_add
                </span>
                <span>Buat Akun</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
