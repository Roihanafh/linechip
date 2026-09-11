"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as AuthService from '../services/authService';
import type { AuthError, UseRegisterFormReturn } from '../types';

/** Basic email format validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function useRegisterForm(): UseRegisterFormReturn {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const submittingRef = useRef(false);

  const onSubmit = async (
    name: string,
    email: string,
    password: string,
    school: string
  ): Promise<void> => {
    if (submittingRef.current) return;

    // Client-side validation first
    const validationErrors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 100) {
      validationErrors.name = 'Nama harus diisi (1–100 karakter).';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      validationErrors.email = 'Format email tidak valid.';
    }

    if (!password || password.length < 6) {
      validationErrors.password = 'Kata sandi minimal 6 karakter.';
    }

    const trimmedSchool = school.trim();
    if (!trimmedSchool || trimmedSchool.length < 1 || trimmedSchool.length > 200) {
      validationErrors.school = 'Nama sekolah harus diisi (1–200 karakter).';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return; // Don't call AuthService with invalid data
    }

    submittingRef.current = true;
    setLoading(true);
    setErrors({});

    try {
      await AuthService.registerWithEmail(name, email, password, school);
      setToast({
        message: 'Akun berhasil dibuat! Cek email untuk verifikasi.',
        type: 'success',
      });
      router.replace('/login');
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr.field) {
        setErrors({ [authErr.field]: authErr.message });
      } else {
        setToast({ message: authErr.message ?? 'Terjadi kesalahan.', type: 'error' });
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return {
    onSubmit,
    loading,
    errors,
    toast,
    clearToast: () => setToast(null),
  };
}
