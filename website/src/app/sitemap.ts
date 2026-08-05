import type { MetadataRoute } from 'next';
import { cmsList, listProducts, type Article, type Testimonial, type WebPage } from '@/lib/api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://avision.co.in';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/exams`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/courses`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/live-courses`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/current-affairs`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/testimonials`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/results`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/faqs`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/centres`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/franchise`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/contact`, changeFrequency: 'yearly', priority: 0.5 },
  ];

  try {
    const [{ products: vc }, { products: lc }] = await Promise.all([
      listProducts({ type: 'video_course', limit: 500 }),
      listProducts({ type: 'live_course', limit: 500 }),
    ]);
    vc.forEach((p) => base.push({ url: `${SITE}/courses/${p.id}`, changeFrequency: 'weekly', priority: 0.8 }));
    lc.forEach((p) => base.push({ url: `${SITE}/live-courses/${p.id}`, changeFrequency: 'weekly', priority: 0.8 }));
  } catch {}

  try {
    const { items } = await cmsList<Article>('current_affairs', { limit: 500 });
    items.forEach((a) => base.push({ url: `${SITE}/current-affairs/${a.slug || a.id}`, changeFrequency: 'daily', priority: 0.7 }));
  } catch {}

  try {
    const { items } = await cmsList<WebPage>('cms_web_pages', { limit: 500 });
    items.forEach((p) => {
      if (p.published !== false && p.slug !== 'home') {
        base.push({ url: `${SITE}/${p.slug}`, changeFrequency: 'weekly', priority: 0.6 });
      }
    });
  } catch {}

  return base;
}
