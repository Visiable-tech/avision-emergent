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
  reels: (category?: string, limit = 20) =>
    req(`/reels?limit=${limit}${category ? `&category=${encodeURIComponent(category)}` : ''}`),
  reelDetail: (id: string) => req(`/reels/${id}`),
  liveBatches: (category?: string, limit = 10) =>
    req(`/live-batches?limit=${limit}${category ? `&category=${encodeURIComponent(category)}` : ''}`),
  liveBatchDetail: (id: string) => req(`/live-batches/${id}`),
  // Live Courses (full sales + enrollment flow)
  liveCourses: (opts: { category?: string; exam?: string; language?: string; sort?: string } = {}) => {
    const p = new URLSearchParams();
    Object.entries(opts).forEach(([k, v]) => {
      if (v) p.set(k, String(v));
    });
    const qs = p.toString();
    return req(`/live-courses${qs ? `?${qs}` : ''}`);
  },
  liveCourseFilters: () => req(`/live-courses/filters`),
  liveCourseDetail: (id: string) => req(`/live-courses/${id}`, undefined, true),
  liveCourseFaculties: () => req('/live-courses/faculties'),
  liveCourseFacultyDetail: (fid: string) => req(`/live-courses/faculties/${fid}`),
  liveCourseMyEnrollments: () => req('/live-courses/enrollments/mine', undefined, true),
  liveCoursePayConfig: () => req('/live-courses/pay/config'),
  liveCourseCreateOrder: (cid: string) =>
    req(`/live-courses/${cid}/pay/order`, { method: 'POST' }, true),
  liveCourseVerify: (cid: string, payload: any) =>
    req(`/live-courses/${cid}/pay/verify`, { method: 'POST', body: JSON.stringify(payload) }, true),
  liveCourseFreeEnroll: (cid: string) =>
    req(`/live-courses/${cid}/enroll/free`, { method: 'POST' }, true),
  // Phase 2 — Learning Dashboard
  liveCourseDashboard: (cid: string) => req(`/live-courses/dashboard/${cid}`, undefined, true),
  liveCourseUpdateProgress: (
    cid: string,
    patch: { live_attended?: number; lessons_watched?: number; mocks_attempted?: number; questions_solved?: number; streak_days?: number },
  ) =>
    req(`/live-courses/dashboard/${cid}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }, true),
  liveCourseSession: (sid: string) => req(`/live-courses/session/${sid}`, undefined, true),
  // Phase 3 — Live Classroom (real sessions + WebSocket)
  lcSessions: (courseId: string) =>
    req(`/live-classroom/sessions?course_id=${encodeURIComponent(courseId)}`, undefined, true),
  lcSession: (sid: string) => req(`/live-classroom/sessions/${sid}`, undefined, true),
  lcChat: (sid: string, limit = 100) =>
    req(`/live-classroom/sessions/${sid}/chat?limit=${limit}`, undefined, true),
  lcToggleHandRaise: (sid: string) =>
    req(`/live-classroom/sessions/${sid}/hand-raise`, { method: 'POST' }, true),
  lcHandRaises: (sid: string) =>
    req(`/live-classroom/sessions/${sid}/hand-raises`, undefined, true),
  lcCreatePoll: (sid: string, question: string, options: string[]) =>
    req(`/live-classroom/sessions/${sid}/polls`, {
      method: 'POST',
      body: JSON.stringify({ question, options }),
    }, true),
  lcVotePoll: (pid: string, option_id: string) =>
    req(`/live-classroom/polls/${pid}/vote`, {
      method: 'POST',
      body: JSON.stringify({ option_id }),
    }, true),
  lcClosePoll: (pid: string) =>
    req(`/live-classroom/polls/${pid}/close`, { method: 'POST' }, true),
  lcMyRole: () => req('/live-classroom/me/role', undefined, true),
  lcPromoteInstructor: () => req('/live-classroom/dev/promote-instructor', { method: 'POST' }, true),
  // Phase 4 — Study Materials
  studyMaterialsSummary: (course_id: string) =>
    req(`/study-materials/summary?course_id=${encodeURIComponent(course_id)}`, undefined, true),
  studyMaterialsList: (course_id: string, subject?: string, type?: string) => {
    const p = new URLSearchParams({ course_id });
    if (subject) p.set('subject', subject);
    if (type) p.set('type', type);
    return req(`/study-materials?${p.toString()}`, undefined, true);
  },
  studyMaterialOpen: (mid: string) => req(`/study-materials/${mid}`, undefined, true),
  // Phase 4 — Course Analytics
  courseAnalytics: (cid: string) => req(`/live-courses/analytics/${cid}`, undefined, true),
  // Phase 5 — AI Doubt Solver
  aiCreateThread: (payload: { subject?: string; exam?: string; message?: string; image_base64?: string | null; course_id?: string }) =>
    req(`/ai-doubt/threads`, { method: 'POST', body: JSON.stringify(payload) }, true),
  aiListThreads: () => req(`/ai-doubt/threads`, undefined, true),
  aiThreadDetail: (tid: string) => req(`/ai-doubt/threads/${tid}`, undefined, true),
  aiSendMessage: (tid: string, message: string, image_base64?: string | null) =>
    req(`/ai-doubt/threads/${tid}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, image_base64: image_base64 || null }),
    }, true),
  aiDeleteThread: (tid: string) => req(`/ai-doubt/threads/${tid}`, { method: 'DELETE' }, true),
  // Video Courses (Phase 1)
  vcCategories: () => req('/video-courses/categories'),
  vcList: (category?: string, sort?: string) => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (sort) p.set('sort', sort);
    const qs = p.toString();
    return req(`/video-courses${qs ? `?${qs}` : ''}`);
  },
  vcDetail: (cid: string) => req(`/video-courses/${cid}`, undefined, true),
  vcValidateCoupon: (code: string, price: number) =>
    req('/video-courses/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, price }),
    }, true),
  vcCreateOrder: (cid: string, coupon_code?: string) =>
    req(`/video-courses/${cid}/pay/order`, {
      method: 'POST',
      body: JSON.stringify({ coupon_code: coupon_code || '' }),
    }, true),
  vcVerify: (cid: string, payload: any) =>
    req(`/video-courses/${cid}/pay/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true),
  vcFreeEnroll: (cid: string) =>
    req(`/video-courses/${cid}/enroll/free`, { method: 'POST' }, true),
  vcMyEnrollments: () => req('/video-courses/enrollments/mine', undefined, true),
  vcContinue: () => req('/video-courses/continue-learning', undefined, true),
  vcProgress: (cid: string) => req(`/video-courses/${cid}/progress`, undefined, true),
  vcAnalytics: (cid: string) => req(`/video-courses/${cid}/analytics`, undefined, true),
  vcLecture: (cid: string, lecId: string) =>
    req(`/video-courses/${cid}/lecture/${lecId}`, undefined, true),
  vcSaveProgress: (
    cid: string,
    body: { lecture_id: string; watched_pct?: number; last_pos_seconds?: number; watch_seconds_delta?: number; completed?: boolean },
  ) =>
    req(`/video-courses/${cid}/progress`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, true),
  examInfo: (category?: string) =>
    req(`/exam-info${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  examInfoDetail: (id: string) => req(`/exam-info/${id}`),
  // Test Prime
  tpLanding: (category?: string) =>
    req(`/test-prime/landing${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  tpCategories: () => req('/test-prime/categories'),
  tpExams: (category?: string, state?: string, q?: string) => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (state) p.set('state', state);
    if (q) p.set('q', q);
    const qs = p.toString();
    return req(`/test-prime/exams${qs ? `?${qs}` : ''}`);
  },
  tpExamDetail: (id: string) => req(`/test-prime/exams/${id}`),
  tpTestTypes: () => req('/test-prime/test-types'),
  tpTests: (opts: { exam?: string; category?: string; type?: string; free_only?: boolean; prime_only?: boolean; sort?: string; q?: string; user_id?: string } = {}) => {
    const p = new URLSearchParams();
    Object.entries(opts).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
    });
    const qs = p.toString();
    return req(`/test-prime/tests${qs ? `?${qs}` : ''}`);
  },
  tpTestDetail: (id: string, user_id?: string) =>
    req(`/test-prime/tests/${id}${user_id ? `?user_id=${encodeURIComponent(user_id)}` : ''}`),
  tpEntitlement: (user_id: string) => req(`/test-prime/entitlement?user_id=${encodeURIComponent(user_id)}`),
  tpActivate: (user_id: string, plan: string, duration_days = 365) =>
    req(`/test-prime/entitlement/activate?user_id=${encodeURIComponent(user_id)}`, {
      method: 'POST', body: JSON.stringify({ plan, duration_days }),
    }),
  tpReset: (user_id: string) =>
    req(`/test-prime/entitlement/reset?user_id=${encodeURIComponent(user_id)}`, { method: 'POST' }),
  // Test Prime — CBT / Attempts
  tpStartAttempt: (user_id: string, test_id: string, language?: string) =>
    req(`/test-prime/attempts/start?user_id=${encodeURIComponent(user_id)}`, {
      method: 'POST',
      body: JSON.stringify({ test_id, language }),
    }),
  tpAttempt: (attempt_id: string, user_id: string) =>
    req(`/test-prime/attempts/${attempt_id}?user_id=${encodeURIComponent(user_id)}`),
  tpSaveState: (
    attempt_id: string,
    user_id: string,
    state: {
      answers?: Record<string, number>;
      marked?: string[];
      seen?: string[];
      current_index?: number;
      total_time_left_sec?: number;
      section_times?: Record<string, number>;
      active_section?: string;
    },
  ) =>
    req(`/test-prime/attempts/${attempt_id}/state?user_id=${encodeURIComponent(user_id)}`, {
      method: 'PATCH',
      body: JSON.stringify(state),
    }),
  tpSubmitAttempt: (attempt_id: string, user_id: string) =>
    req(`/test-prime/attempts/${attempt_id}/submit?user_id=${encodeURIComponent(user_id)}`, {
      method: 'POST',
    }),
  tpAnalytics: (attempt_id: string, user_id: string) =>
    req(`/test-prime/attempts/${attempt_id}/analytics?user_id=${encodeURIComponent(user_id)}`),
  tpListAttempts: (user_id: string, limit = 20, test_id?: string) =>
    req(`/test-prime/attempts?user_id=${encodeURIComponent(user_id)}&limit=${limit}${test_id ? `&test_id=${encodeURIComponent(test_id)}` : ''}`),
  tpAttemptSummary: (test_id: string, user_id: string) =>
    req(`/test-prime/attempts/summary/${test_id}?user_id=${encodeURIComponent(user_id)}`),
  tpLogViolation: (attempt_id: string, user_id: string, type: string, note?: string) =>
    req(`/test-prime/attempts/${attempt_id}/violation?user_id=${encodeURIComponent(user_id)}`, {
      method: 'POST',
      body: JSON.stringify({ type, note }),
    }),
  // Test Prime — Admin
  tpAdminStats: () => req('/test-prime/admin/stats'),
  tpAdminQuestions: (subject?: string, topic?: string, q?: string) => {
    const p = new URLSearchParams();
    if (subject) p.set('subject', subject);
    if (topic) p.set('topic', topic);
    if (q) p.set('q', q);
    const qs = p.toString();
    return req(`/test-prime/admin/questions${qs ? `?${qs}` : ''}`);
  },
  tpAdminCreateQuestion: (body: {
    subject: string;
    topic: string;
    text: string;
    options: string[];
    correct: number;
    difficulty?: string;
    explanation?: string;
    tags?: string[];
  }) =>
    req(`/test-prime/admin/questions`, { method: 'POST', body: JSON.stringify(body) }),
  tpAdminUpdateQuestion: (qid: string, body: any) =>
    req(`/test-prime/admin/questions/${qid}`, { method: 'PATCH', body: JSON.stringify(body) }),
  tpAdminDeleteQuestion: (qid: string) =>
    req(`/test-prime/admin/questions/${qid}`, { method: 'DELETE' }),
  tpAdminTests: (exam?: string, q?: string) => {
    const p = new URLSearchParams();
    if (exam) p.set('exam', exam);
    if (q) p.set('q', q);
    const qs = p.toString();
    return req(`/test-prime/admin/tests${qs ? `?${qs}` : ''}`);
  },
  tpAdminCreateTest: (body: {
    name: string;
    exam_id: string;
    type?: string;
    is_free?: boolean;
    duration_min?: number;
    questions?: number;
    marks?: number;
  }) => req(`/test-prime/admin/tests`, { method: 'POST', body: JSON.stringify(body) }),
  tpAdminDeleteTest: (tid: string) =>
    req(`/test-prime/admin/tests/${tid}`, { method: 'DELETE' }),

  // Magazine
  magazines: (category?: string) =>
    req(`/magazine${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  magazineIssue: (id: string) => req(`/magazine/${id}`),
  magazineArticle: (id: string) => req(`/magazine/article/${id}`),

  // Booster
  boosters: (category?: string, subject?: string) => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (subject) p.set('subject', subject);
    const qs = p.toString();
    return req(`/booster${qs ? `?${qs}` : ''}`);
  },
  boosterPack: (id: string) => req(`/booster/${id}`),

  // Razorpay
  tpPayConfig: () => req('/test-prime/pay/config'),
  tpCreateOrder: (user_id: string, plan_id: string) =>
    req(`/test-prime/pay/order?user_id=${encodeURIComponent(user_id)}`, {
      method: 'POST',
      body: JSON.stringify({ plan_id }),
    }),
  tpVerifyPayment: (user_id: string, payload: any) =>
    req(`/test-prime/pay/verify?user_id=${encodeURIComponent(user_id)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
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
