import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const y = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid grid-4">
          <div>
            <h4>Avision Institute</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>India's premier coaching platform for competitive government exams. Live batches, video courses and 25,000+ practice tests.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <Link href="/exams">Exam Info</Link>
            <Link href="/courses">Video Courses</Link>
            <Link href="/live-courses">Live Batches</Link>
            <Link href="/current-affairs">Current Affairs</Link>
            <Link href="/testimonials">Testimonials</Link>
            <Link href="/results">Selections</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/franchise">Franchise</Link>
            <Link href="/centres">Centres</Link>
            <Link href="/faqs">FAQs</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
          </div>
          <div>
            <h4>Reach us</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <MapPin size={14} style={{ marginTop: 3, flexShrink: 0 }} />
              <span>Kolkata • Howrah • Salt Lake</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <Mail size={14} /> support@avision.co.in
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <Phone size={14} /> 1800-102-AVSN
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          © {y} Avision Institute. All rights reserved. Powered by AVISION ONE common backend.
        </div>
      </div>
    </footer>
  );
}
