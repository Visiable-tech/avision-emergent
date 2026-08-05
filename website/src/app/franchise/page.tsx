import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, TrendingUp, Users, MapPin } from 'lucide-react';
import { cmsList, type Franchise } from '@/lib/api';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Franchise Opportunity',
  description: 'Partner with Avision Institute — India\'s trusted coaching brand. Own your centre in your city.',
};

export default async function FranchisePage() {
  const { items } = await cmsList<Franchise>('franchises', { limit: 100 }).catch(() => ({ items: [] as Franchise[] }));

  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Partner with Avision</h1>
          <p>Bring India's premier coaching brand to your city. Full playbook + tech + marketing support.</p>
          <div style={{ marginTop: 20 }}>
            <Link href="/contact" className="btn btn-lg" style={{ background: '#FFF', color: 'var(--brand)' }}>
              Enquire now <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Why choose Avision</h2>
          <div className="grid grid-3" style={{ marginTop: 24 }}>
            <div className="card" style={{ padding: 24 }}>
              <TrendingUp size={22} color="var(--brand)" />
              <div className="card-title" style={{ fontSize: 16, marginTop: 10 }}>Proven ROI</div>
              <div className="card-desc" style={{ marginBottom: 0 }}>Attractive revenue share + low breakeven — most centres profitable in 6 months.</div>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <Users size={22} color="var(--brand)" />
              <div className="card-title" style={{ fontSize: 16, marginTop: 10 }}>End-to-end support</div>
              <div className="card-desc" style={{ marginBottom: 0 }}>Curriculum, faculty, LMS, marketing, admissions — all managed centrally.</div>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <CheckCircle size={22} color="var(--brand)" />
              <div className="card-title" style={{ fontSize: 16, marginTop: 10 }}>Turnkey model</div>
              <div className="card-desc" style={{ marginBottom: 0 }}>Setup, hiring, training and launch — done in 60 days.</div>
            </div>
          </div>
        </div>
      </section>

      {items.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2 className="section-title">Existing partners</h2>
            <p className="section-sub">Our growing network of franchise partners across India.</p>
            <div className="grid grid-3">
              {items.map((f) => (
                <div key={f.id} className="card" style={{ padding: 24 }}>
                  <div style={{ padding: '3px 8px', background: 'rgba(11,77,184,0.1)', color: 'var(--brand)', fontWeight: 900, fontSize: 10, borderRadius: 4, textTransform: 'uppercase', display: 'inline-block', marginBottom: 10 }}>Franchise</div>
                  <div className="card-title">{f.name}</div>
                  <div className="info-row" style={{ padding: '6px 0', borderBottom: 'none' }}>
                    <MapPin size={14} color="var(--muted)" />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{f.city}, {f.state}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-light)' }}>Owner: {f.franchisee_name || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container">
        <div className="cta-banner">
          <h2>Ready to become a partner?</h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 20 }}>Send us your city + phone number and we'll get in touch within 24 hours.</p>
          <Link href="/contact" className="btn" style={{ background: '#FFF', color: 'var(--brand)' }}>
            Contact franchise team <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </>
  );
}
