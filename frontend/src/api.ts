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
  examDetail: (id: string) => req(`/exams/${id}`),
  courses: () => req('/courses'),
  activeCourses: () => req('/courses/active'),
  courseDetail: (id: string) => req(`/courses/${id}`),
  liveClasses: () => req('/live-classes'),
  currentAffairs: () => req('/current-affairs'),
  currentAffairsDetail: (id: string) => req(`/current-affairs/${id}`),
  dailyQuiz: () => req('/daily-quiz'),
  submitQuiz: (quiz_id: string, answers: number[]) =>
    req('/quiz/submit', { method: 'POST', body: JSON.stringify({ quiz_id, answers }) }),
  mockTests: () => req('/mock-tests'),
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
  register: (body: { name: string; email: string; password: string; phone: string; course_id: string }) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (email: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => req('/auth/me', undefined, true),
  logout: () => req('/auth/logout', { method: 'POST' }, true),
  forgotPassword: (email: string) =>
    req('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, new_password: string) =>
    req('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
  updateCourse: (course_id: string) =>
    req('/auth/update-course', { method: 'POST', body: JSON.stringify({ course_id }) }, true),
};
