"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseClient } from '../services/firebase.client';
import { AuthContext } from './AuthContext';
import type { UserProfile, AuthContextValue } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const { auth, db } = getFirebaseClient();
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous profile listener whenever user changes
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (!firebaseUser) {
        // UNAUTHENTICATED state — invariant: user: null → profile must be null
        setState({ user: null, profile: null, loading: false, error: null });
        return;
      }

      // Transitioning to AUTHENTICATED — set user immediately, start profile loading
      setState((prev) => ({ ...prev, user: firebaseUser, loading: true }));

      // Real-time Firestore listener for users/{uid}
      const docRef = doc(db, 'users', firebaseUser.uid);
      profileUnsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            setState({
              user: firebaseUser,
              profile: snap.data() as UserProfile,
              loading: false,
              error: null,
            });
          } else {
            // Profile doesn't exist yet (race condition during registration) — wait, no error
            setState((prev) => ({ ...prev, profile: null, loading: false }));
          }
        },
        (_err) => {
          // Firestore snapshot error — clear profile, surface user-friendly message
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Gagal memuat data profil. Coba muat ulang halaman.',
            profile: null,
          }));
        }
      );
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
