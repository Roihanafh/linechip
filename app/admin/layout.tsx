import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionCookie } from '@/features/auth/services/firebase.admin';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;

  if (!session) {
    redirect('/login?redirect=/admin');
  }

  try {
    const claims = await verifySessionCookie(session);
    if (claims.role !== 'admin') {
      redirect('/');
    }
  } catch {
    redirect('/login?redirect=/admin');
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
