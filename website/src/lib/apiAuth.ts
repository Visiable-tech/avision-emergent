/**
 * Auth-aware API client for server components + route handlers.
 * Uses the HTTP-only cookie to attach the JWT.
 */
import { API_ORIGIN } from './api';
import { getSessionToken } from './session';

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getSessionToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_ORIGIN}/api${path}`, { ...init, headers, cache: 'no-store' });
}

export async function authedGet<T = any>(path: string): Promise<T | null> {
  const r = await authFetch(path);
  if (!r.ok) return null;
  return r.json();
}

export async function authedPost<T = any>(path: string, body: any): Promise<T | null> {
  const r = await authFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!r.ok) return null;
  return r.json();
}

// Typed helpers
export type Me = {
  user_id: string; name: string; email: string; phone?: string;
  category_id?: string; language?: string;
  coins?: number; xp?: number; streak?: number; level?: number;
  avision_id?: string; roles?: string[];
};

export type Entitlement = {
  product_id: string; product_type: string;
  granted_at: string; expires_at?: string; active: boolean;
  product?: {
    id: string; name: string; banner_image?: string; gradient?: string[];
    exam_name?: string; type: string; language?: string;
  };
};

export async function fetchMe(): Promise<Me | null> {
  return authedGet<Me>('/auth/me');
}
export async function fetchMyEntitlements(): Promise<Entitlement[]> {
  const r = await authedGet<{ entitlements: Entitlement[] }>('/entitlements/mine');
  return r?.entitlements || [];
}
export async function fetchContinueLearning(): Promise<any[]> {
  const r = await authedGet<{ items: any[] }>('/video-courses/continue-learning');
  return r?.items || [];
}
export async function fetchCourse(cid: string): Promise<any | null> {
  return authedGet(`/video-courses/${cid}`);
}
export async function fetchCourseProgress(cid: string): Promise<any | null> {
  return authedGet(`/video-courses/${cid}/progress`);
}
export async function fetchCourseAnalytics(cid: string): Promise<any | null> {
  return authedGet(`/video-courses/${cid}/analytics`);
}
export async function fetchLecture(cid: string, lid: string): Promise<any | null> {
  return authedGet(`/video-courses/${cid}/lecture/${lid}`);
}
