import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle, Clock, Video, Award } from 'lucide-react';
import { getProduct } from '@/lib/api';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p) return { title: id };
  return {
    title: p.seo?.title || p.name,
    description: p.seo?.desc || `${p.name} — Complete video course for ${p.exam_name || 'competitive exams'}.`,
    keywords: p.seo?.keywords,
  };
}

export default async function VideoCourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p) notFound();

  return (
    <>
      <section className="product-hero" style={{ background: `linear-gradient(135deg, ${p.gradient?.[0] || '#0B4DB8'}, ${p.gradient?.[1] || '#082C6F'})` }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            {p.exam_name && <span className="hero-eyebrow" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF' }}>{p.exam_name}</span>}
            <h1 style={{ marginTop: 12 }}>{p.name}</h1>
            {p.language && <p>{p.language} · {p.validity_days} days access</p>}
            <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: '#FFF' }}>₹{p.offer_price?.toLocaleString?.()}</span>
              {p.price !== p.offer_price && (
                <>
                  <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', textDecoration: 'line-through' }}>₹{p.price?.toLocaleString?.()}</span>
                  <span style={{ background: '#F59E0B', color: '#000', fontWeight: 900, padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                    {Math.round(((p.price - p.offer_price) / p.price) * 100)}% OFF
                  </span>
                </>
              )}
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#enroll" className="btn btn-lg" style={{ background: '#FFF', color: 'var(--brand)' }}>Enroll Now <ArrowRight size={16} /></a>
              <a href="/" className="btn btn-lg btn-outline" style={{ borderColor: '#FFF', color: '#FFF' }}>Get on App</a>
            </div>
          </div>
          {p.banner_image && (
            <div style={{ aspectRatio: '16 / 10', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <Image src={p.banner_image} alt={p.name} width={600} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      {(p.features?.length || 0) > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">What's included</h2>
            <div className="grid grid-3">
              {p.features!.map((f: any, i: number) => {
                const label = typeof f === 'string' ? f : (f?.label || f?.title || '');
                const sub = typeof f === 'string' ? '' : (f?.sub || f?.description || '');
                if (!label) return null;
                return (
                  <div key={i} className="card" style={{ padding: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <CheckCircle size={22} color="var(--success)" style={{ flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
                      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Bundle items (if bundle) */}
      {p.type === 'bundle' && (p.items?.length || 0) > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2 className="section-title">This bundle unlocks</h2>
            <p className="section-sub">Buy once, get access to every item below.</p>
            <div className="grid grid-2">
              {p.items!.map((it, i) => (
                <div key={i} className="card" style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(11,77,184,0.1)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {it.type === 'test_series' ? <Award /> : <Video />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900 }}>{it.type.replace('_', ' ')}</div>
                    <div className="text-muted" style={{ fontSize: 13 }}>{it.ref_id}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Enroll CTA */}
      <section className="section" id="enroll">
        <div className="container">
          <div className="cta-banner">
            <h2>Ready to start?</h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 20 }}>Get instant access on your phone via the Avision app.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/" className="btn btn-lg" style={{ background: '#FFF', color: 'var(--brand)' }}>Download the app</a>
              <Link href="/contact" className="btn btn-lg btn-outline" style={{ borderColor: '#FFF', color: '#FFF' }}>Talk to counsellor</Link>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 16 }}>
              Web checkout coming soon. For now, complete your enrollment via the mobile app.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
