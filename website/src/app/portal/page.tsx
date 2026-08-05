import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Video, Clipboard, BookOpen, Flame, PlayCircle } from 'lucide-react';
import { fetchMe, fetchMyEntitlements, fetchContinueLearning } from '@/lib/apiAuth';

export const metadata: Metadata = { title: 'My Dashboard' };

export default async function PortalDashboard() {
  const [me, entitlements, cont] = await Promise.all([
    fetchMe(),
    fetchMyEntitlements(),
    fetchContinueLearning().catch(() => []),
  ]);

  const videoCourses = entitlements.filter((e) => e.product_type === 'video_course');
  const liveCourses = entitlements.filter((e) => e.product_type === 'live_course');
  const testPrime = entitlements.filter((e) => e.product_type === 'test_series');

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Welcome back</div>
        <h1 style={{ marginTop: 4 }}>Hi, {me?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="text-muted">Pick up right where you left off, or start something new today.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-4" style={{ marginBottom: 32 }}>
        <StatCard label="Video courses" value={videoCourses.length} icon={<Video />} tone="brand" />
        <StatCard label="Live batches" value={liveCourses.length} icon={<Flame />} tone="error" />
        <StatCard label="Test Prime" value={testPrime.length} icon={<Clipboard />} tone="success" />
        <StatCard label="Total entitlements" value={entitlements.length} icon={<BookOpen />} tone="brand" />
      </div>

      {/* Continue learning */}
      {cont.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={{ marginBottom: 0 }}>Continue learning</h3>
            <Link href="/portal/library" style={{ fontSize: 13, fontWeight: 700 }}>See all →</Link>
          </div>
          <div className="grid grid-3">
            {cont.slice(0, 3).map((item: any) => (
              <Link key={`${item.course_id}-${item.lecture_id}`} href={`/portal/watch/${item.course_id}/${item.lecture_id}`} className="card">
                {item.thumbnail && (
                  <div className="card-media" style={{ position: 'relative' }}>
                    <Image src={item.thumbnail} alt={item.title} fill sizes="360px" style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PlayCircle size={48} color="#FFF" />
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.3)' }}>
                      <div style={{ height: '100%', width: `${item.progress_pct || 0}%`, background: 'var(--brand-2)' }} />
                    </div>
                  </div>
                )}
                <div className="card-body">
                  <span className="card-tag">{item.course_name}</span>
                  <div className="card-title" style={{ fontSize: 14 }}>{item.title || item.lecture_title}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{Math.round(item.progress_pct || 0)}% watched</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My library */}
      {entitlements.length > 0 ? (
        <section>
          <h3>Your library</h3>
          <p className="text-muted" style={{ marginBottom: 20 }}>Everything you have access to on Avision.</p>
          <div className="grid grid-3">
            {entitlements.slice(0, 6).map((ent) => (
              <EntitlementCard key={ent.product_id} ent={ent} />
            ))}
          </div>
          {entitlements.length > 6 && (
            <div style={{ marginTop: 20 }}>
              <Link href="/portal/library" className="btn btn-outline">See all {entitlements.length} items <ArrowRight size={14} /></Link>
            </div>
          )}
        </section>
      ) : (
        <div className="card" style={{ padding: 40, textAlign: 'center', background: 'var(--bg-alt)' }}>
          <BookOpen size={40} color="var(--brand)" />
          <h3 style={{ marginTop: 12 }}>Your library is empty</h3>
          <p className="text-muted">Enroll in a course or activate Test Prime to start learning.</p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Link href="/courses" className="btn btn-primary">Browse Video Courses</Link>
            <Link href="/live-courses" className="btn btn-outline">Live Batches</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'brand' | 'success' | 'error' }) {
  const c = tone === 'success' ? 'var(--success)' : tone === 'error' ? 'var(--error)' : 'var(--brand)';
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(11,77,184,0.08)', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{value}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

export function EntitlementCard({ ent }: { ent: any }) {
  const p = ent.product;
  const href = ent.product_type === 'video_course' ? `/portal/courses/${ent.product_id}`
             : ent.product_type === 'live_course' ? `/live-courses/${ent.product_id}`
             : ent.product_type === 'test_series' ? '/portal/tests'
             : '/portal/library';
  return (
    <Link href={href} className="card">
      <div className="card-media" style={{ background: `linear-gradient(135deg, ${p?.gradient?.[0] || '#0B4DB8'}, ${p?.gradient?.[1] || '#082C6F'})` }}>
        {p?.banner_image && <Image src={p.banner_image} alt={p.name} fill sizes="360px" style={{ objectFit: 'cover' }} />}
      </div>
      <div className="card-body">
        <span className="card-tag">{ent.product_type.replace('_', ' ')}</span>
        <div className="card-title">{p?.name || ent.product_id}</div>
        {ent.expires_at && (
          <div className="text-muted" style={{ fontSize: 11 }}>
            Valid until {new Date(ent.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        )}
        <div className="card-footer">
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>Open</span>
          <ArrowRight size={14} color="var(--brand)" />
        </div>
      </div>
    </Link>
  );
}
