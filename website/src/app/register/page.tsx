"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', category_id: 'banking' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/session/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Registration failed');
      router.replace('/portal');
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section" style={{ minHeight: 'calc(100vh - 68px)' }}>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card" style={{ padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, background: 'var(--brand)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', marginBottom: 12 }}>
              <UserPlus size={26} />
            </div>
            <h2 style={{ marginBottom: 4 }}>Create your account</h2>
            <p className="text-muted">Join 50,000+ aspirants preparing with Avision.</p>
          </div>
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <Field label="Full name" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
            <Field label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} required />
            <Field label="Phone" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} required placeholder="10-digit mobile" />
            <Field label="Password" type="password" value={f.password} onChange={(v) => setF({ ...f, password: v })} required placeholder="Min 8 characters" />
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>EXAM CATEGORY</span>
              <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}
                      style={{ padding: '11px 12px', border: '1px solid var(--divider)', borderRadius: 10, fontSize: 14 }}>
                <option value="banking">Banking</option>
                <option value="ssc">SSC</option>
                <option value="railway">Railway</option>
                <option value="upsc">UPSC</option>
                <option value="law">Law</option>
                <option value="other">Other</option>
              </select>
            </label>
            {err && <div style={{ color: 'var(--error)', fontSize: 13, background: 'rgba(220,38,38,0.08)', padding: 10, borderRadius: 8 }}>{err}</div>}
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 8 }}>
              {busy ? 'Creating account…' : <>Create account <ArrowRight size={14} /></>}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder }: any) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>{label.toUpperCase()}</span>
      <input type={type} required={required} value={value} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)}
             style={{ padding: '11px 12px', border: '1px solid var(--divider)', borderRadius: 10, fontSize: 14 }} />
    </label>
  );
}
