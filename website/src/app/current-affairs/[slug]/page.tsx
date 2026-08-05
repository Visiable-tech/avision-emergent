import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cmsList, type Article } from '@/lib/api';

export const revalidate = 300;

async function fetchArticle(slug: string): Promise<Article | null> {
  const { items } = await cmsList<Article>('current_affairs', { q: slug, limit: 20 }).catch(() => ({ items: [] as Article[] }));
  return items.find((a) => a.slug === slug || a.id === slug) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await fetchArticle(slug);
  if (!a) return { title: slug };
  return {
    title: a.title,
    description: a.summary || a.title,
    openGraph: { title: a.title, description: a.summary, images: a.banner_image ? [a.banner_image] : undefined },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await fetchArticle(slug);
  if (!a) notFound();

  return (
    <>
      {a.banner_image && (
        <div style={{ height: 400, position: 'relative', overflow: 'hidden' }}>
          <Image src={a.banner_image} alt={a.title} fill priority style={{ objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.85))' }} />
          <div className="container" style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', width: '100%' }}>
            {a.category && <span className="hero-eyebrow" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF' }}>{a.category}</span>}
            <h1 style={{ color: '#FFF', marginTop: 12, maxWidth: 780 }}>{a.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 620 }}>By {a.author || 'Avision Editorial'}</p>
          </div>
        </div>
      )}
      <section className="section">
        <div className="container prose">
          <Link href="/current-affairs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, fontWeight: 700 }}>
            <ArrowLeft size={14} /> All articles
          </Link>
          {a.summary && (
            <p style={{ fontSize: 18, color: 'var(--muted)', fontStyle: 'italic', borderLeft: '3px solid var(--brand)', paddingLeft: 16, marginBottom: 32 }}>
              {a.summary}
            </p>
          )}
          {a.content ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{a.content}</div>
          ) : (
            <p className="text-muted">Full article coming soon.</p>
          )}
        </div>
      </section>
    </>
  );
}
