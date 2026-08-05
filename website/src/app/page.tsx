import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Users, Video, Clipboard, Sparkles } from 'lucide-react';
import { cmsList, listProducts, type CmsBanner, type Testimonial, type Result, type Faq, type Article } from '@/lib/api';

export const revalidate = 60;

export default async function HomePage() {
  const [banners, videoCourses, liveCourses, testimonials, results, ca, faqs] = await Promise.all([
    cmsList<CmsBanner>('banners_home').catch(() => ({ items: [] as CmsBanner[] })),
    listProducts({ type: 'video_course', limit: 6 }).catch(() => ({ products: [] })),
    listProducts({ type: 'live_course', limit: 4 }).catch(() => ({ products: [] })),
    cmsList<Testimonial>('testimonials', { limit: 3 }).catch(() => ({ items: [] as Testimonial[] })),
    cmsList<Result>('results', { limit: 8 }).catch(() => ({ items: [] as Result[] })),
    cmsList<Article>('current_affairs', { limit: 3 }).catch(() => ({ items: [] as Article[] })),
    cmsList<Faq>('faqs', { limit: 5 }).catch(() => ({ items: [] as Faq[] })),
  ]);

  const heroBanner = banners.items?.[0];

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <span className="hero-eyebrow">🎓 India's Premier Coaching Platform</span>
          <h1>{heroBanner?.title || 'Learn. Practice. Crack.'}</h1>
          <p>{heroBanner?.subtitle || 'Live batches, video courses, 25,000+ practice tests and AI doubt-solver — everything you need to ace Banking, SSC, UPSC and Railway exams.'}</p>
          <div className="hero-actions">
            <Link href="/courses" className="btn btn-primary btn-lg">Explore Courses <ArrowRight size={16} /></Link>
            <Link href="/exams" className="btn btn-outline btn-lg">Browse Exams</Link>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="container">
        <div className="stat-strip">
          <div className="stat"><div className="stat-num">50k+</div><div className="stat-lbl">Students</div></div>
          <div className="stat"><div className="stat-num">25k+</div><div className="stat-lbl">Practice Qs</div></div>
          <div className="stat"><div className="stat-num">1,200+</div><div className="stat-lbl">Selections</div></div>
          <div className="stat"><div className="stat-num">15+</div><div className="stat-lbl">Centres</div></div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Why aspirants choose Avision</h2>
          <p className="section-sub">Everything that helps you go from prep to selection — under one roof.</p>
          <div className="grid grid-4">
            <FeatureCard icon={<Video />} title="Live batches" desc="Interactive live classes with top faculty, recordings on-demand." />
            <FeatureCard icon={<Clipboard />} title="Test Prime" desc="25,000+ PYQ + mock tests with detailed solutions & analytics." />
            <FeatureCard icon={<Users />} title="Expert faculty" desc="Handpicked mentors with 10+ years of coaching experience." />
            <FeatureCard icon={<Sparkles />} title="AI doubt solver" desc="Instant clarifications, 24×7 — from your phone or web." />
          </div>
        </div>
      </section>

      {/* FEATURED VIDEO COURSES */}
      {videoCourses.products.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2 className="section-title">Featured Video Courses</h2>
            <p className="section-sub">Learn at your pace — start today, finish before the exam.</p>
            <div className="grid grid-3">
              {videoCourses.products.slice(0, 6).map((p) => (
                <ProductCard key={p.id} product={p} kind="video" />
              ))}
            </div>
            <div className="text-center mt-lg">
              <Link href="/courses" className="btn btn-outline">See all courses <ArrowRight size={14} /></Link>
            </div>
          </div>
        </section>
      )}

      {/* LIVE BATCHES */}
      {liveCourses.products.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">Live Batches</h2>
            <p className="section-sub">Learn live with our faculty — Zoom-quality, exam-focused sessions.</p>
            <div className="grid grid-2">
              {liveCourses.products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} kind="live" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RESULTS */}
      {results.items.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2 className="section-title">Our Selections</h2>
            <p className="section-sub">Recent selections from Avision aspirants.</p>
            <div className="grid grid-4">
              {results.items.slice(0, 8).map((r) => (
                <div key={r.id} className="card">
                  <div className="card-media" style={{ aspectRatio: '1 / 1' }}>
                    {r.photo && (
                      <Image src={r.photo} alt={r.name} fill sizes="240px" style={{ objectFit: 'cover' }} />
                    )}
                  </div>
                  <div className="card-body" style={{ padding: 16 }}>
                    <div className="card-title" style={{ fontSize: 15 }}>{r.name}</div>
                    <div className="card-desc" style={{ marginBottom: 0 }}>{r.exam_name}{r.rank ? ` · Rank ${r.rank}` : ''}{r.year ? ` · ${r.year}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {testimonials.items.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">What our students say</h2>
            <p className="section-sub">Real stories from real selections.</p>
            <div className="grid grid-3">
              {testimonials.items.slice(0, 3).map((t) => (
                <div key={t.id} className="t-card">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {t.photo ? (
                      <Image src={t.photo} alt={t.name} width={56} height={56} className="t-avatar" />
                    ) : (
                      <div className="t-avatar" style={{ background: 'var(--brand)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{t.name.charAt(0)}</div>
                    )}
                    <div>
                      <div className="t-name">{t.name}</div>
                      <div className="t-meta">{t.exam_name}{t.rank ? ` · Rank ${t.rank}` : ''}</div>
                    </div>
                  </div>
                  <p className="t-quote">“{t.quote}”</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CURRENT AFFAIRS */}
      {ca.items.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2 className="section-title">Latest Current Affairs</h2>
            <p className="section-sub">Curated for aspirants — daily updates from the Avision editorial team.</p>
            <div className="grid grid-3">
              {ca.items.slice(0, 3).map((a) => (
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
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-lg">
              <Link href="/current-affairs" className="btn btn-outline">All articles <ArrowRight size={14} /></Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.items.length > 0 && (
        <section className="section">
          <div className="container" style={{ maxWidth: 780 }}>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-sub">Quick answers to the questions we hear the most.</p>
            {faqs.items.map((f) => (
              <details key={f.id} style={{ borderBottom: '1px solid var(--divider)', padding: '18px 0' }}>
                <summary style={{ fontWeight: 800, cursor: 'pointer', fontSize: 15, listStyle: 'none' }}>
                  {f.question}
                </summary>
                <p style={{ marginTop: 10, color: 'var(--muted)' }}>{f.answer}</p>
              </details>
            ))}
            <div className="text-center mt-lg">
              <Link href="/faqs" className="btn btn-outline">View all FAQs <ArrowRight size={14} /></Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="container">
        <div className="cta-banner">
          <h2>Ready to start your prep?</h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 20 }}>Enroll today. Access instantly on the app or via our web portal.</p>
          <Link href="/courses" className="btn" style={{ background: '#FFF', color: 'var(--brand)' }}>Get Started <ArrowRight size={16} /></Link>
        </div>
      </div>
    </>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(11,77,184,0.1)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        {icon}
      </div>
      <div className="card-title" style={{ fontSize: 16 }}>{title}</div>
      <div className="card-desc" style={{ marginBottom: 0 }}>{desc}</div>
    </div>
  );
}

function ProductCard({ product, kind }: { product: any; kind: 'video' | 'live' }) {
  const href = kind === 'live' ? `/live-courses/${product.id}` : `/courses/${product.id}`;
  return (
    <Link href={href} className="card">
      <div className="card-media" style={{ background: `linear-gradient(135deg, ${product.gradient?.[0] || '#0B4DB8'}, ${product.gradient?.[1] || '#082C6F'})` }}>
        {product.banner_image && (
          <Image src={product.banner_image} alt={product.name} fill sizes="360px" style={{ objectFit: 'cover' }} />
        )}
      </div>
      <div className="card-body">
        {kind === 'live' && <span className="badge-live">Live</span>}
        {product.exam_name && <span className="card-tag" style={{ marginTop: kind === 'live' ? 8 : 0 }}>{product.exam_name}</span>}
        <div className="card-title">{product.name}</div>
        {product.language && <div className="card-desc">{product.language}</div>}
        <div className="card-footer">
          <div>
            <span className="card-price">₹{product.offer_price?.toLocaleString?.() || product.offer_price}</span>
            {product.price !== product.offer_price && (
              <span className="card-price-mrp">₹{product.price?.toLocaleString?.() || product.price}</span>
            )}
          </div>
          <span className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>View <ArrowRight size={12} /></span>
        </div>
      </div>
    </Link>
  );
}
