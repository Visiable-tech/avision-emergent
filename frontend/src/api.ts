import { API } from './theme';
import { getToken, setToken } from './tokenStore';

async function req<T = any>(path: string, init?: RequestInit, withAuth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as any || {}) };
  if (withAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 401) {
    await setToken(null);
  }
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }
  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }
  return data;
}

export const api = {
  // Public
  greeting: () => req('/greeting', undefined, true),
  quickAccess: () => req('/quick-access'),
  examCategories: () => req('/exam-categories'),
  activeCategories: (search?: string) => req(`/exam-categories/active${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  categoryDetail: (id: string) => req(`/exam-categories/${id}`),
  examDetail: (id: string) => req(`/exams/${id}`),
  courses: (category?: string) => req(`/courses${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  activeCourses: (category?: string) => req(`/courses/active${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  courseDetail: (id: string) => req(`/courses/${id}`),
  liveClasses: (category?: string) => req(`/live-classes${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  currentAffairs: (category?: string) => req(`/current-affairs${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  currentAffairsLatest: (category?: string) => req(`/current-affairs/latest${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  currentAffairsDetail: (id: string) => req(`/current-affairs/${id}`),
  banners: (category?: string) => req(`/banners${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  jobAlerts: (category?: string, limit = 20) => req(`/job-alerts?limit=${limit}${category ? `&category=${encodeURIComponent(category)}` : ''}`),
  jobDetail: (id: string) => req(`/job-alerts/${id}`),
  dailyChallenges: (category?: string, userId?: string) => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (userId) p.set('user_id', userId);
    const q = p.toString();
    return req(`/daily-challenges${q ? `?${q}` : ''}`);
  },
  dailyChallengeDetail: (subjectId: string) => req(`/daily-challenges/${subjectId}`),
  dailyChallengeSubmit: (subjectId: string, answers: number[], timeTakenSec: number, userId?: string) =>
    req(`/daily-challenges/submit${userId ? `?user_id=${userId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ subject_id: subjectId, answers, time_taken_sec: timeTakenSec }),
    }),
  dailyQuiz: () => req('/daily-quiz'),
  submitQuiz: (quiz_id: string, answers: number[]) =>
    req('/quiz/submit', { method: 'POST', body: JSON.stringify({ quiz_id, answers }) }),
  mockTests: (category?: string) => req(`/mock-tests${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  leaderboard: () => req('/leaderboard'),
  profile: () => req('/profile'),
  performance: () => req('/performance'),
  aiChat: (session_id: string, message: string, mode: 'tutor' | 'planner' = 'tutor') =>
    req('/ai/chat', { method: 'POST', body: JSON.stringify({ session_id, message, mode }) }),
  aiHistory: (session_id: string) => req(`/ai/history/${session_id}`),
  aiReset: (session_id: string) => req(`/ai/reset/${session_id}`, { method: 'POST' }),
  studyPlanner: (exam: string, hours: number, weak: string[], target: string) =>
    req('/study-planner', {
      method: 'POST',
      body: JSON.stringify({ exam, hours_per_day: hours, weak_subjects: weak, target_date: target }),
    }),
  // Auth
  register: (body: { name: string; email: string; password: string; phone: string; category_id?: string; course_id?: string; language?: string }) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (email: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => req('/auth/me', undefined, true),
  logout: () => req('/auth/logout', { method: 'POST' }, true),
  // Feed
  feed: (category?: string, userId?: string) => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (userId) p.set('user_id', userId);
    const q = p.toString();
    return req(`/feed${q ? `?${q}` : ''}`);
  },
  feedDetail: (postId: string, userId?: string) =>
    req(`/feed/${postId}${userId ? `?user_id=${userId}` : ''}`),
  feedLike: (postId: string, userId: string) =>
    req(`/feed/${postId}/like?user_id=${encodeURIComponent(userId)}`, { method: 'POST' }),
  feedComments: (postId: string) => req(`/feed/${postId}/comments`),
  forgotPassword: (email: string) =>
    req('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, new_password: string) =>
    req('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
  updateCourse: (course_id: string) =>
    req('/auth/update-course', { method: 'POST', body: JSON.stringify({ course_id }) }, true),
  updateCategory: (category_id: string, selected_exam_id?: string) =>
    req('/auth/update-category', { method: 'POST', body: JSON.stringify({ category_id, selected_exam_id }) }, true),
  updateLanguage: (language: string) =>
    req('/auth/update-language', { method: 'POST', body: JSON.stringify({ language }) }, true),
};
