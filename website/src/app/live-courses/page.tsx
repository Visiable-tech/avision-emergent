import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { listProducts } from '@/lib/api';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Live Batches',
  description: 'Interactive live batches for every major competitive exam. Zoom-quality classes, doubt sessions & recordings.',
};

export default async function LiveCoursesIndex() {
  const { products } = await listProducts({ type: 'live_course', limit: 100 }).catch(() => ({ products: [] }));

  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Live Batches</h1>
          <p>Attend live, ask questions in real-time, and get recordings for revision.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            {products.map((p) => (
              <Link key={p.id} href={`/live-courses/${p.id}`} className="card">
                <div className="card-media" style={{ background: `linear-gradient(135deg, ${p.gradient?.[0] || '#0B4DB8'}, ${p.gradient?.[1] || '#082C6F'})` }}>
                  {p.banner_image && <Image src={p.banner_image} alt={p.name} fill sizes="360px" style={{ objectFit: 'cover' }} />}
                </div>
                <div className="card-body">
                  <span className="badge-live">Live</span>
                  {p.exam_name && <span className="card-tag" style={{ marginTop: 8 }}>{p.exam_name}</span>}
                  <div className="card-title">{p.name}</div>
                  <div className="card-desc">{p.language}</div>
                  <div className="card-footer">
                    <div>
                      <span className="card-price">₹{p.offer_price?.toLocaleString?.()}</span>
                      {p.price !== p.offer_price && <span className="card-price-mrp">₹{p.price?.toLocaleString?.()}</span>}
                    </div>
                    <ArrowRight size={16} color="var(--brand)" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
