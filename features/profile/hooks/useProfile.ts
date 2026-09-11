import { useState, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import {
  validateMimeType,
  validateFileSize,
  uploadPhoto,
} from '../services/storageService';
import {
  validateProfileText,
  updateProfile,
  sendPasswordResetWithFeedback,
} from '../services/profileService';
import { compressImage } from '../utils/imageUtils';
import { getAuthProvider } from '../utils/providerUtils';
import type {
  UseProfileReturn,
  AsyncStatus,
  ProfileError,
} from '../types';

export function useProfile(): UseProfileReturn {
  const { user, profile } = useAuth();

  // ── Edit mode state ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ name: '', school: '' });
  const [editErrors, setEditErrors] = useState<{ name?: string; school?: string }>({});

  // ── Async operation status ───────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<AsyncStatus>('idle');
  const [uploadStatus, setUploadStatus] = useState<AsyncStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<AsyncStatus>('idle');

  // ── Toast state ──────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  // ── Auth provider ────────────────────────────────────────────────────────
  const authProvider = user ? getAuthProvider(user) : 'unknown';

  // ── Actions ──────────────────────────────────────────────────────────────

  const startEdit = useCallback(() => {
    setEditValues({
      name: profile?.name ?? '',
      school: profile?.school ?? '',
    });
    setEditErrors({});
    setIsEditing(true);
  }, [profile]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditErrors({});
  }, []);

  const setEditField = useCallback((field: 'name' | 'school', value: string) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || !profile) return;

    const errors = validateProfileText({
      name: editValues.name,
      school: editValues.school,
    });

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors as { name?: string; school?: string });
      return;
    }

    setSaveStatus('loading');
    try {
      await updateProfile(user.uid, {
        name: editValues.name,
        school: editValues.school,
      });
      setSaveStatus('success');
      setIsEditing(false);
      setEditErrors({});
      setToast({ message: 'Profil berhasil diperbarui.', type: 'success' });
    } catch (err) {
      setSaveStatus('error');
      const profileErr = err as ProfileError;
      setToast({
        message: profileErr.message ?? 'Gagal memperbarui profil. Coba lagi.',
        type: 'error',
      });
      // editValues dipertahankan — user dapat mencoba lagi
    }
  }, [user, profile, editValues]);

  const handlePhotoSelect = useCallback(async (file: File) => {
    if (!user) return;

    // 1. Validasi MIME type
    try {
      validateMimeType(file.type);
    } catch (err) {
      const profileErr = err as ProfileError;
      setToast({ message: profileErr.message, type: 'error' });
      return;
    }

    // 2. Validasi ukuran file
    try {
      validateFileSize(file.size);
    } catch (err) {
      const profileErr = err as ProfileError;
      setToast({ message: profileErr.message, type: 'error' });
      return;
    }

    setUploadStatus('loading');
    setUploadProgress(0);

    try {
      // 3. Kompres gambar
      const blob = await compressImage(file);

      // 4. Upload ke Storage dengan progress callback
      const result = await uploadPhoto(user.uid, blob, (percent) => {
        setUploadProgress(percent);
      });

      // 5. Perbarui photoURL di Firestore
      await updateProfile(user.uid, { photoURL: result.downloadURL });

      setUploadStatus('success');
      setUploadProgress(100);
      setToast({ message: 'Foto profil berhasil diperbarui.', type: 'success' });
    } catch (err) {
      setUploadStatus('error');
      const profileErr = err as ProfileError;
      setToast({
        message: profileErr.message ?? 'Gagal mengupload foto. Coba lagi.',
        type: 'error',
      });
    }
  }, [user]);

  const handleResetPassword = useCallback(async () => {
    if (!profile?.email) return;

    setResetPasswordStatus('loading');
    try {
      await sendPasswordResetWithFeedback(profile.email);
      setResetPasswordStatus('success');
      setToast({
        message: 'Email reset kata sandi telah dikirim.',
        type: 'success',
      });
    } catch (err) {
      setResetPasswordStatus('error');
      const profileErr = err as ProfileError;
      setToast({
        message: profileErr.message ?? 'Gagal mengirim email reset. Coba lagi.',
        type: 'error',
      });
    }
  }, [profile]);

  return {
    // Data
    profile,
    authProvider,

    // Edit mode
    isEditing,
    editValues,
    editErrors,

    // Operations
    saveStatus,
    uploadStatus,
    uploadProgress,
    resetPasswordStatus,

    // Actions
    startEdit,
    cancelEdit,
    setEditField,
    handleSave,
    handlePhotoSelect,
    handleResetPassword,

    // Toast
    toast,
    clearToast,
  };
}
