"""Static seed data for Avision Institute app."""

EXAM_CATEGORIES = [
    {
        "id": "banking",
        "name": "Banking",
        "icon": "cash-outline",
        "color": "#0B4DB8",
        "exams": [
            {"id": "ibps-po", "name": "IBPS PO", "short": "PO"},
            {"id": "ibps-clerk", "name": "IBPS Clerk", "short": "Clerk"},
            {"id": "ibps-so", "name": "IBPS SO", "short": "SO"},
            {"id": "sbi-po", "name": "SBI PO", "short": "SBI PO"},
            {"id": "sbi-clerk", "name": "SBI Clerk", "short": "SBI"},
            {"id": "rbi-assistant", "name": "RBI Assistant", "short": "RBI"},
            {"id": "rbi-grade-b", "name": "RBI Grade B", "short": "Grade B"},
            {"id": "nabard", "name": "NABARD", "short": "NABARD"},
            {"id": "lic-aao", "name": "LIC AAO", "short": "LIC"},
            {"id": "niacl", "name": "NIACL", "short": "NIACL"},
            {"id": "uiic", "name": "UIIC", "short": "UIIC"},
            {"id": "epfo", "name": "EPFO", "short": "EPFO"},
        ],
    },
    {
        "id": "ssc",
        "name": "SSC",
        "icon": "briefcase-outline",
        "color": "#C68A2D",
        "exams": [
            {"id": "ssc-cgl", "name": "SSC CGL", "short": "CGL"},
            {"id": "ssc-chsl", "name": "SSC CHSL", "short": "CHSL"},
            {"id": "ssc-mts", "name": "SSC MTS", "short": "MTS"},
            {"id": "ssc-gd", "name": "SSC GD", "short": "GD"},
            {"id": "ssc-cpo", "name": "SSC CPO", "short": "CPO"},
            {"id": "ssc-je", "name": "SSC JE", "short": "JE"},
            {"id": "delhi-police", "name": "Delhi Police", "short": "DP"},
            {"id": "selection-post", "name": "Selection Post", "short": "SP"},
            {"id": "stenographer", "name": "Stenographer", "short": "Steno"},
        ],
    },
    {
        "id": "railway",
        "name": "Railway",
        "icon": "train-outline",
        "color": "#0B4DB8",
        "exams": [
            {"id": "rrb-ntpc", "name": "RRB NTPC", "short": "NTPC"},
            {"id": "rrb-group-d", "name": "RRB Group D", "short": "Group D"},
            {"id": "rrb-je", "name": "RRB JE", "short": "JE"},
            {"id": "alp", "name": "ALP", "short": "ALP"},
            {"id": "technician", "name": "Technician", "short": "Tech"},
            {"id": "rpf", "name": "RPF", "short": "RPF"},
        ],
    },
    {
        "id": "teaching",
        "name": "Teaching",
        "icon": "school-outline",
        "color": "#C68A2D",
        "exams": [
            {"id": "ctet", "name": "CTET", "short": "CTET"},
            {"id": "wb-tet", "name": "WB TET", "short": "WB TET"},
            {"id": "kvs", "name": "KVS", "short": "KVS"},
            {"id": "nvs", "name": "NVS", "short": "NVS"},
            {"id": "dsssb", "name": "DSSSB", "short": "DSSSB"},
            {"id": "primary-tet", "name": "Primary TET", "short": "P-TET"},
        ],
    },
    {
        "id": "law",
        "name": "Law",
        "icon": "hammer-outline",
        "color": "#0B4DB8",
        "exams": [
            {"id": "clat", "name": "CLAT", "short": "CLAT"},
            {"id": "ailet", "name": "AILET", "short": "AILET"},
            {"id": "slat", "name": "SLAT", "short": "SLAT"},
            {"id": "lsat", "name": "LSAT", "short": "LSAT"},
            {"id": "mh-cet-law", "name": "MH CET Law", "short": "MH-CET"},
        ],
    },
    {
        "id": "management",
        "name": "Management",
        "icon": "bar-chart-outline",
        "color": "#C68A2D",
        "exams": [
            {"id": "ipmat", "name": "IPMAT", "short": "IPMAT"},
            {"id": "cuet", "name": "CUET", "short": "CUET"},
            {"id": "bba-entrance", "name": "BBA Entrance", "short": "BBA"},
            {"id": "npat", "name": "NPAT", "short": "NPAT"},
            {"id": "set", "name": "SET", "short": "SET"},
            {"id": "christ-entrance", "name": "Christ Entrance", "short": "Christ"},
        ],
    },
    {
        "id": "civil-services",
        "name": "Civil Services",
        "icon": "shield-checkmark-outline",
        "color": "#0B4DB8",
        "exams": [
            {"id": "upsc", "name": "UPSC", "short": "UPSC"},
            {"id": "wbcs", "name": "WBCS", "short": "WBCS"},
            {"id": "psc", "name": "PSC", "short": "PSC"},
            {"id": "cds", "name": "CDS", "short": "CDS"},
            {"id": "capf", "name": "CAPF", "short": "CAPF"},
            {"id": "nda", "name": "NDA", "short": "NDA"},
        ],
    },
    {
        "id": "defence",
        "name": "Defence",
        "icon": "airplane-outline",
        "color": "#C68A2D",
        "exams": [
            {"id": "def-nda", "name": "NDA", "short": "NDA"},
            {"id": "def-cds", "name": "CDS", "short": "CDS"},
            {"id": "afcat", "name": "AFCAT", "short": "AFCAT"},
            {"id": "agniveer", "name": "Agniveer", "short": "Agniveer"},
            {"id": "coast-guard", "name": "Coast Guard", "short": "CG"},
        ],
    },
    {
        "id": "state-exams",
        "name": "State Exams",
        "icon": "map-outline",
        "color": "#0B4DB8",
        "exams": [
            {"id": "wbpsc", "name": "WBPSC", "short": "WBPSC"},
            {"id": "kp", "name": "KP", "short": "KP"},
            {"id": "si", "name": "SI", "short": "SI"},
            {"id": "food-si", "name": "Food SI", "short": "Food SI"},
            {"id": "excise", "name": "Excise", "short": "Excise"},
            {"id": "forest", "name": "Forest", "short": "Forest"},
            {"id": "municipality", "name": "Municipality", "short": "Muni"},
            {"id": "group-c", "name": "Group C", "short": "Group C"},
            {"id": "group-d", "name": "Group D", "short": "Group D"},
        ],
    },
]


def default_exam_detail(exam_id: str, exam_name: str):
    return {
        "id": exam_id,
        "name": exam_name,
        "overview": f"{exam_name} is a highly competitive national-level examination conducted to recruit qualified candidates. Lakhs of aspirants appear each year for a limited number of prestigious posts.",
        "eligibility": [
            "Indian citizen or eligible category as per notification",
            "Bachelor's degree from a recognized university (unless otherwise specified)",
            "Age criteria as per official notification",
        ],
        "age_limit": "21 - 30 years (relaxation for reserved categories as per rules)",
        "salary": "₹35,000 - ₹80,000 per month (in-hand, including allowances)",
        "selection_process": [
            "Preliminary Examination (Objective)",
            "Main Examination (Objective + Descriptive)",
            "Interview / Personality Test",
            "Document Verification & Medical",
        ],
        "syllabus": [
            {"subject": "Quantitative Aptitude", "topics": ["Number System", "Percentage", "Profit & Loss", "Data Interpretation"]},
            {"subject": "Reasoning Ability", "topics": ["Puzzles", "Syllogism", "Coding-Decoding", "Blood Relations"]},
            {"subject": "English Language", "topics": ["Reading Comprehension", "Cloze Test", "Grammar", "Vocabulary"]},
            {"subject": "General Awareness", "topics": ["Current Affairs", "Static GK", "Banking / Economy"]},
        ],
        "pattern": "Multiple choice questions with negative marking of 0.25 per wrong answer. Sectional & overall time limit applies.",
        "books": [
            "Quantitative Aptitude by R.S. Aggarwal",
            "A Modern Approach to Verbal Reasoning by R.S. Aggarwal",
            "Word Power Made Easy by Norman Lewis",
            "Lucent's General Knowledge",
        ],
        "strategy": "Cover NCERT-level basics first, then move to advanced practice. Take at least 3 full-length mocks per week and analyze mistakes carefully. Revise Current Affairs daily.",
        "cutoffs": [
            {"year": "2024", "general": 78.5, "obc": 74.2, "sc": 68.4, "st": 65.0},
            {"year": "2023", "general": 82.0, "obc": 77.5, "sc": 71.0, "st": 67.8},
            {"year": "2022", "general": 80.25, "obc": 75.0, "sc": 69.2, "st": 66.5},
        ],
        "previous_papers": [
            {"year": "2024", "url": "#"},
            {"year": "2023", "url": "#"},
            {"year": "2022", "url": "#"},
            {"year": "2021", "url": "#"},
        ],
        "roadmap": [
            "Month 1-2: Build foundation with NCERTs & standard books",
            "Month 3-4: Sectional tests & topic-wise practice",
            "Month 5: Full-length mocks & revision",
            "Month 6: Final revision, PYQs & mental preparation",
        ],
        "notifications": [
            {"title": f"{exam_name} 2026 Notification Released", "date": "Mar 18, 2026"},
            {"title": f"{exam_name} Admit Card Out", "date": "Apr 22, 2026"},
        ],
        "faqs": [
            {"q": f"How many attempts are allowed for {exam_name}?", "a": "As per official notification; typically 4 attempts for General category."},
            {"q": "Is coaching necessary?", "a": "Not mandatory. Self-study with the right resources and mock tests is sufficient."},
            {"q": "What is the ideal preparation duration?", "a": "6 to 12 months of dedicated study is generally recommended."},
        ],
    }


QUICK_ACCESS = [
    {"id": "video-courses", "label": "Video Courses", "icon": "play-circle-outline"},
    {"id": "live-classes", "label": "Live Classes", "icon": "videocam-outline"},
    {"id": "mock-tests", "label": "Mock Tests", "icon": "document-text-outline"},
    {"id": "current-affairs", "label": "Current Affairs", "icon": "newspaper-outline"},
    {"id": "daily-quiz", "label": "Daily Quiz", "icon": "flash-outline"},
    {"id": "ebooks", "label": "E-books", "icon": "book-outline"},
    {"id": "pyqs", "label": "PYQs", "icon": "albums-outline"},
    {"id": "performance", "label": "Performance", "icon": "stats-chart-outline"},
    {"id": "downloads", "label": "Downloads", "icon": "download-outline"},
    {"id": "certificates", "label": "Certificates", "icon": "ribbon-outline"},
    {"id": "discussion", "label": "Discussion", "icon": "chatbubbles-outline"},
    {"id": "planner", "label": "AI Planner", "icon": "sparkles-outline"},
]


COURSES = [
    {
        "id": "ssc-cgl-complete",
        "title": "SSC CGL Complete Foundation 2026",
        "instructor": "Rohan Verma",
        "subject": "SSC",
        "rating": 4.8,
        "students": 42350,
        "duration_hours": 240,
        "progress": 0.42,
        "active": True,
        "thumbnail": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80",
        "chapters": [
            {"id": "c1", "title": "Number System Fundamentals", "duration": "42 min", "watched": True},
            {"id": "c2", "title": "Percentage & Averages", "duration": "58 min", "watched": True},
            {"id": "c3", "title": "Profit, Loss & Discount", "duration": "1 hr 12 min", "watched": False},
            {"id": "c4", "title": "Time, Speed & Distance", "duration": "1 hr 05 min", "watched": False},
            {"id": "c5", "title": "Data Interpretation Mastery", "duration": "1 hr 30 min", "watched": False},
        ],
    },
    {
        "id": "banking-po-2026",
        "title": "Banking PO Master Course 2026",
        "instructor": "Aisha Khan",
        "subject": "Banking",
        "rating": 4.9,
        "students": 68120,
        "duration_hours": 310,
        "progress": 0.18,
        "active": True,
        "thumbnail": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
        "chapters": [
            {"id": "b1", "title": "Banking Awareness Basics", "duration": "38 min", "watched": True},
            {"id": "b2", "title": "Reasoning – Puzzles & Seating", "duration": "1 hr 24 min", "watched": False},
            {"id": "b3", "title": "English – RC Techniques", "duration": "55 min", "watched": False},
            {"id": "b4", "title": "Quant – DI Advanced", "duration": "1 hr 08 min", "watched": False},
        ],
    },
    {
        "id": "upsc-prelims-2026",
        "title": "UPSC Prelims Booster 2026",
        "instructor": "Dr. Anjali Rao",
        "subject": "UPSC",
        "rating": 4.7,
        "students": 29450,
        "duration_hours": 420,
        "progress": 0.0,
        "active": True,
        "thumbnail": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
        "chapters": [
            {"id": "u1", "title": "Indian Polity – Constitution", "duration": "1 hr 12 min", "watched": False},
            {"id": "u2", "title": "Modern History – 1857 Revolt", "duration": "48 min", "watched": False},
            {"id": "u3", "title": "Geography – Climate", "duration": "58 min", "watched": False},
        ],
    },
    {
        "id": "clat-2026",
        "title": "CLAT 2026 Complete Course",
        "instructor": "Nikhil Sharma",
        "subject": "Law",
        "rating": 4.6,
        "students": 15320,
        "duration_hours": 180,
        "progress": 0.0,
        "active": True,
        "thumbnail": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
        "chapters": [
            {"id": "l1", "title": "Legal Reasoning Basics", "duration": "45 min", "watched": False},
            {"id": "l2", "title": "Logical Reasoning", "duration": "52 min", "watched": False},
        ],
    },
    {
        "id": "rrb-ntpc-2026",
        "title": "RRB NTPC Complete Course 2026",
        "instructor": "Sanjeev Yadav",
        "subject": "Railway",
        "rating": 4.7,
        "students": 38900,
        "duration_hours": 220,
        "progress": 0.0,
        "active": True,
        "thumbnail": "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80",
        "chapters": [
            {"id": "r1", "title": "General Awareness Foundation", "duration": "50 min", "watched": False},
            {"id": "r2", "title": "Quant – Arithmetic Basics", "duration": "1 hr 05 min", "watched": False},
        ],
    },
    {
        "id": "ctet-2026",
        "title": "CTET Paper I & II Mastery 2026",
        "instructor": "Meera Iyer",
        "subject": "Teaching",
        "rating": 4.8,
        "students": 22140,
        "duration_hours": 160,
        "progress": 0.0,
        "active": True,
        "thumbnail": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
        "chapters": [
            {"id": "t1", "title": "Child Development & Pedagogy", "duration": "1 hr", "watched": False},
        ],
    },
]


LIVE_CLASSES = [
    {"id": "lc1", "title": "SSC CGL – Quant Live Doubt Session", "instructor": "Rohan Verma", "time": "Today, 7:00 PM", "status": "upcoming", "students": 1240, "thumbnail": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80"},
    {"id": "lc2", "title": "Banking – Reasoning Puzzles Marathon", "instructor": "Aisha Khan", "time": "Tomorrow, 6:30 PM", "status": "upcoming", "students": 980, "thumbnail": "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80"},
    {"id": "lc3", "title": "UPSC – Polity Rapid Revision", "instructor": "Dr. Anjali Rao", "time": "Live Now", "status": "live", "students": 2130, "thumbnail": "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80"},
    {"id": "lc4", "title": "Current Affairs – Weekly Wrap", "instructor": "Team Avision", "time": "Sat, 5:00 PM", "status": "upcoming", "students": 3450, "thumbnail": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80"},
]


CURRENT_AFFAIRS = [
    {"id": "ca1", "category": "National", "title": "India launches new solar mission across 5 states", "summary": "The Ministry of New & Renewable Energy launched a large-scale solar mission targeting 10 GW capacity across five states, aiming to boost clean energy transition.", "date": "May 8, 2026", "image": "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80"},
    {"id": "ca2", "category": "Economy", "title": "RBI keeps repo rate unchanged at 6.25%", "summary": "The Monetary Policy Committee decided to maintain the repo rate for the third consecutive meeting citing stable inflation and steady growth.", "date": "May 7, 2026", "image": "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80"},
    {"id": "ca3", "category": "International", "title": "India signs strategic trade deal with EU", "summary": "A landmark FTA was signed to boost bilateral trade to $200bn by 2030 with a special focus on green tech and pharma.", "date": "May 6, 2026", "image": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80"},
    {"id": "ca4", "category": "Sports", "title": "India wins Asian Athletics Championship gold", "summary": "Team India topped the medal tally with 12 gold, 8 silver, and 5 bronze at the Bangkok championships.", "date": "May 5, 2026", "image": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80"},
    {"id": "ca5", "category": "Science", "title": "ISRO successfully launches Chandrayaan-4 orbiter", "summary": "The mission aims for a sample return from the lunar south pole and marks a major milestone in India's space exploration.", "date": "May 4, 2026", "image": "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&q=80"},
    {"id": "ca6", "category": "Awards", "title": "Padma Awards 2026 announced", "summary": "The President conferred Padma awards on 132 distinguished personalities across various fields including arts, science, and sports.", "date": "May 3, 2026", "image": "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&q=80"},
]


DAILY_QUIZ = {
    "id": "quiz-2026-05-08",
    "title": "Daily Current Affairs Quiz",
    "date": "May 8, 2026",
    "duration_min": 10,
    "reward_coins": 50,
    "reward_xp": 100,
    "questions": [
        {"id": "q1", "text": "Which state topped the recently released Sustainable Development Goals (SDG) India Index 2026?", "options": ["Kerala", "Tamil Nadu", "Karnataka", "Uttarakhand"], "correct": 0, "explanation": "Kerala topped the SDG India Index 2026 with a composite score of 75, followed by Tamil Nadu."},
        {"id": "q2", "text": "What is the current repo rate as decided by the RBI's Monetary Policy Committee in May 2026?", "options": ["6.00%", "6.25%", "6.50%", "6.75%"], "correct": 1, "explanation": "The RBI kept the repo rate unchanged at 6.25% for the third consecutive meeting."},
        {"id": "q3", "text": "Chandrayaan-4 mission's primary goal is:", "options": ["Mars orbit insertion", "Lunar sample return from south pole", "Solar wind study", "Asteroid deflection"], "correct": 1, "explanation": "Chandrayaan-4 aims for a sample return from the lunar south pole."},
        {"id": "q4", "text": "The FTA signed recently between India and EU targets bilateral trade of:", "options": ["$100bn by 2030", "$150bn by 2030", "$200bn by 2030", "$250bn by 2030"], "correct": 2, "explanation": "The India-EU FTA targets $200 billion in bilateral trade by 2030."},
        {"id": "q5", "text": "India's medal tally at the Asian Athletics Championship 2026 was:", "options": ["10G 6S 4B", "12G 8S 5B", "8G 10S 6B", "15G 5S 3B"], "correct": 1, "explanation": "India won 12 gold, 8 silver, and 5 bronze."},
    ],
}


LEADERBOARD = [
    {"rank": 1, "name": "Priya Sharma", "xp": 12850, "avatar": "P", "streak": 45},
    {"rank": 2, "name": "Rahul Kumar", "xp": 12340, "avatar": "R", "streak": 38},
    {"rank": 3, "name": "Anjali Singh", "xp": 11890, "avatar": "A", "streak": 42},
    {"rank": 4, "name": "Vikash Rao", "xp": 11250, "avatar": "V", "streak": 31},
    {"rank": 5, "name": "Sneha Patel", "xp": 10980, "avatar": "S", "streak": 28},
    {"rank": 6, "name": "Arjun Mehta", "xp": 10420, "avatar": "A", "streak": 22},
    {"rank": 7, "name": "You", "xp": 9850, "avatar": "Y", "streak": 18, "is_me": True},
    {"rank": 8, "name": "Kavya Reddy", "xp": 9560, "avatar": "K", "streak": 15},
    {"rank": 9, "name": "Amit Sinha", "xp": 9210, "avatar": "A", "streak": 12},
    {"rank": 10, "name": "Divya Iyer", "xp": 8940, "avatar": "D", "streak": 10},
]


PROFILE = {
    "name": "Aarav Student",
    "email": "aarav@avision.in",
    "photo": None,
    "subscription": "Premium Yearly",
    "coins": 1250,
    "xp": 9850,
    "streak": 18,
    "level": 12,
    "badges": [
        {"id": "b1", "name": "Quiz Master", "icon": "trophy-outline", "earned": True},
        {"id": "b2", "name": "7-Day Streak", "icon": "flame-outline", "earned": True},
        {"id": "b3", "name": "Mock Marathoner", "icon": "flash-outline", "earned": True},
        {"id": "b4", "name": "Top 100 AIR", "icon": "star-outline", "earned": False},
    ],
    "stats": {
        "study_hours": 148,
        "tests_taken": 42,
        "avg_accuracy": 78,
        "rank": 1245,
    },
    "certificates": [
        {"id": "cert1", "title": "SSC CGL Foundation Completed", "date": "Apr 12, 2026"},
        {"id": "cert2", "title": "Banking Reasoning Mastery", "date": "Mar 05, 2026"},
    ],
}


MOCK_TESTS = [
    {"id": "mt1", "title": "SSC CGL Full Mock Test #12", "questions": 100, "duration": 60, "attempted": 84520, "type": "full-mock", "difficulty": "Medium"},
    {"id": "mt2", "title": "Banking PO – Sectional Reasoning", "questions": 35, "duration": 25, "attempted": 42130, "type": "sectional", "difficulty": "Hard"},
    {"id": "mt3", "title": "UPSC Prelims Mock 2026 #8", "questions": 100, "duration": 120, "attempted": 15680, "type": "full-mock", "difficulty": "Hard"},
    {"id": "mt4", "title": "CLAT Legal Reasoning Test", "questions": 30, "duration": 30, "attempted": 8940, "type": "sectional", "difficulty": "Medium"},
    {"id": "mt5", "title": "SSC CHSL Previous Year 2024", "questions": 100, "duration": 60, "attempted": 32180, "type": "pyq", "difficulty": "Easy"},
    {"id": "mt6", "title": "RRB NTPC Full Mock #5", "questions": 100, "duration": 90, "attempted": 21050, "type": "full-mock", "difficulty": "Medium"},
]
