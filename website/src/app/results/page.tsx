import type { Metadata } from 'next';
import Image from 'next/image';
import { cmsList, type Result } from '@/lib/api';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Our Selections',
  description: 'Recent selections from Avision aspirants across Banking, SSC, UPSC, Railway and more.',
};

export default async function ResultsPage() {
  const { items } = await cmsList<Result>('results', { limit: 100 }).catch(() => ({ items: [] as Result[] }));
  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Our Selections</h1>
          <p>1,200+ selections and counting. Here are the latest.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid grid-4">
            {items.map((r) => (
              <div key={r.id} className="card">
                <div className="card-media" style={{ aspectRatio: '1 / 1' }}>
                  {r.photo && <Image src={r.photo} alt={r.name} fill sizes="240px" style={{ objectFit: 'cover' }} />}
                </div>
                <div className="card-body" style={{ padding: 16 }}>
                  <div className="card-title" style={{ fontSize: 15 }}>{r.name}</div>
                  <div className="card-desc" style={{ marginBottom: 4 }}>{r.exam_name}{r.rank ? ` · Rank ${r.rank}` : ''}</div>
                  {r.post && <div className="text-muted" style={{ fontSize: 12 }}>{r.post}{r.year ? ` · ${r.year}` : ''}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
