import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Talk to an Avision counsellor. We are here to help — email, phone or visit us in person.',
};

export default function ContactPage() {
  return (
    <>
      <section className="product-hero">
        <div className="container">
          <h1>Get in touch</h1>
          <p>Have a question about a course, franchise, or your enrollment? We usually reply within a few hours.</p>
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 40 }}>
          <div>
            <h3>Reach us directly</h3>
            <p className="text-muted">Available 9 AM – 9 PM IST every day.</p>
            <div className="info-row">
              <div className="info-icon"><Phone size={16} /></div>
              <div>
                <div style={{ fontWeight: 800 }}>Phone / WhatsApp</div>
                <a href="tel:1800102AVSN" style={{ fontSize: 14 }}>1800-102-AVSN</a>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon"><Mail size={16} /></div>
              <div>
                <div style={{ fontWeight: 800 }}>Email</div>
                <a href="mailto:support@avision.co.in" style={{ fontSize: 14 }}>support@avision.co.in</a>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>franchise@avision.co.in · careers@avision.co.in</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon"><MapPin size={16} /></div>
              <div>
                <div style={{ fontWeight: 800 }}>Head Office</div>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>Avision Institute, Kolkata HQ<br/>Salt Lake, WB 700091</span>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon"><Clock size={16} /></div>
              <div>
                <div style={{ fontWeight: 800 }}>Hours</div>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>Mon–Sun · 9:00 AM – 9:00 PM IST</span>
              </div>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function ContactForm() {
  return (
    <form className="card" style={{ padding: 32 }} action="mailto:support@avision.co.in" method="post" encType="text/plain">
      <h3>Send us a message</h3>
      <p className="text-muted" style={{ marginBottom: 20 }}>Fill this out and we'll reply to your email.</p>
      <div style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>YOUR NAME</span>
          <input name="name" required style={{ padding: '10px 12px', border: '1px solid var(--divider)', borderRadius: 10, fontSize: 14 }} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>EMAIL</span>
          <input name="email" type="email" required style={{ padding: '10px 12px', border: '1px solid var(--divider)', borderRadius: 10, fontSize: 14 }} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>PHONE</span>
          <input name="phone" required style={{ padding: '10px 12px', border: '1px solid var(--divider)', borderRadius: 10, fontSize: 14 }} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>HOW CAN WE HELP?</span>
          <textarea name="message" rows={4} required style={{ padding: '10px 12px', border: '1px solid var(--divider)', borderRadius: 10, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
        </label>
        <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 8 }}>Send message</button>
        <p style={{ fontSize: 11, color: 'var(--muted-light)', marginBottom: 0 }}>
          By submitting, you agree to our Privacy Policy. We'll only use your info to reply to you.
        </p>
      </div>
    </form>
  );
}
