import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
      <div className="container text-center">
        <div style={{ fontSize: 88, fontWeight: 900, color: 'var(--brand)', lineHeight: 1 }}>404</div>
        <h2 style={{ marginTop: 12 }}>Page not found</h2>
        <p className="text-muted" style={{ maxWidth: 460, margin: '0 auto 24px' }}>
          We can't find the page you're looking for. It might have been moved or the URL may be misspelled.
        </p>
        <Link href="/" className="btn btn-primary"><ArrowLeft size={14} /> Back to home</Link>
      </div>
    </section>
  );
}
