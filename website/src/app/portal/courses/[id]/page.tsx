import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PlayCircle, CheckCircle, Clock, Video } from 'lucide-react';
import { fetchCourse, fetchCourseProgress, fetchCourseAnalytics } from '@/lib/apiAuth';

export const metadata: Metadata = { title: 'Course' };

export default async function PortalCourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, progress, analytics] = await Promise.all([
    fetchCourse(id),
    fetchCourseProgress(id),
    fetchCourseAnalytics(id).catch(() => null),
  ]);
  if (!course) notFound();

  const watchedIds = new Set<string>((progress?.watched || []).map((w: any) => w.lecture_id));
  const enrollment = analytics?.enrollment;

  return (
    <div>
      {/* Course header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, marginBottom: 32 }}>
        <div>
          <span className="card-tag">{course.exam_name}</span>
          <h1 style={{ marginTop: 8 }}>{course.name}</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <Stat label="Videos" value={course.video_count} />
            <Stat label="Subjects" value={course.subject_count} />
            <Stat label="Practice Qs" value={course.practice_qs_count} />
            <Stat label="Language" value={course.language} />
          </div>
          {enrollment && (
            <div style={{ marginTop: 20, background: 'var(--bg-alt)', padding: 16, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Your progress</span>
                <span style={{ fontWeight: 800, color: 'var(--brand)' }}>{enrollment.progress_pct}%</span>
              </div>
              <div style={{ height: 8, background: '#FFF', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${enrollment.progress_pct || 0}%`, background: 'var(--brand)' }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                {enrollment.videos_watched} videos watched · {enrollment.watch_time_hours}h total
              </div>
            </div>
          )}
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ aspectRatio: '16/9', background: `linear-gradient(135deg, ${course.gradient?.[0] || '#0B4DB8'}, ${course.gradient?.[1] || '#082C6F'})`, position: 'relative' }}>
            {course.banner_image && <Image src={course.banner_image} alt={course.name} fill sizes="320px" style={{ objectFit: 'cover' }} />}
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <h3>Curriculum</h3>
      <p className="text-muted" style={{ marginBottom: 20 }}>{course.curriculum?.length || 0} subjects · {course.video_count} lectures</p>
      <div style={{ display: 'grid', gap: 24 }}>
        {(course.curriculum || []).map((sub: any) => (
          <details key={sub.key} open style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 20 }}>
            <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 900 }}>
              <span style={{ fontSize: 16 }}>{sub.subject}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
                {sub.total_videos} lectures · {sub.total_hours} h
              </span>
            </summary>
            <div style={{ marginTop: 16, display: 'grid', gap: 6 }}>
              {(sub.chapters || []).map((ch: any) => (
                <div key={ch.id}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-2)', padding: '10px 8px', borderTop: '1px solid var(--divider)' }}>{ch.name}</div>
                  {(ch.lectures || []).map((l: any) => {
                    const watched = watchedIds.has(l.id);
                    return (
                      <Link key={l.id} href={`/portal/watch/${id}/${l.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: watched ? 'rgba(22,163,74,0.06)' : 'transparent', textDecoration: 'none' }}>
                        {watched ? <CheckCircle size={16} color="var(--success)" /> : <PlayCircle size={16} color="var(--brand)" />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>{l.title}</div>
                          {l.is_free && <span style={{ fontSize: 10, background: 'rgba(22,163,74,0.1)', color: 'var(--success)', padding: '2px 6px', borderRadius: 4, marginTop: 2, fontWeight: 800 }}>FREE PREVIEW</span>}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {l.duration}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--brand)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
