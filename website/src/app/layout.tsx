import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeartbeatBeacon from '@/components/HeartbeatBeacon';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Avision Institute';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://avision.co.in';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — India's Premier Coaching for Banking, SSC, UPSC & Railways`,
    template: `%s • ${siteName}`,
  },
  description:
    'Live batches, video courses, 25,000+ practice tests and AI doubt-solver — trusted by thousands of aspirants for Banking, SSC, UPSC and Railway exams.',
  keywords: [
    'Banking coaching', 'SSC coaching', 'UPSC coaching', 'Railway coaching',
    'IBPS PO', 'SBI PO', 'SSC CGL', 'CLAT', 'Avision Institute',
  ],
  openGraph: {
    type: 'website', locale: 'en_IN', url: siteUrl, siteName,
    title: `${siteName} — Ace Your Exam`,
    description: 'Live batches, video courses, 25,000+ practice tests and AI doubt-solver.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} — Ace Your Exam`,
    description: 'Live batches, video courses, 25,000+ practice tests and AI doubt-solver.',
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <HeartbeatBeacon />
      </body>
    </html>
  );
}
