// app/admin/page.tsx
// Server Component: fetch /api/admin/stats and pass initialData to OverviewClient.
import { cookies, headers } from 'next/headers';
import OverviewClient from '@/components/admin/OverviewClient';

interface AdminTop10Entry {
  uid: string;
  name: string;
  school: string;
  totalScore: number;
}

export interface AdminStatsData {
  totalUsers: number;
  activeUsers: number;
  topScore: number;
  disabledAccounts: number;
  top10: AdminTop10Entry[];
}

export default async function AdminOverviewPage() {
  let initialData: AdminStatsData | null = null;
  let initialError: string | null = null;

  try {
    // Build the absolute URL for the internal API call.
    // headers() gives us the host used by the incoming request.
    const requestHeaders = await headers();
    const host = requestHeaders.get('host') ?? 'localhost:3000';
    const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Forward the session cookie so withAdminAuth can authenticate.
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      cache: 'no-store',
      headers: sessionCookie
        ? { Cookie: `__session=${sessionCookie}` }
        : {},
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Gagal memuat data statistik.');
    }

    initialData = (await res.json()) as AdminStatsData;
  } catch (err) {
    console.error('[AdminOverviewPage] Error fetching stats:', err);
    initialError = 'Gagal memuat data statistik.';
  }

  return <OverviewClient initialData={initialData} initialError={initialError} />;
}
