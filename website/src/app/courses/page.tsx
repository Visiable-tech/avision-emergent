import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { listProducts } from '@/lib/api';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Video Courses',
  description: 'Complete video courses for every major competitive exam. Learn at your pace with expert faculty.',
};

export default async function CoursesIndex({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const { products } = await listProducts({ type: 'video_course', category, limit: 100 }).catch(() => ({ products: [] }));

  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Video Courses</h1>
          <p>Self-paced, complete video courses for every major exam. Includes practice tests, notes and doubt sessions.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {products.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <h3>No courses yet in this category</h3>
              <p className="text-muted">Try browsing all courses or a different category.</p>
              <Link href="/courses" className="btn btn-primary" style={{ marginTop: 12 }}>All Courses <ArrowRight size={14} /></Link>
            </div>
          ) : (
            <div className="grid grid-3">
              {products.map((p) => (
                <Link key={p.id} href={`/courses/${p.id}`} className="card">
                  <div className="card-media" style={{ background: `linear-gradient(135deg, ${p.gradient?.[0] || '#0B4DB8'}, ${p.gradient?.[1] || '#082C6F'})` }}>
                    {p.banner_image && <Image src={p.banner_image} alt={p.name} fill sizes="360px" style={{ objectFit: 'cover' }} />}
                  </div>
                  <div className="card-body">
                    {p.exam_name && <span className="card-tag">{p.exam_name}</span>}
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
          )}
        </div>
      </section>
    </>
  );
}
