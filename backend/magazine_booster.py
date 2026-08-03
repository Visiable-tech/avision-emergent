"""Magazine (monthly digest) + Booster (quick prep capsules) content module."""
from typing import Optional
from fastapi import APIRouter, HTTPException

_db = None


def init_magazine_booster(db):
    global _db
    _db = db


# ==================== MAGAZINE ISSUES ====================
# Each issue contains multiple articles (editorials, guides, success stories).
MAGAZINE_ISSUES = [
    {
        "id": "aug-2026",
        "title": "August 2026 Edition",
        "subtitle": "Independence Special",
        "month": "August 2026",
        "cover_color": "#DC2626",
        "cover_accent": "#F59E0B",
        "cover_image": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80",
        "editorial": "As India celebrates 79 years of independence, this issue dives into the changing landscape of government exams, career opportunities in the public sector, and the story of aspirants who defied all odds to don the officer's uniform.",
        "category_id": None,
        "issue_no": 32,
        "pages": 84,
        "read_time_min": 45,
    },
    {
        "id": "jul-2026",
        "title": "July 2026 Edition",
        "subtitle": "Banking Special",
        "month": "July 2026",
        "cover_color": "#0B4DB8",
        "cover_accent": "#22D3EE",
        "cover_image": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80",
        "editorial": "SBI, IBPS, RBI — the season of banking recruitment is here. In this issue we decode the changing exam patterns, meet last year's toppers, and break down the exact study plan that helped them clear PO in their very first attempt.",
        "category_id": "banking",
        "issue_no": 31,
        "pages": 72,
        "read_time_min": 38,
    },
    {
        "id": "jun-2026",
        "title": "June 2026 Edition",
        "subtitle": "UPSC Prep Blueprint",
        "month": "June 2026",
        "cover_color": "#059669",
        "cover_accent": "#FBBF24",
        "cover_image": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=80",
        "editorial": "Every year, over a million aspirants take the UPSC CSE Prelims and only a few thousand clear. What separates the successful from the rest? Insights, source-lists and topper strategies for CSE 2026-27.",
        "category_id": "upsc",
        "issue_no": 30,
        "pages": 96,
        "read_time_min": 52,
    },
    {
        "id": "may-2026",
        "title": "May 2026 Edition",
        "subtitle": "SSC & Railway Recruitment",
        "month": "May 2026",
        "cover_color": "#7C3AED",
        "cover_accent": "#F472B6",
        "cover_image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
        "editorial": "With SSC CGL notification out and RRB NTPC around the corner, this issue is a masterclass on cracking Tier-1 in one attempt.",
        "category_id": "ssc",
        "issue_no": 29,
        "pages": 68,
        "read_time_min": 34,
    },
    {
        "id": "apr-2026",
        "title": "April 2026 Edition",
        "subtitle": "Law & Management Entrance",
        "month": "April 2026",
        "cover_color": "#B45309",
        "cover_accent": "#FBBF24",
        "cover_image": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
        "editorial": "From CLAT and AILET to IPMAT and NPAT — this special issue is a definitive guide to the entrance exams that shape India's top law and management programs.",
        "category_id": "law",
        "issue_no": 28,
        "pages": 76,
        "read_time_min": 40,
    },
]


ARTICLES = [
    # August issue
    {
        "id": "art-aug-1", "issue_id": "aug-2026", "kind": "editorial",
        "title": "The Officer's Uniform — Stories from the Frontlines",
        "author": "Editorial Board",
        "read_time_min": 8,
        "cover": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80",
        "excerpt": "This Independence Day, we bring you seven remarkable stories of aspirants who wore the officer's uniform against all odds.",
        "body": (
            "Every year, thousands of young Indians line up at exam centres across the country. Behind each roll number is a story of sacrifice — of parents who mortgaged land, siblings who took second jobs, and dreams postponed year after year.\n\n"
            "Ravi Kumar's morning starts at 4:00 AM in his one-room home in Chhapra. By 5:30, he's in front of the mirror in his freshly ironed uniform, headed to the SBI branch he now runs as PO. Just two years ago, Ravi was cycling 18km each way to attend evening coaching. His father, a daily wage labourer, told him, 'Beta, agar tu paas ho gaya to yeh cycle mera insaan ban jayegi.' \n\n"
            "Meera Menon, who cleared UPSC in her fifth attempt, remembers the day she made her mother sit in a chair and told her, 'Amma, I'm leaving the private job. I want to serve.' Her mother — who had spent her life scrubbing floors so Meera could study — simply nodded and said, 'Do it. Just don't come back to me without your uniform.'\n\n"
            "These are not stories of luck. They are stories of extraordinary discipline, mentors who believed, and communities that quietly cheer. This Independence Day, we salute every aspirant still fighting — the exam clock isn't your enemy. Your excuses are."
        ),
    },
    {
        "id": "art-aug-2", "issue_id": "aug-2026", "kind": "career-guide",
        "title": "Career Paths After Graduation: The Government Way",
        "author": "Anjali Sharma, IRS",
        "read_time_min": 10,
        "cover": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
        "excerpt": "A no-nonsense guide to the top 12 government career paths for graduates in 2026 — eligibility, exam, salary and growth trajectory.",
        "body": (
            "The idea of a 'government job' is often reduced to civil services in popular imagination. In reality, the Union and State governments together offer 40+ officer-level career streams, each with its own exam and its own reward curve.\n\n"
            "**1. Civil Services (UPSC CSE)** — the gold standard. IAS, IPS, IFS. Age limit 21–32 for general. Entry salary ~₹56,100 (Level 10) + perks. Ceiling: Cabinet Secretary at ₹2.5L.\n\n"
            "**2. Indian Foreign Service** — through UPSC CSE. Post to embassies. Great for those who love travel and diplomacy.\n\n"
            "**3. Banking (SBI PO / IBPS PO)** — starting salary ~₹57,000 all-inclusive. Rapid promotions available.\n\n"
            "**4. RBI Grade B Officer** — a specialist regulator role. Salary ~₹1L in-hand, extensive research exposure.\n\n"
            "**5. SEBI Grade A** — regulator for capital markets. Younger org, better work-life balance.\n\n"
            "**6. LIC AAO** — insurance sector officer. High job security, stable growth.\n\n"
            "**7. Central Armed Police Forces** — Assistant Commandant. For those drawn to service in uniform.\n\n"
            "**8. Public Sector Undertakings (GATE + Interview)** — ONGC, BHEL, IOCL, GAIL. Salary CTC ₹18-24L.\n\n"
            "**9. Railways (RRB SSE / JE / Group B)** — sprawling, well-remunerated.\n\n"
            "**10. Judiciary (State PCS-J)** — for LLB graduates. Chief Justice of India ceiling.\n\n"
            "**11. Teaching (UGC NET / State TET / Kendriya Vidyalaya)** — pension, holidays, respect.\n\n"
            "**12. State PSCs (WBCS, MPPSC, UPPSC)** — 3× the vacancies of UPSC, comparable salary and prestige within the state."
        ),
    },
    {
        "id": "art-aug-3", "issue_id": "aug-2026", "kind": "expert-column",
        "title": "How I Cleared UPSC While Working Full-Time",
        "author": "Kavya Nair, IAS",
        "read_time_min": 6,
        "cover": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
        "excerpt": "A 90-day method to prepare for UPSC Prelims while holding down a demanding job — from the woman who cracked it at rank 47.",
        "body": (
            "In 2022, I was working 60-hour weeks at a Big-4 firm. In 2024, I got a call: All India Rank 47 in UPSC CSE. Here's the system that worked.\n\n"
            "1. **Weekdays: 2 hours strict, at fixed hours.** Mine were 6-7 AM (revision) and 9:30-10:30 PM (fresh reading). Nothing more. No guilt.\n\n"
            "2. **Weekends: 8+2 formula.** 8 hours new content on Saturday, 2 hours revision on Sunday.\n\n"
            "3. **NCERT + one standard book per subject. Period.** I never chased the 'must-read' list. My source list fit on one page.\n\n"
            "4. **Daily current affairs = 30 min max.** The Hindu editorial + Insights daily quiz. That's it.\n\n"
            "5. **10 Prelims mocks in the last 30 days. Non-negotiable.** Do them at exam time, in one sitting.\n\n"
            "The job doesn't kill your UPSC dream. Inconsistency does."
        ),
    },
    # July issue - Banking
    {
        "id": "art-jul-1", "issue_id": "jul-2026", "kind": "guide",
        "title": "SBI PO 2026: The Ultimate Preparation Guide",
        "author": "Rakesh Bansal, Ex-SBI",
        "read_time_min": 12,
        "cover": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
        "excerpt": "Everything you need to know about SBI PO 2026 — new pattern, cutoffs, mock strategy, and interview tips from ex-panel members.",
        "body": (
            "SBI PO 2026 is expected to see over 15 lakh applicants for 2,000+ vacancies. Here's the game plan.\n\n"
            "**Prelims (June-July)**\n- English (30 Qs / 20 min) — RC, Cloze, Error, Rearrangement\n- Quant (35 Qs / 20 min) — DI-heavy, arithmetic\n- Reasoning (35 Qs / 20 min) — Puzzles rule, seating heavy\n\nSectional cut-off is high — around 60% of section marks. Overall cut-off ~72/100.\n\n"
            "**Mains (August)**\n- Reasoning + Computer (45 Qs / 60 min)\n- Data Analysis (35 Qs / 45 min) — the trickiest section\n- General Awareness (40 Qs / 35 min) — banking-focused CA\n- English (35 Qs / 40 min) — descriptive-plus\n\nDescriptive test: 2 questions, 50 marks, 30 min. Letter + Essay.\n\n"
            "**Interview & GD (Sep-Oct)**\n- Group discussion 5-8 candidates, 15 mins\n- Personal interview 15-25 mins\n\n"
            "**Mock Strategy** — 15-20 full-length before Prelims, 8-12 before Mains. Analyze *time-per-question* more than accuracy."
        ),
    },
    {
        "id": "art-jul-2", "issue_id": "jul-2026", "kind": "topper-interview",
        "title": "AIR 1 SBI PO 2025: 'I studied 4 hours a day, not 12'",
        "author": "Rohan Deshmukh — SBI PO Rank 1",
        "read_time_min": 9,
        "cover": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80",
        "excerpt": "The Rank 1 of SBI PO 2025 reveals his 4-hour-a-day plan, favourite YouTube channels, and the one mistake most aspirants make.",
        "body": (
            "I did not study 12 hours a day. Nobody does — the ones who claim they did, mostly lie.\n\n"
            "My daily block was 6-8 AM (concept building), 6:30-8:30 PM (practice + mock analysis). Weekends were 5 hours + 3 hours. Every Wednesday, one full-length mock.\n\n"
            "The one mistake: **jumping between sources.** I stuck to Adda247's arithmetic module for quant, Anujjindal for banking awareness, TheHindu for English, and the Test Prime bank on Avision for practice. Nothing else. Ever.\n\n"
            "For interview: prepare **300 words on yourself, family, hobbies, banking sector news of last 6 months, and 3 opinions** on any issue. Practice speaking these out loud daily.\n\n"
            "Most importantly, sleep 7 hours. This exam is a marathon of focus, not endurance."
        ),
    },
    # June issue - UPSC
    {
        "id": "art-jun-1", "issue_id": "jun-2026", "kind": "guide",
        "title": "UPSC Prelims 2026: What Actually Changed",
        "author": "Editorial Board",
        "read_time_min": 11,
        "cover": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=80",
        "excerpt": "Decoding the subtle-but-critical shift in UPSC Prelims 2026 — more CA weightage, tighter option design, and what to prioritise.",
        "body": (
            "The 2025 Prelims signalled clear trends that will continue in 2026:\n\n"
            "1. **Current affairs is now 45-50% of GS Paper 1**, up from ~30% five years ago.\n2. **Options are closer** — the difference between the right and wrong option in factual questions is often a single word.\n3. **Environment + Economy dominate the CA share** — 20% each.\n4. **CSAT is not a formality anymore** — 12-15% of aspirants failed CSAT last year despite clearing GS.\n\n"
            "**Priority in the last 90 days:**\n- Weeks 12-9 out: complete NCERTs + one standard book/subject\n- Weeks 9-6: 12 sectional tests (subject-wise)\n- Weeks 6-3: **10 full mocks**\n- Last 3 weeks: revision only. No new sources.\n\nFor CSAT: solve 300+ RC passages and 200+ DI sets. That alone gets you across the 33% qualifying mark."
        ),
    },
    # May issue - SSC / Railway
    {
        "id": "art-may-1", "issue_id": "may-2026", "kind": "guide",
        "title": "SSC CGL Tier-1: 30-Day Countdown Strategy",
        "author": "Amit Bhatia, SSC AAO",
        "read_time_min": 8,
        "cover": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
        "excerpt": "Score 180+ in Tier-1 with this 30-day sprint plan — subject-wise micro-targets, mock frequency, and revision loops.",
        "body": (
            "SSC CGL Tier-1 is a speed game. 100 questions in 60 minutes = **36 seconds per question**.\n\n"
            "**Daily plan (30 days):**\n- 7-9 AM — GI + Reasoning (topic-wise practice)\n- 10-11 AM — GK (static + last 6 months CA)\n- 4-6 PM — Quant (arithmetic + advanced)\n- 8-9 PM — English (vocab + grammar)\n- 9-9:45 PM — one 45-min mini-mock\n\n"
            "**Mock schedule** — 15 full-length + 30 sectional, analyzed strictly. Skip any topic where accuracy < 65% after 3 attempts.\n\n"
            "**Cutoff target**: General 155, OBC 145, SC 140, ST 132. Aim 175+ for safety."
        ),
    },
    # April issue - Law
    {
        "id": "art-apr-1", "issue_id": "apr-2026", "kind": "guide",
        "title": "CLAT 2026: Legal Reasoning Mastery",
        "author": "Prof. Meera Kaul, NLU-D",
        "read_time_min": 10,
        "cover": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
        "excerpt": "Legal Reasoning is CLAT's highest-scoring section — and also the most misunderstood. Here's the framework to nail all 32 questions.",
        "body": (
            "Legal Reasoning in CLAT is NOT law knowledge. It is a **rules-plus-facts** exercise: read the rule, apply strictly, ignore your instinct.\n\n"
            "**Step-by-step framework:**\n1. Read the fact pattern once, quickly. 30 sec.\n2. Read the rule/principle carefully. 30 sec.\n3. Underline exceptions in the rule.\n4. Read the question stem — is it asking for the correct legal position, or the strongest argument?\n5. Match each option against the rule; eliminate 2 immediately.\n6. Between the last two, pick the one that follows *strictly from* the rule — not the 'fair' one.\n\n"
            "**Common trap**: options that quote real Indian law you learnt in school. Ignore your general knowledge — apply *the given rule* only.\n\n"
            "Target 26/32 in Legal Reasoning. That alone puts you in the top 3% of test takers."
        ),
    },
]


# ==================== BOOSTER PACKS ====================
# Compact study capsules — formulas, mind maps, tricks. Under 10 min each.
BOOSTER_PACKS = [
    # QUANT
    {
        "id": "bp-quant-arith", "title": "Arithmetic Sprint",
        "subject": "Quantitative Aptitude", "category_id": None,
        "difficulty": "Medium", "duration_min": 7, "sections": 6,
        "color": "#2563EB", "accent": "#93C5FD",
        "icon": "calculator",
        "cover_gradient": ["#2563EB", "#7C3AED"],
        "tagline": "35 must-know arithmetic shortcuts — from percentage to Time-Speed-Distance.",
        "content": [
            {"h": "Percentage → Fraction Conversion", "b": "Memorize: 25%=1/4, 20%=1/5, 12.5%=1/8, 6.25%=1/16, 33.33%=1/3, 16.67%=1/6, 66.67%=2/3, 40%=2/5, 60%=3/5, 80%=4/5. Use these instead of decimals — saves 20-30 seconds per DI question."},
            {"h": "Successive Percentage Formula", "b": "Successive change of a% and b% = (a + b + ab/100)%. For increase-then-decrease: sign matters. Example: 20% up + 20% down = 20 - 20 - 400/100 = -4% (net 4% decrease)."},
            {"h": "Profit & Loss — Marked Price Play", "b": "CP × (100 + Gain%) = SP × 100. If MP is x% above CP and Discount is d% then Profit% = x - d - xd/100."},
            {"h": "Time & Work — LCM Method", "b": "Take LCM of days as total work. Person's efficiency = LCM ÷ days. Combined efficiency = sum. Solves 90% of T&W in under 30 seconds."},
            {"h": "Time-Speed-Distance — The 5:18 Trick", "b": "km/h → m/s: multiply by 5/18. m/s → km/h: multiply by 18/5. Two trains crossing: relative speed. Same direction: subtract. Opposite: add."},
            {"h": "Compound Interest — 1-year & 2-year", "b": "1 yr: CI = SI at same rate. 2 yr: CI = SI + (SI × R/200). 3 yr: CI = P × (3R + 3R²/100 + R³/10000) / 100."},
        ],
    },
    {
        "id": "bp-quant-di", "title": "Data Interpretation Speedrun",
        "subject": "Quantitative Aptitude", "category_id": None,
        "difficulty": "Hard", "duration_min": 9, "sections": 5,
        "color": "#0EA5E9", "accent": "#7DD3FC",
        "icon": "chart-bar",
        "cover_gradient": ["#0EA5E9", "#2563EB"],
        "tagline": "Decode any DI set in 3 minutes — pie, bar, line, table, caselet.",
        "content": [
            {"h": "The 20-second Skim Rule", "b": "Before touching any question, spend 20 seconds identifying: total values, units, time span, and the smallest/largest value. This context prevents rework later."},
            {"h": "Percentage Change in DI", "b": "% change = (new-old)/old × 100. If asked 'by what % is A more than B', answer is (A-B)/B × 100. Common mistake: dividing by A."},
            {"h": "Averages in DI", "b": "Sum first, divide last. If asked 'ratio of averages', it equals ratio of sums when counts are equal."},
            {"h": "Caselet Method", "b": "Draw a table. Fill given data. Use variables (a, b, c) for unknowns. Solve 2-3 questions from same setup — never re-read the passage."},
            {"h": "Pie Chart Trap", "b": "Watch out for pie charts where the total is NOT given — you can only compute ratios, not absolutes. If a question asks for an absolute value, some other info must be given."},
        ],
    },
    # REASONING
    {
        "id": "bp-reasoning-puzzles", "title": "Puzzle Solving Framework",
        "subject": "Reasoning", "category_id": None,
        "difficulty": "Hard", "duration_min": 10, "sections": 5,
        "color": "#7C3AED", "accent": "#C4B5FD",
        "icon": "puzzle",
        "cover_gradient": ["#7C3AED", "#DB2777"],
        "tagline": "Crack seating + floor + row puzzles in 5 minutes flat.",
        "content": [
            {"h": "The Anchor Rule", "b": "Every puzzle has at least one 'anchor' — an absolute position ('X sits at the extreme left', 'Y lives on the 3rd floor'). Start there, always."},
            {"h": "Marking Directions in Circular Puzzles", "b": "When people face the centre, left/right are swapped from the reader's view. Draw a small arrow at each seat pointing inward."},
            {"h": "Blood Relations + Puzzles", "b": "Convert relationships to symbols: father (F), mother (M), son (S), daughter (D). Male = square, female = circle. Draw a family tree — one glance."},
            {"h": "Linear Row Puzzles", "b": "Row of 5 or 7 people — always draw the seats first. Fill in the anchor, then use 'immediate left/right' clues before 'somewhere between' clues."},
            {"h": "The 3-Attempt Rule", "b": "If you can't crack a puzzle in 90 seconds, skip and return. Puzzles have a 60% solve rate on second attempt due to fresh perspective."},
        ],
    },
    # ENGLISH
    {
        "id": "bp-english-vocab", "title": "300 Power Vocab Words",
        "subject": "English", "category_id": None,
        "difficulty": "Easy", "duration_min": 6, "sections": 4,
        "color": "#059669", "accent": "#A7F3D0",
        "icon": "book-open-variant",
        "cover_gradient": ["#059669", "#0EA5E9"],
        "tagline": "The 300 English words that appear most often in bank/SSC/UPSC exams.",
        "content": [
            {"h": "Positive Traits (Group 1 of 4)", "b": "Meticulous, Prudent, Diligent, Assiduous, Astute, Perspicacious, Sagacious, Erudite, Eloquent, Articulate, Amiable, Affable, Congenial, Empathetic, Benevolent, Magnanimous, Altruistic, Munificent, Philanthropic, Compassionate."},
            {"h": "Negative Traits (Group 2 of 4)", "b": "Odious, Nefarious, Malicious, Malevolent, Pernicious, Insidious, Deceitful, Duplicitous, Mendacious, Obsequious, Sycophantic, Belligerent, Truculent, Cantankerous, Contentious, Petulant, Querulous, Recalcitrant, Obstinate, Intransigent."},
            {"h": "Situation Words (Group 3 of 4)", "b": "Ephemeral, Ubiquitous, Serendipity, Quintessential, Paradox, Enigma, Anomaly, Cacophony, Euphony, Debacle, Fiasco, Quagmire, Predicament, Impasse, Zenith, Nadir, Apex, Panacea, Elixir, Utopia."},
            {"h": "Common CBT One-Liners (Group 4 of 4)", "b": "Reluctant to (not 'at') · Bereft of (not 'from') · Adept at (not 'in') · Congratulate on (not 'for') · Different from (BrE) / than (AmE) · Comprised of is INCORRECT — use 'composed of' or 'comprised' (no 'of'). · Neither X nor Y takes singular verb. · Between two, among many."},
        ],
    },
    {
        "id": "bp-english-grammar", "title": "Grammar Cheat Sheet",
        "subject": "English", "category_id": None,
        "difficulty": "Easy", "duration_min": 5, "sections": 4,
        "color": "#10B981", "accent": "#6EE7B7",
        "icon": "format-text",
        "cover_gradient": ["#10B981", "#059669"],
        "tagline": "12 grammar rules that appear in 80% of error-spotting questions.",
        "content": [
            {"h": "Subject-Verb Agreement", "b": "Each / Every / Either / Neither + singular verb. Words joined by 'with', 'together with', 'as well as' — verb agrees with the FIRST noun."},
            {"h": "Tense Agreement", "b": "In a sentence with two clauses, the tense of the reporting verb governs the reported. Past → past. Present → any. Exception: universal truths always stay in present."},
            {"h": "Preposition Traps", "b": "Discuss (no 'about'), Reach (no 'at'), Comprised (of X — no 'of'), Superior/Inferior to (not 'than'), Prefer X to Y (not 'more than')."},
            {"h": "Article Trap", "b": "'The' before rivers (the Ganga), oceans (the Pacific), directions (the North), mountain ranges (the Himalayas). Zero article before continents, countries, individual mountains (Everest, Africa)."},
        ],
    },
    # GK
    {
        "id": "bp-gk-static", "title": "Static GK — 100 Fast Facts",
        "subject": "General Awareness", "category_id": None,
        "difficulty": "Easy", "duration_min": 8, "sections": 5,
        "color": "#DC2626", "accent": "#FCA5A5",
        "icon": "flag",
        "cover_gradient": ["#DC2626", "#F59E0B"],
        "tagline": "100 static-GK facts that reappear across SBI, IBPS, SSC, UPSC.",
        "content": [
            {"h": "Constitution (20 facts)", "b": "Adopted: 26 Nov 1949 · In force: 26 Jan 1950 · Drafting committee chair: Dr B.R. Ambedkar · Preamble words: 'We the People of India' · Total original schedules: 8 (now 12) · Original articles: 395 (now ~470) · Fundamental Rights: Part III · Directive Principles: Part IV · Fundamental Duties (42nd Amendment 1976): Part IVA, 11 duties · Right to Education Act 2009 → Art 21A · President's oath: administered by CJI · President's term: 5 years · Vice-President's term: 5 years · LS max strength: 552 (currently 543 elected + 2 Anglo-Indians earlier discontinued) · RS max: 250 (238 elected + 12 nominated) · CAG term: 6 years or 65 · UPSC term: 6 years or 65 · Election Commission size: 3 (CEC + 2 EC) · Attorney General: senior-most law officer."},
            {"h": "Awards & Honours (20 facts)", "b": "Bharat Ratna (highest civilian) · Padma Vibhushan · Padma Bhushan · Padma Shri · Param Vir Chakra (highest military) · Ashoka Chakra (peacetime military) · Kirti Chakra · Shaurya Chakra · Dadasaheb Phalke (cinema) · Jnanpith (literature) · Sahitya Akademi · Sangeet Natak Akademi · Arjuna Award (sport) · Dronacharya (coaching) · Khel Ratna → Major Dhyan Chand (top sport) · Nobel: Peace-Mother Teresa, Economics-Amartya Sen/Abhijit Banerjee, Literature-Tagore · Booker: Arundhati Roy, Kiran Desai, Aravind Adiga · Ramon Magsaysay · Right Livelihood."},
            {"h": "Sports (20 facts)", "b": "Cricket World Cup: 1975 (first), India won 1983, 2011, 2023 · T20 WC winners India 2007, 2024, 2026 · Hockey WC first held 1971 · Olympics first modern 1896 Athens · Chess: Anand (5×), Gukesh youngest world champ 2024 · Badminton: PV Sindhu (2016 silver, 2020 bronze) · Neeraj Chopra (Olympic gold 2020, silver 2024) · Football WC every 4 yrs, 2026 in USA/Canada/Mexico · Wimbledon: oldest tennis GS · IPL first season 2008 · Ranji Trophy — domestic first-class · Padma-Khel Ratna combined possible."},
            {"h": "Geography — India (20 facts)", "b": "Longest river: Ganga (~2525 km) · Largest state by area: Rajasthan · Largest state by pop: UP · Smallest state: Goa · Southernmost point: Indira Point (Great Nicobar) · Highest peak: Kanchenjunga (in India) · Wettest place: Mawsynram · Tropic of Cancer states: 8 (Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, Mizoram) · Longest border: Bangladesh (~4096 km) · Longest coastline: Gujarat (~1600 km) · Deepest port: Cochin · Highest waterfall: Kunchikal (Karnataka) · Largest freshwater lake: Wular (J&K)."},
            {"h": "Economy (20 facts)", "b": "RBI HQ: Mumbai · Founded: 1 April 1935 · Nationalised: 1 January 1949 · First Governor: Osborne Smith · First Indian Governor: CD Deshmukh · Current Governor (2026): Shaktikanta Das · Current Repo rate & CRR: check latest RBI policy · Fiscal year: 1 Apr – 31 Mar · GST implemented: 1 July 2017 · GST Council chair: Union FM · 15th Finance Commission chair: NK Singh · SEBI HQ: Mumbai · Founded: 1988, statutory 1992 · NSE HQ: Mumbai · BSE (Bombay Stock Exchange) — Asia's oldest · Sensex — 30 stocks · Nifty — 50 stocks · NABARD founded 1982 · SIDBI 1990."},
        ],
    },
    # CURRENT AFFAIRS
    {
        "id": "bp-ca-latest", "title": "Current Affairs Digest — Last 30 Days",
        "subject": "Current Affairs", "category_id": None,
        "difficulty": "Medium", "duration_min": 10, "sections": 4,
        "color": "#F59E0B", "accent": "#FDE68A",
        "icon": "newspaper-variant",
        "cover_gradient": ["#F59E0B", "#DC2626"],
        "tagline": "The 40 news items most likely to appear in July-Aug 2026 exams.",
        "content": [
            {"h": "National — Policy & Bills", "b": "Union Cabinet approvals, new bills passed in Monsoon Session, key policy launches under Digital India, Ayushman Bharat updates, Semiconductor Mission progress. Watch: new Broadcasting Services Bill, DPDP rules notification, PM-SVAnidhi 2.0 launch."},
            {"h": "International — Diplomacy", "b": "India's G20 legacy, BRICS+ expansion updates, QUAD Summit outcomes, Indo-Pacific Economic Framework, S. Africa G20 2026 agenda, WTO ministerial outcomes, UNGA session key resolutions India voted on."},
            {"h": "Sports", "b": "Paris 2024 & LA 2028 qualifications, Neeraj Chopra 2026 season, Chess Olympiad, Asian Games 2026 medal tally leaders, ICC event updates, ISL/Ranji winners."},
            {"h": "Awards, Deaths, Books", "b": "Nobel Prizes 2025 laureates, Bharat Ratna 2026 announcements, Padma award numbers, notable obituaries in politics/arts/science, Booker & Jnanpith winners, key books released by prominent Indians/economists."},
        ],
    },
    # LEGAL
    {
        "id": "bp-legal-clat", "title": "CLAT Legal Reasoning — 8 Rules",
        "subject": "Legal Reasoning", "category_id": "law",
        "difficulty": "Medium", "duration_min": 7, "sections": 4,
        "color": "#B45309", "accent": "#FDE68A",
        "icon": "scale-balance",
        "cover_gradient": ["#B45309", "#DC2626"],
        "tagline": "8 legal principles that appear in every CLAT paper.",
        "content": [
            {"h": "Volenti Non Fit Injuria", "b": "'To one who consents, no harm is done.' If you willingly accept a risk, you cannot claim damages later. Exception: consent must be informed and voluntary."},
            {"h": "Doctrine of Basic Structure", "b": "Established in Kesavananda Bharati (1973). Parliament can amend the Constitution but cannot destroy its basic features (democracy, secularism, federalism, judicial review, etc.)."},
            {"h": "Actus Reus + Mens Rea", "b": "For a crime: guilty act (actus reus) + guilty mind (mens rea) must coincide. Strict liability offences don't require mens rea."},
            {"h": "Consideration in Contract", "b": "Section 2(d) Indian Contract Act. Consideration is 'something in return' — need not be adequate but must be lawful and real. No consideration = void agreement (with limited exceptions in Sec 25)."},
        ],
    },
    # BANKING AWARENESS
    {
        "id": "bp-banking-awareness", "title": "Banking Awareness — 60 Facts",
        "subject": "Banking Awareness", "category_id": "banking",
        "difficulty": "Medium", "duration_min": 9, "sections": 4,
        "color": "#0B4DB8", "accent": "#93C5FD",
        "icon": "bank",
        "cover_gradient": ["#0B4DB8", "#0EA5E9"],
        "tagline": "The 60 banking facts that repeat in SBI PO, IBPS PO, RBI Grade B GK sections.",
        "content": [
            {"h": "RBI Structure & Instruments", "b": "RBI HQ Mumbai. Repo, Reverse Repo, MSF, CRR, SLR, Bank Rate, MPC (6 members, RBI Gov chairs). MPC decides policy rates. LAF = Repo + Reverse Repo. Priority Sector Lending 40% target."},
            {"h": "Banking Sector Terms", "b": "NPA (Non-Performing Asset): overdue 90+ days. SLR: govt securities holding by banks. CRR: cash reserves with RBI. Basel III capital norms. Prompt Corrective Action (PCA)."},
            {"h": "Government Schemes", "b": "PM Jan Dhan (2014, financial inclusion), Mudra Yojana (Shishu/Kishor/Tarun), Atal Pension Yojana, Sukanya Samriddhi, PM Kisan, PMAY, Ayushman Bharat PMJAY."},
            {"h": "New-Age Banking", "b": "UPI (2016, NPCI), NEFT, RTGS, IMPS, BHIM. Payment banks (max ₹2L deposit). Small finance banks. Digital rupee (e₹) piloted 2022. UPI now supports credit lines, RuPay international."},
        ],
    },
]


# ==================== ROUTES ====================
router = APIRouter(prefix="/api", tags=["magazine-booster"])


@router.get("/magazine")
async def list_issues(category: Optional[str] = None):
    items = MAGAZINE_ISSUES
    if category:
        items = [x for x in items if not x.get("category_id") or x.get("category_id") == category]
    return {"issues": items}


@router.get("/magazine/{issue_id}")
async def issue_detail(issue_id: str):
    issue = next((x for x in MAGAZINE_ISSUES if x["id"] == issue_id), None)
    if not issue:
        raise HTTPException(404, "Issue not found")
    arts = [a for a in ARTICLES if a["issue_id"] == issue_id]
    return {**issue, "articles": arts}


@router.get("/magazine/article/{article_id}")
async def article_detail(article_id: str):
    a = next((x for x in ARTICLES if x["id"] == article_id), None)
    if not a:
        raise HTTPException(404, "Article not found")
    return a


@router.get("/booster")
async def list_boosters(category: Optional[str] = None, subject: Optional[str] = None):
    items = BOOSTER_PACKS
    if category:
        items = [x for x in items if not x.get("category_id") or x.get("category_id") == category]
    if subject:
        items = [x for x in items if subject.lower() in x.get("subject", "").lower()]
    return {"packs": items}


@router.get("/booster/{pack_id}")
async def booster_detail(pack_id: str):
    b = next((x for x in BOOSTER_PACKS if x["id"] == pack_id), None)
    if not b:
        raise HTTPException(404, "Booster pack not found")
    return b
