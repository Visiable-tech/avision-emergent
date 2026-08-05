import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchLecture, fetchCourse } from '@/lib/apiAuth';
import VideoPlayer from '@/components/VideoPlayer';

export const metadata: Metadata = { title: 'Watch' };

export default async function WatchPage({ params }: { params: Promise<{ cid: string; lid: string }> }) {
  const { cid, lid } = await params;
  const [lectureRes, course] = await Promise.all([
    fetchLecture(cid, lid),
    fetchCourse(cid),
  ]);
  if (!lectureRes || !course) notFound();

  const l = lectureRes.lecture;
  if (!l || !l.video_url) notFound();

  // Flatten curriculum into (chapter, lectures) siblings, and find prev/next
  const flat: any[] = [];
  const siblings: any[] = [];
  (course.curriculum || []).forEach((sub: any) => {
    (sub.chapters || []).forEach((ch: any) => {
      const chapter = { chapter_id: ch.id, chapter_name: ch.name, lectures: [] as any[] };
      (ch.lectures || []).forEach((lec: any) => {
        const enriched = { ...lec, subject: sub.subject };
        chapter.lectures.push(enriched);
        flat.push(enriched);
      });
      siblings.push(chapter);
    });
  });
  const idx = flat.findIndex((x) => x.id === lid);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  return (
    <VideoPlayer
      course={course}
      currentLectureId={lid}
      lecture={{ ...l, id: lid }}
      nextLecture={next}
      prevLecture={prev}
      siblings={siblings}
      initialWatchSec={lectureRes.progress?.watch_seconds || 0}
    />
  );
}
