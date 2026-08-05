import type { Metadata } from 'next';
import { MapPin, Phone, Users } from 'lucide-react';
import { cmsList, type Centre } from '@/lib/api';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Our Centres',
  description: 'Visit Avision Institute at any of our physical centres across India.',
};

export default async function CentresPage() {
  const { items } = await cmsList<Centre>('centres_v2', { limit: 100 }).catch(() => ({ items: [] as Centre[] }));
  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Our Centres</h1>
          <p>Visit us in person, get expert counselling and start your prep.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            {items.map((c) => (
              <div key={c.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ padding: '3px 8px', background: 'rgba(11,77,184,0.1)', color: 'var(--brand)', fontWeight: 900, fontSize: 10, borderRadius: 4, textTransform: 'uppercase' }}>{c.type || 'centre'}</div>
                </div>
                <div className="card-title" style={{ marginBottom: 12 }}>{c.name}</div>
                {c.address && (
                  <div className="info-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
                    <MapPin size={16} color="var(--brand)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{c.address}, {c.city}, {c.state}</span>
                  </div>
                )}
                {!c.address && c.city && (
                  <div className="info-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
                    <MapPin size={16} color="var(--brand)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{c.city}, {c.state}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="info-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
                    <Phone size={16} color="var(--brand)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{c.phone}</span>
                  </div>
                )}
                {c.seats && (
                  <div className="info-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
                    <Users size={16} color="var(--brand)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{c.seats} seats</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
