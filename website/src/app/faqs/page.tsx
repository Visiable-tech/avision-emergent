import type { Metadata } from 'next';
import { cmsList, type Faq } from '@/lib/api';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Answers to the questions we hear the most — payments, access, refunds and more.',
};

export default async function FaqsPage() {
  const { items } = await cmsList<Faq>('faqs', { limit: 100 }).catch(() => ({ items: [] as Faq[] }));
  const sections = items.reduce((acc: Record<string, Faq[]>, f) => {
    const sec = f.section || 'general';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(f);
    return acc;
  }, {});
  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          <p>Quick answers to the questions our students ask most.</p>
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          {Object.keys(sections).length === 0 ? (
            <p className="text-muted text-center">No FAQs yet.</p>
          ) : (
            Object.entries(sections).map(([sec, faqs]) => (
              <div key={sec} style={{ marginBottom: 40 }}>
                <h3 style={{ marginBottom: 12, textTransform: 'capitalize' }}>{sec.replace('-', ' ')}</h3>
                {faqs.map((f) => (
                  <details key={f.id} style={{ borderBottom: '1px solid var(--divider)', padding: '18px 0' }}>
                    <summary style={{ fontWeight: 800, cursor: 'pointer', fontSize: 15, listStyle: 'none' }}>{f.question}</summary>
                    <p style={{ marginTop: 10, color: 'var(--muted)' }}>{f.answer}</p>
                  </details>
                ))}
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
