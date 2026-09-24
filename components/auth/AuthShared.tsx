// components/auth/AuthShared.tsx
// Shared client components used by Login and Register pages.
"use client";

import { useState, useEffect } from "react";

// ─── Toast ─────────────────────────────────────────────────────────────────

interface ToastProps {
  type: "success" | "error";
  msg: string;
  onDismiss: () => void;
}

export function Toast({ type, msg, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed top-5 left-1/2 z-50 animate-slide-in-down"
      style={{ transform: "translateX(-50%)" }}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-['Plus_Jakarta_Sans',sans-serif] ${
          type === "success"
            ? "bg-[#0f172a] border-[#1e293b] text-white"
            : "bg-[#fff1f2] border-[#fecdd3] text-[#be123c]"
        }`}
      >
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[13px] animate-check-pop ${
            type === "success" ? "bg-[#2563eb] text-white" : "bg-[#f43f5e] text-white"
          }`}
          aria-hidden
        >
          {type === "success" ? "✓" : "✗"}
        </span>
        {msg}
        <button
          onClick={onDismiss}
          className="ml-2 opacity-50 hover:opacity-100 transition-opacity text-[16px] leading-none"
          aria-label="Tutup notifikasi"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── FloatingInput ──────────────────────────────────────────────────────────

interface FloatingInputProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  icon: React.ReactNode;
  error?: string;
  rightSlot?: React.ReactNode;
  valid?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export function FloatingInput({
  id, label, type, placeholder, value, onChange, onBlur, icon,
  error, rightSlot, valid, autoComplete, disabled,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedby,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="space-y-1">
      <div className="relative">
        {/* Left icon */}
        <span
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            focused ? "text-[#2563eb]" : "text-[#94a3b8]"
          }`}
          aria-hidden
        >
          {icon}
        </span>

        {/* Floating label */}
        <label
          htmlFor={id}
          className={`absolute left-10 transition-all duration-200 pointer-events-none font-['Plus_Jakarta_Sans',sans-serif] font-medium ${
            lifted
              ? `text-[10px] top-2 tracking-[0.4px] ${
                  error ? "text-[#f43f5e]" : focused ? "text-[#2563eb]" : "text-[#64748b]"
                }`
              : "text-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]"
          }`}
        >
          {label}
        </label>

        <input
          id={id}
          type={type}
          placeholder={lifted ? placeholder : ""}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={`w-full pt-5 pb-2 pl-10 ${rightSlot ? "pr-10" : "pr-4"} text-[14px] font-['Plus_Jakarta_Sans',sans-serif] bg-white border rounded-xl outline-none transition-all duration-200 text-[#0f172a] shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-[#f43f5e] focus:ring-2 focus:ring-rose-100"
              : focused
              ? "border-[#2563eb] ring-2 ring-blue-100 shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
              : valid
              ? "border-[#10b981]"
              : "border-[#e2e8f0] hover:border-[#cbd5e1]"
          }`}
        />

        {/* Right slot */}
        {rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}

        {/* Valid checkmark (only when no rightSlot) */}
        {valid && !error && !rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#10b981] animate-check-pop" aria-hidden>
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </span>
        )}
      </div>

      {error && (
        <p
          className="flex items-center gap-1 text-[#f43f5e] text-[12px] font-['Plus_Jakarta_Sans',sans-serif] animate-fade-slide-in"
          role="alert"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden>error</span>
          {error}
        </p>
      )}
    </div>
  );
}
