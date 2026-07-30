import { API } from './theme';

async function req<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  greeting: () => req('/greeting'),
  quickAccess: () => req('/quick-access'),
  examCategories: () => req('/exam-categories'),
  examDetail: (id: string) => req(`/exams/${id}`),
  courses: () => req('/courses'),
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
};
