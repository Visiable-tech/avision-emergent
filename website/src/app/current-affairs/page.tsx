import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { cmsList, type Article } from '@/lib/api';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Current Affairs',
  description: 'Daily curated current affairs for Banking, SSC, UPSC and Railway aspirants — from the Avision editorial team.',
};

export default async function CurrentAffairsIndex() {
  const { items } = await cmsList<Article>('current_affairs', { limit: 100 }).catch(() => ({ items: [] as Article[] }));

  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Current Affairs</h1>
          <p>Daily updates that matter for your exam — economy, polity, science, international relations.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {items.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <h3>Articles coming soon</h3>
              <p className="text-muted">Our editorial team publishes fresh daily updates on the Avision app.</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {items.map((a) => (
                <Link key={a.id} href={`/current-affairs/${a.slug || a.id}`} className="card">
                  {a.banner_image && (
                    <div className="card-media">
                      <Image src={a.banner_image} alt={a.title} fill sizes="360px" style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  <div className="card-body">
                    {a.category && <span className="card-tag">{a.category}</span>}
                    <div className="card-title">{a.title}</div>
                    {a.summary && <div className="card-desc">{a.summary}</div>}
                    <div className="card-footer">
                      <span className="text-muted" style={{ fontSize: 12 }}>{a.author || 'Avision Editorial'}</span>
                      <ArrowRight size={14} color="var(--brand)" />
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
