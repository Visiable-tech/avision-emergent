import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, Calendar, CheckCircle, FileText } from 'lucide-react';
import { cmsList, cmsGet, listProducts, type ExamCategory, type Exam } from '@/lib/api';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cats = await cmsList<ExamCategory>('exam_categories_cms', { q: slug, limit: 5 }).catch(() => ({ items: [] as ExamCategory[] }));
  const cat = cats.items.find((c) => c.slug === slug || c.id === slug);
  if (!cat) return { title: slug };
  return {
    title: `${cat.name} — Exam Info`,
    description: cat.description || `Everything you need to know about ${cat.name} exams.`,
  };
}

export default async function ExamCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cats = await cmsList<ExamCategory>('exam_categories_cms', { q: slug, limit: 5 }).catch(() => ({ items: [] as ExamCategory[] }));
  const cat = cats.items.find((c) => c.slug === slug || c.id === slug);
  if (!cat) notFound();

  const [exams, courses] = await Promise.all([
    cmsList<Exam>('exams_cms', { q: cat.id, limit: 20 }).catch(() => ({ items: [] as Exam[] })),
    listProducts({ category: cat.id, limit: 12 }).catch(() => ({ products: [] })),
  ]);

  return (
    <>
      <section className="product-hero" style={{ background: `linear-gradient(135deg, ${cat.color || '#0B4DB8'}, #082C6F)` }}>
        <div className="container">
          <h1>{cat.name}</h1>
          {cat.description && <p>{cat.description}</p>}
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <Link href={`/courses?category=${cat.id}`} className="btn" style={{ background: '#FFF', color: 'var(--brand)' }}>
              Courses for {cat.name} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {exams.items.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>Exams in this category</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>Detailed exam information, syllabus and important dates.</p>
            <div className="grid grid-3">
              {exams.items.map((e) => (
                <div key={e.id} className="card" style={{ padding: 20 }}>
                  <FileText size={22} color="var(--brand)" />
                  <div className="card-title" style={{ marginTop: 12 }}>{e.name}</div>
                  {e.description && <div className="card-desc">{e.description}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {courses.products.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2>Courses for {cat.name}</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>Handpicked courses to help you crack {cat.name} exams.</p>
            <div className="grid grid-3">
              {courses.products.map((p) => {
                const href = p.type === 'live_course' ? `/live-courses/${p.id}` : `/courses/${p.id}`;
                return (
                  <Link key={p.id} href={href} className="card">
                    <div className="card-media" style={{ background: `linear-gradient(135deg, ${p.gradient?.[0] || '#0B4DB8'}, ${p.gradient?.[1] || '#082C6F'})` }}>
                      {p.banner_image && <Image src={p.banner_image} alt={p.name} fill sizes="360px" style={{ objectFit: 'cover' }} />}
                    </div>
                    <div className="card-body">
                      {p.type === 'live_course' && <span className="badge-live">Live</span>}
                      <div className="card-title" style={{ marginTop: 8 }}>{p.name}</div>
                      <div className="card-footer">
                        <span className="card-price">₹{p.offer_price?.toLocaleString?.()}</span>
                        <ArrowRight size={16} color="var(--brand)" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
