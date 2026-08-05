import type { Metadata } from 'next';
import Image from 'next/image';
import { cmsList, type Testimonial } from '@/lib/api';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Testimonials',
  description: 'Real stories from Avision aspirants who cracked their exam.',
};

export default async function TestimonialsPage() {
  const { items } = await cmsList<Testimonial>('testimonials', { limit: 60 }).catch(() => ({ items: [] as Testimonial[] }));
  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Student Testimonials</h1>
          <p>Real stories from real selections — straight from our students.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            {items.map((t) => (
              <div key={t.id} className="t-card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {t.photo ? (
                    <Image src={t.photo} alt={t.name} width={56} height={56} className="t-avatar" />
                  ) : (
                    <div className="t-avatar" style={{ background: 'var(--brand)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{t.name.charAt(0)}</div>
                  )}
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-meta">{t.exam_name}{t.rank ? ` · Rank ${t.rank}` : ''}{t.year ? ` · ${t.year}` : ''}</div>
                  </div>
                </div>
                <p className="t-quote">“{t.quote}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
