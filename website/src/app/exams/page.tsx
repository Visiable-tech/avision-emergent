import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { cmsList, type ExamCategory } from '@/lib/api';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Exam Categories',
  description: 'Browse every competitive exam Avision Institute prepares you for — Banking, SSC, UPSC, Railway, Law and more.',
};

export default async function ExamsIndexPage() {
  const { items } = await cmsList<ExamCategory>('exam_categories_cms', { limit: 100 }).catch(() => ({ items: [] as ExamCategory[] }));

  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Explore Exams</h1>
          <p>All the competitive exams we prepare you for, curated by category.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {items.length === 0 ? (
            <EmptyExams />
          ) : (
            <div className="grid grid-3">
              {items.map((c) => (
                <Link key={c.id} href={`/exams/${c.slug || c.id}`} className="card">
                  <div className="card-media" style={{ background: `linear-gradient(135deg, ${c.color || '#0B4DB8'}, #082C6F)` }}>
                    {c.banner_image && <Image src={c.banner_image} alt={c.name} fill sizes="360px" style={{ objectFit: 'cover' }} />}
                  </div>
                  <div className="card-body">
                    <div className="card-title">{c.name}</div>
                    {c.description && <div className="card-desc">{c.description}</div>}
                    <div className="card-footer">
                      <span />
                      <span className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
                        Details <ArrowRight size={12} />
                      </span>
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

function EmptyExams() {
  return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <h3>Coming soon</h3>
      <p className="text-muted">Exam categories are being curated by our academic team.</p>
      <Link href="/courses" className="btn btn-primary" style={{ marginTop: 12 }}>Browse Courses <ArrowRight size={14} /></Link>
    </div>
  );
}
