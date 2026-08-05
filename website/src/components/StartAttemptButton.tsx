"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle } from 'lucide-react';

export default function StartAttemptButton({ testId }: { testId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/session/attempt/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: testId, language: 'English' }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || data.error || 'Could not start attempt');
      router.push(`/portal/attempt/${data.attempt_id}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div>
      <button className="btn btn-primary btn-lg" onClick={start} disabled={busy}>
        <PlayCircle size={18} /> {busy ? 'Starting attempt…' : 'Start Attempt'}
      </button>
      {err && <div style={{ marginTop: 10, color: 'var(--error)', fontSize: 13 }}>{err}</div>}
    </div>
  );
}
