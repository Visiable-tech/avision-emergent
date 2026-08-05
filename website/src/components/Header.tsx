import Link from 'next/link';
import { ArrowRight, User } from 'lucide-react';
import { fetchMe } from '@/lib/apiAuth';

export default async function Header() {
  const me = await fetchMe().catch(() => null);
  return (
    <div className="nav-wrap">
      <div className="container nav">
        <Link href="/" className="nav-brand">
          <span className="nav-brand-mark">A</span>
          <span>Avision Institute</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link href="/exams">Exams</Link>
          <Link href="/courses">Video Courses</Link>
          <Link href="/live-courses">Live Batches</Link>
          <Link href="/current-affairs">Current Affairs</Link>
          <Link href="/testimonials">Results</Link>
          <Link href="/centres">Centres</Link>
          <Link href="/franchise">Franchise</Link>
        </nav>
        <div className="nav-cta">
          {me ? (
            <Link href="/portal" className="btn btn-primary">
              <User size={14} /> My Learning
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary">Sign in</Link>
              <Link href="/register" className="btn btn-primary">Get started <ArrowRight size={14} /></Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
