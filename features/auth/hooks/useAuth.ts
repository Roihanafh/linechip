import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../types';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      'useAuth harus digunakan di dalam AuthProvider. ' +
      'Pastikan AuthProvider dipasang di AppShell atau layout.tsx.'
    );
  }
  return ctx;
}
