import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Header() {
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
          <Link href="/contact" className="btn btn-secondary">Contact</Link>
          <a href="/" className="btn btn-primary">Download App <ArrowRight size={14} /></a>
        </div>
      </div>
    </div>
  );
}
