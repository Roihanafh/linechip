"use client";

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as AuthService from '../services/authService';
import type { AuthError, UseLoginFormReturn } from '../types';

export function useLoginForm(): UseLoginFormReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const submittingRef = useRef(false);

  const onSubmit = async (email: string, password: string, rememberMe: boolean): Promise<void> => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setErrors({});

    try {
      await AuthService.loginWithEmail(email, password, rememberMe);
      setToast({ message: 'Login berhasil! Selamat datang kembali.', type: 'success' });
      const redirect = searchParams.get('redirect');
      const targetUrl = redirect ? decodeURIComponent(redirect) : '/';
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      } else {
        router.replace(targetUrl);
      }
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

  const onGoogleSubmit = async (): Promise<void> => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setErrors({});

    try {
      await AuthService.loginWithGoogle();
      setToast({ message: 'Login Google berhasil! Selamat datang kembali.', type: 'success' });
      const redirect = searchParams.get('redirect');
      const targetUrl = redirect ? decodeURIComponent(redirect) : '/';
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      } else {
        router.replace(targetUrl);
      }
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr.message) {
        setToast({ message: authErr.message, type: 'error' });
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return {
    onSubmit,
    onGoogleSubmit,
    loading,
    errors,
    toast,
    clearToast: () => setToast(null),
  };
}
