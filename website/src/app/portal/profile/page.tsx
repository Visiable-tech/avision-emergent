import type { Metadata } from 'next';
import { Mail, Phone, User, GraduationCap } from 'lucide-react';
import { fetchMe } from '@/lib/apiAuth';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const me = await fetchMe();
  if (!me) return null;

  return (
    <div>
      <h1>Your Profile</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>Manage your Avision Institute account.</p>

      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--divider)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--brand)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24 }}>
            {me.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <h3 style={{ marginBottom: 4 }}>{me.name}</h3>
            <div className="text-muted">{me.email}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 4 }}>
          <ProfileRow icon={<Mail size={16} />} label="Email" value={me.email} />
          <ProfileRow icon={<Phone size={16} />} label="Phone" value={me.phone || '—'} />
          <ProfileRow icon={<User size={16} />} label="Avision ID" value={me.avision_id || '—'} />
          <ProfileRow icon={<GraduationCap size={16} />} label="Preferred category" value={me.category_id || '—'} />
        </div>

        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-alt)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Note</div>
          <p style={{ fontSize: 13, marginBottom: 0 }}>
            To update your profile details, please use the Avision mobile app for now. Web-based profile editing is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--divider)' }}>
      <div style={{ color: 'var(--brand)' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}
