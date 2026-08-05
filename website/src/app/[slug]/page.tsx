import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cmsGet, type WebPage } from '@/lib/api';

export const revalidate = 600;

async function fetchPage(slug: string): Promise<WebPage | null> {
  return await cmsGet<WebPage>('cms_web_pages', slug).catch(() => null);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchPage(slug);
  if (!p) return { title: slug };
  return {
    title: p.seo?.title || p.title,
    description: p.seo?.desc,
    keywords: p.seo?.keywords,
  };
}

export default async function DynamicCmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await fetchPage(slug);
  if (!p || p.published === false) notFound();

  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>{p.title}</h1>
          {p.seo?.desc && <p>{p.seo.desc}</p>}
        </div>
      </section>
      <section className="section">
        <div className="container prose">
          {(p.blocks || []).map((b, i) => (
            <Block key={i} block={b} />
          ))}
          {(p.blocks || []).length === 0 && (
            <p className="text-muted">This page has not been populated yet.</p>
          )}
        </div>
      </section>
    </>
  );
}

function Block({ block }: { block: any }) {
  if (block.type === 'hero') {
    return (
      <div style={{ margin: '20px 0' }}>
        <h2>{block.props?.headline}</h2>
        {block.props?.subheadline && <p>{block.props.subheadline}</p>}
      </div>
    );
  }
  if (block.type === 'text') {
    return <p style={{ whiteSpace: 'pre-wrap' }}>{block.props?.content}</p>;
  }
  if (block.type === 'image' && block.props?.src) {
    return <img src={block.props.src} alt={block.props?.alt || ''} style={{ borderRadius: 12, width: '100%' }} />;
  }
  return null;
}
