/**
 * AVISION ONE Common Backend client (website)
 * -------------------------------------------------------------------
 * All fetches from Next.js server components use NEXT_PUBLIC_API_ORIGIN.
 * Client components can also use these helpers (they use fetch which
 * hits the same /api proxy set up in next.config.mjs).
 *
 * Every function is fully typed and passes `client=website` where
 * relevant so the backend applies website-visibility filters.
 */

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:8001';

async function apiGet<T = any>(path: string, revalidate: number | false = 60): Promise<T> {
  const url = `${API_ORIGIN}/api${path}`;
  const res = await fetch(url, {
    next: revalidate === false ? { revalidate: 0 } : { revalidate },
  });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------- CMS entities ----------
export async function cmsList<T = any>(entity: string, opts: { q?: string; limit?: number; skip?: number; client?: string } = {}): Promise<{ items: T[]; total: number }> {
  const p = new URLSearchParams();
  if (opts.q) p.set('q', opts.q);
  // Backend enforces limit<=200 (Pydantic Query(le=200)). Clamp here so a
  // typo doesn't silently break server-side rendering.
  p.set('limit', String(Math.min(opts.limit ?? 50, 200)));
  p.set('skip', String(opts.skip ?? 0));
  p.set('client', opts.client || 'website');
  return apiGet(`/cms/${entity}?${p.toString()}`);
}

export async function cmsGet<T = any>(entity: string, id: string, opts: { client?: string } = {}): Promise<T> {
  const p = new URLSearchParams();
  p.set('client', opts.client || 'website');
  return apiGet(`/cms/${entity}/${id}?${p.toString()}`);
}

// ---------- Products (shared with app) ----------
export type Product = {
  id: string;
  type: 'live_course' | 'video_course' | 'test_series' | 'booster' | 'magazine' | 'bundle';
  name: string;
  slug: string;
  price: number;
  offer_price: number;
  currency: string;
  banner_image?: string;
  gradient?: string[];
  language?: string;
  category_id?: string;
  exam_name?: string;
  features?: string[];
  validity_days?: number;
  faculty_ids?: string[];
  items?: { type: string; ref_id: string }[];
  seo?: { title?: string; desc?: string; keywords?: string[] };
  visibility?: { app?: boolean; website?: boolean };
  active?: boolean;
};

export async function listProducts(opts: { type?: string; category?: string; q?: string; limit?: number } = {}) {
  const p = new URLSearchParams();
  if (opts.type) p.set('type', opts.type);
  if (opts.category) p.set('category', opts.category);
  if (opts.q) p.set('q', opts.q);
  p.set('client', 'website');
  // Backend max is 200 — clamp to prevent silent 422s during SSR.
  p.set('limit', String(Math.min(opts.limit ?? 100, 200)));
  return apiGet<{ products: Product[]; total: number }>(`/products?${p.toString()}`);
}

export async function getProduct(id: string) {
  const p = new URLSearchParams({ client: 'website' });
  return apiGet<Product>(`/products/${id}?${p.toString()}`).catch(() => null);
}

// ---------- Heartbeat (registers the website with the common backend) ----------
export async function heartbeat(payload: { client?: string; version?: string; url?: string }) {
  return apiPost('/heartbeat', {
    client: payload.client || 'website',
    version: payload.version || '0.1.0',
    url: payload.url,
  }).catch(() => null);
}

// ---------- Common types ----------
export type CmsBanner = {
  id: string; title: string; subtitle?: string; image: string;
  gradient?: string[]; cta_label?: string; cta_url?: string;
  visibility?: { app?: boolean; website?: boolean }; display_order?: number;
};
export type Testimonial = {
  id: string; name: string; photo?: string; exam_name?: string; rank?: number;
  year?: number; quote: string; video_url?: string;
};
export type Result = {
  id: string; name: string; photo?: string; exam_name?: string; rank?: number;
  year?: number; post?: string; batch?: string;
};
export type Faq = { id: string; question: string; answer: string; section?: string };
export type Article = {
  id: string; title: string; slug: string; summary?: string; content?: string;
  category?: string; tags?: string[]; banner_image?: string;
  published_at?: string; author?: string; language?: string;
};
export type ExamCategory = {
  id: string; name: string; slug: string; description?: string;
  icon?: string; color?: string; banner_image?: string; display_order?: number;
};
export type Exam = {
  id: string; name: string; slug: string; category_id?: string;
  banner_image?: string; description?: string; eligibility?: string;
  exam_pattern?: any; syllabus?: any; important_dates?: any;
  seo?: { title?: string; desc?: string };
};
export type Faculty = { id: string; name: string; photo?: string; subjects?: string[]; bio?: string };
export type WebPage = {
  id: string; slug: string; title: string; blocks?: any[];
  seo?: { title?: string; desc?: string; keywords?: string[] };
  published?: boolean;
};
export type Centre = {
  id: string; name: string; type?: string; franchise_id?: string;
  city?: string; state?: string; pincode?: string; address?: string;
  phone?: string; manager_name?: string; seats?: number;
};
export type Franchise = {
  id: string; name: string; city?: string; state?: string;
  franchisee_name?: string; franchisee_phone?: string; status?: string;
};
