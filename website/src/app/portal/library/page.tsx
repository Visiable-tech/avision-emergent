import type { Metadata } from 'next';
import { EntitlementCard } from '../page';
import { fetchMyEntitlements } from '@/lib/apiAuth';

export const metadata: Metadata = { title: 'My Library' };

export default async function LibraryPage() {
  const entitlements = await fetchMyEntitlements();

  const groups: Record<string, any[]> = {};
  entitlements.forEach((e) => {
    const k = e.product_type;
    (groups[k] ||= []).push(e);
  });

  const labels: Record<string, string> = {
    video_course: 'Video Courses',
    live_course: 'Live Batches',
    test_series: 'Test Prime',
    bundle: 'Bundles',
    booster: 'Boosters',
    magazine: 'Magazines',
  };

  return (
    <div>
      <h1>My Library</h1>
      <p className="text-muted" style={{ marginBottom: 32 }}>Everything you have access to on the Avision platform.</p>

      {entitlements.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <h3>No entitlements yet</h3>
          <p className="text-muted">Enroll in a course to start building your library.</p>
        </div>
      ) : (
        Object.entries(groups).map(([type, ents]) => (
          <section key={type} style={{ marginBottom: 40 }}>
            <h3>{labels[type] || type}</h3>
            <div className="grid grid-3" style={{ marginTop: 14 }}>
              {ents.map((e: any) => <EntitlementCard key={e.product_id} ent={e} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
