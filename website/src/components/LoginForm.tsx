"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp?.get('next') || '/portal';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/session/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Login failed');
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section" style={{ minHeight: 'calc(100vh - 68px)' }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="card" style={{ padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, background: 'var(--brand)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', marginBottom: 12 }}>
              <LogIn size={26} />
            </div>
            <h2 style={{ marginBottom: 4 }}>Welcome back</h2>
            <p className="text-muted">Sign in to access your courses, tests and progress.</p>
          </div>
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <label className="auth-label">
              <span className="auth-label-txt">EMAIL</span>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--muted-light)' }} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input with-icon" />
              </div>
            </label>
            <label className="auth-label">
              <span className="auth-label-txt">PASSWORD</span>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--muted-light)' }} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input with-icon" />
              </div>
            </label>
            {err && <div style={{ color: 'var(--error)', fontSize: 13, background: 'rgba(220,38,38,0.08)', padding: 10, borderRadius: 8 }}>{err}</div>}
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 8 }}>
              {busy ? 'Signing in…' : <>Sign in <ArrowRight size={14} /></>}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            New to Avision? <Link href="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
