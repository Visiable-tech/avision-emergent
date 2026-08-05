"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowLeft, ChevronRight, ChevronLeft, Clock } from 'lucide-react';

type Lecture = { id: string; title: string; duration: string; video_url: string; is_free?: boolean; subject?: string };
type Course = { id: string; name: string; curriculum?: any[] };

/** Video player with server-synced progress. Sends /progress every 15s. */
export default function Player({
  course,
  currentLectureId,
  lecture,
  nextLecture,
  prevLecture,
  siblings,
  initialWatchSec,
}: {
  course: Course;
  currentLectureId: string;
  lecture: Lecture;
  nextLecture?: Lecture | null;
  prevLecture?: Lecture | null;
  siblings: { chapter_id: string; chapter_name: string; lectures: Lecture[] }[];
  initialWatchSec: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [markedComplete, setMarkedComplete] = useState(false);

  // Restore playback position
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !initialWatchSec) return;
    const onLoaded = () => {
      if (initialWatchSec && initialWatchSec < (v.duration || 0) - 5) {
        v.currentTime = initialWatchSec;
      }
    };
    v.addEventListener('loadedmetadata', onLoaded);
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, [initialWatchSec, lecture.id]);

  // Send progress every 15s
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let last = 0;
    const send = async (opts: { completed?: boolean } = {}) => {
      if (!v) return;
      const now = v.currentTime;
      if (!opts.completed && now - last < 15) return;
      last = now;
      try {
        await fetch('/api/session/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: course.id,
            lecture_id: currentLectureId,
            watch_seconds: Math.round(now),
            total_seconds: Math.round(v.duration || 0),
            completed: !!opts.completed,
          }),
        });
      } catch {}
    };
    const iv = setInterval(() => send(), 15000);
    const onEnded = () => { setMarkedComplete(true); send({ completed: true }); };
    const onPause = () => send();
    v.addEventListener('ended', onEnded);
    v.addEventListener('pause', onPause);
    return () => { clearInterval(iv); v.removeEventListener('ended', onEnded); v.removeEventListener('pause', onPause); };
  }, [course.id, currentLectureId]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
      <div>
        <Link href={`/portal/courses/${course.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 13, fontWeight: 700 }}>
          <ArrowLeft size={14} /> Back to course
        </Link>
        <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            src={lecture.video_url}
            controls
            controlsList="nodownload"
            playsInline
            preload="metadata"
            style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>{lecture.subject}</div>
            <h2 style={{ marginTop: 4, marginBottom: 8 }}>{lecture.title}</h2>
            <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {lecture.duration}</span>
              {markedComplete && <span style={{ color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> Completed</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 8 }}>
          {prevLecture ? (
            <button className="btn btn-outline" onClick={() => router.push(`/portal/watch/${course.id}/${prevLecture.id}`)}>
              <ChevronLeft size={14} /> Previous
            </button>
          ) : <span />}
          {nextLecture ? (
            <button className="btn btn-primary" onClick={() => router.push(`/portal/watch/${course.id}/${nextLecture.id}`)}>
              Next lecture <ChevronRight size={14} />
            </button>
          ) : <span />}
        </div>
      </div>

      {/* Right sidebar: curriculum */}
      <aside style={{ borderLeft: '1px solid var(--divider)', paddingLeft: 20, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 12 }}>{course.name}</div>
        {siblings.map((ch) => (
          <div key={ch.chapter_id} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{ch.chapter_name}</div>
            {ch.lectures.map((l) => {
              const active = l.id === currentLectureId;
              return (
                <Link key={l.id} href={`/portal/watch/${course.id}/${l.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: active ? 'rgba(11,77,184,0.1)' : 'transparent' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'var(--brand)' : 'var(--divider)' }} />
                  <div style={{ flex: 1, fontSize: 12, fontWeight: active ? 800 : 600, color: active ? 'var(--brand)' : 'var(--text-2)' }}>{l.title}</div>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{l.duration}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </aside>
    </div>
  );
}
