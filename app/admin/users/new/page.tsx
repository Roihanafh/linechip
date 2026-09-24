import type { Metadata } from 'next';
import CreateUserForm from '@/components/admin/CreateUserForm';

export const metadata: Metadata = {
  title: 'Buat Pengguna Baru',
};

export default function NewUserPage() {
  return <CreateUserForm />;
}
