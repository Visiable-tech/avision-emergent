# AVISION ONE — Phase 2 (Website) — Iteration 1 Status

**Date:** 2026‑06 (June 2026)
**Iteration goal:** Kick off `avision.co.in` public marketing website (B1 scope)
**Status:** ✅ **Iteration 1 complete — marketing site running end‑to‑end**

---

## 1. What was shipped

### New project: `/app/website/` — Next.js 15 (App Router)
```
website/
├── package.json                 next 15.5, react 19-rc, lucide-react
├── next.config.mjs              /api/* proxy → FastAPI backend
├── tsconfig.json                @/* → src/*
├── .env                         NEXT_PUBLIC_API_ORIGIN, SITE_URL
└── src/
    ├── lib/api.ts               typed AVISION ONE backend client
    ├── components/
    │   ├── Header.tsx           sticky nav
    │   ├── Footer.tsx           4-column brand footer
    │   └── HeartbeatBeacon.tsx  registers "website" client w/ backend
    └── app/
        ├── layout.tsx           metadata + OG + Twitter + heartbeat
        ├── globals.css          full brand-blue design system
        ├── page.tsx             HOME — hero, stats, features, courses,
        │                        live, results, testimonials, CA, FAQs
        ├── exams/               list + [slug] detail
        ├── courses/             list + [id] detail
        ├── live-courses/        list + [id] detail (reuses course tpl)
        ├── current-affairs/     list + [slug] article
        ├── testimonials/
        ├── results/
        ├── faqs/
        ├── centres/
        ├── franchise/
        ├── contact/             mailto: form
        ├── [slug]/              dynamic CMS pages fallback
        ├── sitemap.ts           full auto-generated sitemap
        ├── robots.ts
        └── not-found.tsx
```

**20 routes** compiled cleanly in production build. Static + ISR + dynamic mix (see build output section).

### Supervisor
```
[program:website]
command=yarn dev            # port 3001
directory=/app/website
```
Runs alongside the existing Expo dev server and the FastAPI backend.

---

## 2. Common Backend Integration

Every page fetches from the AVISION ONE common backend via `NEXT_PUBLIC_API_ORIGIN` and passes `client=website` so backend-level visibility filters apply.

| Page | Backend endpoint(s) |
|---|---|
| Home | `/api/cms/banners_home`, `/api/products?type=video_course`, `/api/products?type=live_course`, `/api/cms/testimonials`, `/api/cms/results`, `/api/cms/current_affairs`, `/api/cms/faqs` |
| Exams list | `/api/cms/exam_categories_cms` |
| Exam detail | `/api/cms/exams_cms?q=...`, `/api/products?category=...` |
| Courses list | `/api/products?type=video_course&client=website` |
| Course detail | `/api/products/{id}?client=website` (SEO from `product.seo`) |
| Live batches | `/api/products?type=live_course&client=website` |
| Current Affairs | `/api/cms/current_affairs` |
| Testimonials | `/api/cms/testimonials` |
| Results | `/api/cms/results` |
| FAQs | `/api/cms/faqs` |
| Centres | `/api/cms/centres_v2` |
| Franchise | `/api/cms/franchises` |
| /[slug] fallback | `/api/cms/cms_web_pages/{slug}` |
| Sitemap | Aggregates products + articles + web pages |
| Heartbeat | `POST /api/heartbeat` (client=website) |

**Result:** Every piece of content created in Super Admin (bundles, testimonials, results, banners, current affairs, FAQs, franchises, centres) appears on the public website **without any code changes** — proven live.

---

## 3. System Status is now "connected"

```
$ GET /api/admin/system/status → frontend.website
{ "label": "website", "status": "connected",
  "detail": "Last heartbeat: 2026-08-05T02:25:38 • version 0.1.0" }
```

The Super Admin → System Status page now shows **all three** frontends
connected (student_app, super_admin, website). ✅

---

## 4. Verification

| Check | Route | Status |
|---|---|---|
| Home renders w/ CMS banner as hero | `/` | ✅ 200 |
| Exam category grid | `/exams` | ✅ 200 (empty state OK) |
| Video course listing | `/courses` | ✅ 200 (10 products) |
| Video course detail (bundle-aware) | `/courses/vc-ibps-po-2026` | ✅ 200, features render |
| Live batch listing | `/live-courses` | ✅ 200 (8 products) |
| Live batch detail | `/live-courses/lc-banking-po-2026` | ✅ 200 |
| Current affairs | `/current-affairs` | ✅ 200 |
| Testimonials | `/testimonials` | ✅ 200 |
| Results | `/results` | ✅ 200 |
| FAQs | `/faqs` | ✅ 200 |
| Centres | `/centres` | ✅ 200 |
| Franchise | `/franchise` | ✅ 200 |
| Contact | `/contact` | ✅ 200 |
| Dynamic CMS page (`about` seeded) | `/about` | ✅ 200 |
| 404 fallback | `/nonexistent` | ✅ 404 |
| Sitemap | `/sitemap.xml` | ✅ 200 |
| Robots.txt | `/robots.txt` | ✅ 200 |
| Production build | `yarn build` | ✅ 20 routes compiled |
| Heartbeat lights up System Status | Super Admin | ✅ connected |

---

## 5. SEO

- Per-page `<title>` templates using `{page} • Avision Institute`
- OpenGraph + Twitter meta on every page
- `<meta name="description">`, `<meta name="keywords">`
- Product detail pages consume `product.seo.{title,desc,keywords}` from the common backend (created in Super Admin!)
- Fully static sitemap.xml + robots.txt
- ISR revalidation between 60 – 600 s per route so admin edits reach the website within a minute

---

## 6. Deployment note

The Kubernetes preview ingress only routes `/` (Expo, port 3000) and `/api/*`
(FastAPI, port 8001) so the port 3001 Next.js server is **not** reachable via
the browser preview URL. The website is fully functional inside the pod and
via any direct connection to port 3001. For a production launch:

**Recommended:** Deploy `/app/website/` to Vercel (`vercel deploy`) or a
static host via `next build && next start`. Point DNS `avision.co.in` to the
deploy, and set `NEXT_PUBLIC_API_ORIGIN=https://api.avision.co.in` (or the
current backend origin).

**Alternative:** In a single-domain setup, front the Next.js and FastAPI with
an NGINX reverse-proxy: `/api/*` → FastAPI, everything else → Next.js.

---

## 7. What's next (B2 scope — future iterations)

- Student Web Portal (login, dashboard, video player, test attempts) — reuses `auth.py` JWT + `entitlements`
- Web checkout (Razorpay web SDK) → `/api/*/pay/verify` already server-verified
- Blog, Faculty profile pages
- Search across products + articles
- Multi-language switch (Hindi ↔ English)
- Rich text article body → MDX / TipTap output rendering
