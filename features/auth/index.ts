// Public hooks
export { useAuth } from './hooks/useAuth';
export { useLoginForm } from './hooks/useLoginForm';
export { useRegisterForm } from './hooks/useRegisterForm';

// Provider (for AppShell integration)
export { AuthProvider } from './context/AuthProvider';

// Types
export type {
  UserProfile,
  AuthUser,
  AuthContextValue,
  AuthError,
  UseLoginFormReturn,
  UseRegisterFormReturn,
  DecodedSessionClaims,
  UpdatableUserProfile,
} from './types';
