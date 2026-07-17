import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata = {
  title: 'Admin — Badirty',
  description: 'Tableau de bord administrateur Badirty',
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect('/');
  }

  return <AdminDashboard />;
}
