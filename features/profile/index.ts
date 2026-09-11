// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useProfile } from './hooks/useProfile';
export { useAccountDropdown } from './hooks/useAccountDropdown';

// ─── Profile Service ──────────────────────────────────────────────────────────
export {
  validateUid,
  validateProfileText,
  updateProfile,
  sendPasswordResetWithFeedback,
  formatDate,
} from './services/profileService';

// ─── Storage Service ──────────────────────────────────────────────────────────
export {
  validateMimeType,
  validateFileSize,
  buildStoragePath,
  uploadPhoto,
  getStorageErrorMessage,
} from './services/storageService';

// ─── Provider Utils ───────────────────────────────────────────────────────────
export {
  getAuthProvider,
  getInitials,
  getProviderLabel,
} from './utils/providerUtils';
export type { AuthProvider } from './utils/providerUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  ProfileUpdatePayload,
  PhotoUploadResult,
  ProfileError,
  AsyncStatus,
  ProfileOperationState,
  UseProfileReturn,
  UseAccountDropdownReturn,
} from './types';
