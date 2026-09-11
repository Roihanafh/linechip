import type { RefObject } from 'react';
import type { UserProfile } from '@/features/auth/types';

/**
 * Payload yang dikirim ke ProfileService.updateProfile.
 * Hanya field yang diizinkan: name, school, photoURL.
 */
export interface ProfileUpdatePayload {
  name?: string;
  school?: string;
  photoURL?: string;
}

/**
 * Hasil upload foto profil dari StorageService.
 */
export interface PhotoUploadResult {
  downloadURL: string;
  storagePath: string; // 'profile-photos/{uid}/avatar'
  uploadedAt: Date;
}

/**
 * Error terstruktur dari Profile Module.
 */
export interface ProfileError {
  code: string; // e.g. 'storage/unauthorized', 'validation/name-too-long'
  message: string; // Pesan Bahasa Indonesia siap tampil
  field?: 'name' | 'school' | 'photoURL';
}

/**
 * State untuk operasi async di useProfile.
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * State lengkap untuk operasi async profil.
 */
export interface ProfileOperationState {
  status: AsyncStatus;
  error: string | null;
  progress?: number;
}

/**
 * Return type dari useProfile hook.
 */
export interface UseProfileReturn {
  // Data (read from AuthContext)
  profile: UserProfile | null;
  authProvider: 'password' | 'google.com' | 'unknown';

  // Edit mode
  isEditing: boolean;
  editValues: { name: string; school: string };
  editErrors: { name?: string; school?: string };

  // Operations
  saveStatus: AsyncStatus;
  uploadStatus: AsyncStatus;
  uploadProgress: number;
  resetPasswordStatus: AsyncStatus;

  // Actions
  startEdit: () => void;
  cancelEdit: () => void;
  setEditField: (field: 'name' | 'school', value: string) => void;
  handleSave: () => Promise<void>;
  handlePhotoSelect: (file: File) => Promise<void>;
  handleResetPassword: () => Promise<void>;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null;
  clearToast: () => void;
}

/**
 * Return type dari useAccountDropdown hook.
 */
export interface UseAccountDropdownReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isLoggingOut: boolean;
  handleLogout: () => Promise<void>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  dropdownRef: RefObject<HTMLDivElement | null>;
}
