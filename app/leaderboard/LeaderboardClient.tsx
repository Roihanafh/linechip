'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { fetchTop10, fetchCurrentUserEntry } from '@/features/leaderboard';
import type { LeaderboardEntry } from '@/features/leaderboard';

import LeaderboardSkeleton from './LeaderboardSkeleton';
import Podium from './Podium';
import LeaderboardTable from './LeaderboardTable';
import OwnRankCard from './OwnRankCard';
import PlayCTACard from './PlayCTACard';

interface LeaderboardState {
  top10: LeaderboardEntry[];
  currentEntry: LeaderboardEntry | null;
  loadingTop10: boolean;
  loadingCurrentUser: boolean;
  error: string | null;
}

export default function LeaderboardClient() {
  const { user, profile, loading: authLoading } = useAuth();

  const [state, setState] = useState<LeaderboardState>({
    top10: [],
    currentEntry: null,
    loadingTop10: true,
    loadingCurrentUser: false,
    error: null,
  });

  // Fetch top10 — callable for initial load and "Coba Lagi" retry
  const loadTop10 = useCallback(async () => {
    setState((prev) => ({ ...prev, loadingTop10: true, error: null }));
    try {
      const entries = await fetchTop10();
      setState((prev) => ({ ...prev, top10: entries, loadingTop10: false }));
    } catch {
      setState((prev) => ({
        ...prev,
        loadingTop10: false,
        error: 'Gagal memuat data leaderboard. Periksa koneksi internetmu.',
      }));
    }
  }, []);

  // Fetch current user rank — silent failure (no global error)
  const loadCurrentUser = useCallback(
    async (uid: string, totalScore: number) => {
      setState((prev) => ({ ...prev, loadingCurrentUser: true }));
      try {
        const entry = await fetchCurrentUserEntry(uid, totalScore);
        setState((prev) => ({ ...prev, currentEntry: entry, loadingCurrentUser: false }));
      } catch {
        // Silent — don't surface an error for the current-user rank query
        setState((prev) => ({ ...prev, currentEntry: null, loadingCurrentUser: false }));
      }
    },
    []
  );

  // Run both fetches in parallel once auth is resolved
  useEffect(() => {
    if (authLoading) return;

    const uid = user?.uid ?? null;
    const totalScore = profile?.totalScore ?? 0;
    const hasScore = totalScore > 0;

    // Always fetch top10
    loadTop10();

    // Only fetch current-user entry when logged in and has a score
    if (uid !== null && hasScore) {
      loadCurrentUser(uid, totalScore);
    } else {
      // Ensure currentEntry is cleared when user logs out / has no score
      setState((prev) => ({ ...prev, currentEntry: null, loadingCurrentUser: false }));
    }
  // Re-run when auth status or user's score changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.uid, profile?.totalScore]);

  // Show full skeleton while auth state is still resolving or top10 is loading
  if (authLoading || state.loadingTop10) {
    return <LeaderboardSkeleton />;
  }

  const uid = user?.uid ?? null;
  const totalScore = profile?.totalScore ?? 0;
  const showPlayCTA = uid === null || !totalScore;
  const showOwnRankCard =
    state.currentEntry !== null && state.currentEntry.rank > 10;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* ── Page heading ──────────────────────────────────────────────────── */}
      <div className="text-center">
        <h1
          className="text-3xl font-bold text-slate-800"
          style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
        >
          Papan Peringkat
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Siapa yang paling jago? Cek posisimu sekarang!
        </p>
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="flex-1 text-sm text-red-700">{state.error}</p>
          <button
            onClick={loadTop10}
            className="shrink-0 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors rounded-lg px-4 py-2"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* ── Podium ────────────────────────────────────────────────────────── */}
      {!state.error && state.top10.length > 0 && (
        <section aria-labelledby="heading-podium">
          <h2
            id="heading-podium"
            className="sr-only"
          >
            Tiga Besar
          </h2>
          <Podium entries={state.top10.slice(0, 3)} />
        </section>
      )}

      {/* ── Leaderboard table ─────────────────────────────────────────────── */}
      {!state.error && (
        <section aria-labelledby="heading-table">
          <h2
            id="heading-table"
            className="mb-3 text-lg font-semibold text-slate-700"
            style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
          >
            Peringkat 1–10
          </h2>
          <LeaderboardTable entries={state.top10} currentUid={uid} />
        </section>
      )}

      {/* ── Own rank / Play CTA ───────────────────────────────────────────── */}
      {showOwnRankCard && state.currentEntry && (
        <OwnRankCard entry={state.currentEntry} />
      )}

      {showPlayCTA && <PlayCTACard />}
    </main>
  );
}
