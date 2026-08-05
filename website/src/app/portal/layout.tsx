import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LayoutDashboard, BookOpen, Clipboard, LogOut, User, Home } from 'lucide-react';
import { fetchMe } from '@/lib/apiAuth';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const me = await fetchMe();
  if (!me) redirect('/login');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 'calc(100vh - 68px - 250px)' }}>
      <aside style={{ borderRight: '1px solid var(--divider)', background: 'var(--bg-alt)', padding: 24 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', background: '#FFF', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
            {me.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{me.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.email}</div>
          </div>
        </div>
        <nav style={{ display: 'grid', gap: 2 }}>
          <NavItem href="/portal" icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <NavItem href="/portal/library" icon={<BookOpen size={16} />} label="My Library" />
          <NavItem href="/portal/tests" icon={<Clipboard size={16} />} label="Test Prime" />
          <NavItem href="/portal/profile" icon={<User size={16} />} label="Profile" />
        </nav>
        <div style={{ borderTop: '1px solid var(--divider)', marginTop: 24, paddingTop: 12, display: 'grid', gap: 2 }}>
          <NavItem href="/" icon={<Home size={16} />} label="Back to main site" />
          <LogoutButton />
        </div>
        <div style={{ marginTop: 24, background: 'linear-gradient(135deg, var(--brand), var(--brand-2))', color: '#FFF', padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Reward stats</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, fontWeight: 900, textAlign: 'center' }}>
            <div><div>{me.coins || 0}</div><div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>COINS</div></div>
            <div><div>{me.xp || 0}</div><div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>XP</div></div>
            <div><div>{me.streak || 0}</div><div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>STREAK</div></div>
          </div>
        </div>
      </aside>
      <main style={{ padding: '32px 40px' }}>{children}</main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: 'var(--text-2)' }}>
      {icon} {label}
    </Link>
  );
}

function LogoutButton() {
  return (
    <form action="/api/session/logout" method="post">
      <button type="submit" style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: 'var(--error)', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
        <LogOut size={16} /> Sign out
      </button>
    </form>
  );
}
