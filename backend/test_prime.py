"""Test Prime: Central testing platform with exam-pattern engine + entitlements."""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid

_db = None


def init_test_prime(db):
    global _db
    _db = db


# ==================== TEST PRIME CATEGORIES ====================
TP_CATEGORIES = [
    {"id": "banking", "name": "Banking", "icon": "cash-outline", "color": "#0B4DB8"},
    {"id": "ssc", "name": "SSC", "icon": "shield-checkmark-outline", "color": "#7C3AED"},
    {"id": "railway", "name": "Railway", "icon": "train-outline", "color": "#059669"},
    {"id": "state-exams", "name": "State Exams", "icon": "map-outline", "color": "#EA580C"},
    {"id": "teaching", "name": "Teaching", "icon": "school-outline", "color": "#DB2777"},
    {"id": "defence", "name": "Defence", "icon": "medal-outline", "color": "#4B5563"},
    {"id": "law", "name": "Law", "icon": "hammer-outline", "color": "#B45309"},
    {"id": "management", "name": "Management", "icon": "briefcase-outline", "color": "#4F46E5"},
    {"id": "cuet", "name": "CUET", "icon": "library-outline", "color": "#0D9488"},
    {"id": "upsc", "name": "UPSC & PSC", "icon": "ribbon-outline", "color": "#DC2626"},
    {"id": "other", "name": "Other Exams", "icon": "apps-outline", "color": "#64748B"},
]


# ==================== EXAM PATTERN ENGINE (per exam, versioned) ====================
# Each pattern is fully JSON-configurable — no hard-coding.
PATTERNS = {
    "sbi-po-2026-prelims": {
        "version": "2026", "stage": "Prelims",
        "sections": [
            {"name": "English Language", "questions": 30, "marks": 30, "duration_min": 20},
            {"name": "Quantitative Aptitude", "questions": 35, "marks": 35, "duration_min": 20},
            {"name": "Reasoning Ability", "questions": 35, "marks": 35, "duration_min": 20},
        ],
        "total_questions": 100, "total_marks": 100, "total_duration_min": 60,
        "sectional_timing": True, "negative_marking": 0.25,
        "cut_off": 65, "language": "English + Hindi",
        "verified_on": "2026-05-01", "status": "VERIFIED",
    },
    "ssc-cgl-2026-tier1": {
        "version": "2026", "stage": "Tier 1",
        "sections": [
            {"name": "General Intelligence", "questions": 25, "marks": 50, "duration_min": 15},
            {"name": "General Awareness", "questions": 25, "marks": 50, "duration_min": 15},
            {"name": "Quantitative Aptitude", "questions": 25, "marks": 50, "duration_min": 15},
            {"name": "English Comprehension", "questions": 25, "marks": 50, "duration_min": 15},
        ],
        "total_questions": 100, "total_marks": 200, "total_duration_min": 60,
        "sectional_timing": False, "negative_marking": 0.5,
        "cut_off": 135, "language": "English + Hindi",
        "verified_on": "2026-05-01", "status": "VERIFIED",
    },
    "clat-2026-full": {
        "version": "2026", "stage": "Main",
        "sections": [
            {"name": "English", "questions": 24, "marks": 24, "duration_min": 24},
            {"name": "Current Affairs & GK", "questions": 28, "marks": 28, "duration_min": 28},
            {"name": "Legal Reasoning", "questions": 32, "marks": 32, "duration_min": 32},
            {"name": "Logical Reasoning", "questions": 24, "marks": 24, "duration_min": 24},
            {"name": "Quantitative Techniques", "questions": 12, "marks": 12, "duration_min": 12},
        ],
        "total_questions": 120, "total_marks": 120, "total_duration_min": 120,
        "sectional_timing": False, "negative_marking": 0.25,
        "cut_off": 85, "language": "English",
        "verified_on": "2026-04-15", "status": "VERIFIED",
    },
    "ipmat-indore-2026": {
        "version": "2026", "stage": "Aptitude",
        "sections": [
            {"name": "Quantitative Aptitude (MCQ)", "questions": 30, "marks": 120, "duration_min": 40},
            {"name": "Quantitative Aptitude (SA)", "questions": 15, "marks": 60, "duration_min": 40},
            {"name": "Verbal Ability", "questions": 45, "marks": 180, "duration_min": 40},
        ],
        "total_questions": 90, "total_marks": 360, "total_duration_min": 120,
        "sectional_timing": True, "negative_marking": 1.0,
        "cut_off": 180, "language": "English",
        "verified_on": "2026-03-20", "status": "VERIFIED",
    },
    "ipmat-rohtak-2026": {
        "version": "2026", "stage": "Aptitude",
        "sections": [
            {"name": "Quantitative Ability", "questions": 40, "marks": 160, "duration_min": 30},
            {"name": "Verbal Ability", "questions": 40, "marks": 160, "duration_min": 30},
            {"name": "Logical Reasoning", "questions": 40, "marks": 160, "duration_min": 30},
            {"name": "General Knowledge", "questions": 0, "marks": 0, "duration_min": 30},
        ],
        "total_questions": 120, "total_marks": 480, "total_duration_min": 120,
        "sectional_timing": True, "negative_marking": 1.0,
        "cut_off": 240, "language": "English",
        "verified_on": "2026-03-20", "status": "VERIFIED",
    },
    "cuet-general-2026": {
        "version": "2026", "stage": "CUET UG",
        "sections": [
            {"name": "General Test", "questions": 60, "marks": 300, "duration_min": 60},
        ],
        "total_questions": 60, "total_marks": 300, "total_duration_min": 60,
        "sectional_timing": False, "negative_marking": 1.0,
        "cut_off": 180, "language": "English + Hindi + 13 more",
        "verified_on": "2026-02-10", "status": "VERIFIED",
    },
    "upsc-prelims-gs1-2026": {
        "version": "2026", "stage": "Prelims",
        "sections": [
            {"name": "General Studies Paper 1", "questions": 100, "marks": 200, "duration_min": 120},
        ],
        "total_questions": 100, "total_marks": 200, "total_duration_min": 120,
        "sectional_timing": False, "negative_marking": 0.66,
        "cut_off": 88, "language": "English + Hindi",
        "verified_on": "2026-04-01", "status": "VERIFIED",
    },
    "rrb-alp-cbt1-2026": {
        "version": "2026", "stage": "CBT 1",
        "sections": [
            {"name": "Mathematics", "questions": 20, "marks": 20, "duration_min": 15},
            {"name": "General Intelligence", "questions": 25, "marks": 25, "duration_min": 15},
            {"name": "Basic Science", "questions": 20, "marks": 20, "duration_min": 15},
            {"name": "General Awareness", "questions": 10, "marks": 10, "duration_min": 15},
        ],
        "total_questions": 75, "total_marks": 75, "total_duration_min": 60,
        "sectional_timing": False, "negative_marking": 0.33,
        "cut_off": 42, "language": "English + Hindi + Regional",
        "verified_on": "2026-05-01", "status": "VERIFIED",
    },
    "nda-2026-full": {
        "version": "2026", "stage": "Written",
        "sections": [
            {"name": "Mathematics", "questions": 120, "marks": 300, "duration_min": 150},
            {"name": "General Ability Test", "questions": 150, "marks": 600, "duration_min": 150},
        ],
        "total_questions": 270, "total_marks": 900, "total_duration_min": 300,
        "sectional_timing": True, "negative_marking": 0.33,
        "cut_off": 320, "language": "English + Hindi",
        "verified_on": "2026-04-20", "status": "VERIFIED",
    },
    "ctet-p1-2026": {
        "version": "2026", "stage": "Paper I",
        "sections": [
            {"name": "Child Development & Pedagogy", "questions": 30, "marks": 30, "duration_min": 30},
            {"name": "Language I", "questions": 30, "marks": 30, "duration_min": 30},
            {"name": "Language II", "questions": 30, "marks": 30, "duration_min": 30},
            {"name": "Mathematics", "questions": 30, "marks": 30, "duration_min": 30},
            {"name": "Environmental Studies", "questions": 30, "marks": 30, "duration_min": 30},
        ],
        "total_questions": 150, "total_marks": 150, "total_duration_min": 150,
        "sectional_timing": False, "negative_marking": 0.0,
        "cut_off": 90, "language": "English + Hindi",
        "verified_on": "2026-05-05", "status": "VERIFIED",
    },
    "wbcs-prelims-2026": {
        "version": "2026", "stage": "Prelims",
        "sections": [
            {"name": "General Studies", "questions": 200, "marks": 200, "duration_min": 150},
        ],
        "total_questions": 200, "total_marks": 200, "total_duration_min": 150,
        "sectional_timing": False, "negative_marking": 0.33,
        "cut_off": 132, "language": "English + Bengali",
        "verified_on": "2026-04-15", "status": "VERIFIED",
    },
}


# ==================== EXAMS (each linked to a pattern) ====================
EXAMS = [
    # Banking
    {"id": "sbi-po", "category_id": "banking", "name": "SBI PO", "full_name": "SBI Probationary Officer", "logo": "SBI", "color": "#0B4DB8", "pattern_id": "sbi-po-2026-prelims", "tests_count": 25, "aspirants": 154000},
    {"id": "sbi-clerk", "category_id": "banking", "name": "SBI Clerk", "full_name": "SBI Junior Associate", "logo": "SBI", "color": "#0B4DB8", "pattern_id": "sbi-po-2026-prelims", "tests_count": 20, "aspirants": 132000},
    {"id": "ibps-po", "category_id": "banking", "name": "IBPS PO", "full_name": "IBPS Probationary Officer", "logo": "IBPS", "color": "#083A8E", "pattern_id": "sbi-po-2026-prelims", "tests_count": 22, "aspirants": 118000},
    {"id": "ibps-clerk", "category_id": "banking", "name": "IBPS Clerk", "full_name": "IBPS Clerk / CSA", "logo": "IBPS", "color": "#083A8E", "pattern_id": "sbi-po-2026-prelims", "tests_count": 18, "aspirants": 96000},
    {"id": "ibps-rrb-po", "category_id": "banking", "name": "IBPS RRB PO", "full_name": "IBPS RRB Officer Scale-I", "logo": "RRB", "color": "#059669", "pattern_id": "sbi-po-2026-prelims", "tests_count": 15, "aspirants": 62000},
    {"id": "ibps-rrb-clerk", "category_id": "banking", "name": "IBPS RRB Clerk", "full_name": "IBPS RRB Office Assistant", "logo": "RRB", "color": "#059669", "pattern_id": "sbi-po-2026-prelims", "tests_count": 15, "aspirants": 58000},
    {"id": "ibps-so", "category_id": "banking", "name": "IBPS SO", "full_name": "IBPS Specialist Officer", "logo": "IBPS", "color": "#083A8E", "pattern_id": "sbi-po-2026-prelims", "tests_count": 12, "aspirants": 32000},
    {"id": "rbi-assistant", "category_id": "banking", "name": "RBI Assistant", "full_name": "Reserve Bank Assistant", "logo": "RBI", "color": "#B45309", "pattern_id": "sbi-po-2026-prelims", "tests_count": 12, "aspirants": 45000},
    {"id": "rbi-grade-b", "category_id": "banking", "name": "RBI Grade B", "full_name": "RBI Officer Grade B", "logo": "RBI", "color": "#B45309", "pattern_id": "sbi-po-2026-prelims", "tests_count": 10, "aspirants": 28000},
    {"id": "nabard", "category_id": "banking", "name": "NABARD Grade A", "full_name": "NABARD Assistant Manager", "logo": "NBRD", "color": "#0D9488", "pattern_id": "sbi-po-2026-prelims", "tests_count": 8, "aspirants": 18000},
    {"id": "lic-aao", "category_id": "banking", "name": "LIC AAO", "full_name": "LIC Assistant Administrative Officer", "logo": "LIC", "color": "#DC2626", "pattern_id": "sbi-po-2026-prelims", "tests_count": 8, "aspirants": 24000},
    {"id": "niacl-ao", "category_id": "banking", "name": "NIACL AO", "full_name": "NIACL Administrative Officer", "logo": "NIACL", "color": "#EA580C", "pattern_id": "sbi-po-2026-prelims", "tests_count": 6, "aspirants": 15000},

    # SSC
    {"id": "ssc-cgl", "category_id": "ssc", "name": "SSC CGL", "full_name": "SSC Combined Graduate Level", "logo": "SSC", "color": "#7C3AED", "pattern_id": "ssc-cgl-2026-tier1", "tests_count": 30, "aspirants": 210000},
    {"id": "ssc-chsl", "category_id": "ssc", "name": "SSC CHSL", "full_name": "Combined Higher Secondary Level", "logo": "SSC", "color": "#7C3AED", "pattern_id": "ssc-cgl-2026-tier1", "tests_count": 25, "aspirants": 156000},
    {"id": "ssc-mts", "category_id": "ssc", "name": "SSC MTS", "full_name": "Multi-Tasking Staff", "logo": "SSC", "color": "#6D28D9", "pattern_id": "ssc-cgl-2026-tier1", "tests_count": 18, "aspirants": 92000},
    {"id": "ssc-cpo", "category_id": "ssc", "name": "SSC CPO", "full_name": "Central Police Organisation", "logo": "SSC", "color": "#6D28D9", "pattern_id": "ssc-cgl-2026-tier1", "tests_count": 15, "aspirants": 68000},
    {"id": "ssc-gd", "category_id": "ssc", "name": "SSC GD", "full_name": "General Duty Constable", "logo": "SSC", "color": "#6D28D9", "pattern_id": "ssc-cgl-2026-tier1", "tests_count": 20, "aspirants": 178000},
    {"id": "ssc-steno", "category_id": "ssc", "name": "SSC Stenographer", "full_name": "SSC Stenographer C & D", "logo": "SSC", "color": "#7C3AED", "pattern_id": "ssc-cgl-2026-tier1", "tests_count": 10, "aspirants": 35000},
    {"id": "ssc-je", "category_id": "ssc", "name": "SSC JE", "full_name": "SSC Junior Engineer", "logo": "SSC", "color": "#6D28D9", "pattern_id": "ssc-cgl-2026-tier1", "tests_count": 12, "aspirants": 42000},

    # Railway
    {"id": "rrb-ntpc-gr", "category_id": "railway", "name": "RRB NTPC Graduate", "full_name": "RRB NTPC (Graduate Level)", "logo": "RRB", "color": "#059669", "pattern_id": "rrb-alp-cbt1-2026", "tests_count": 20, "aspirants": 132000},
    {"id": "rrb-ntpc-ug", "category_id": "railway", "name": "RRB NTPC UG", "full_name": "RRB NTPC (Undergraduate)", "logo": "RRB", "color": "#059669", "pattern_id": "rrb-alp-cbt1-2026", "tests_count": 18, "aspirants": 108000},
    {"id": "rrb-group-d", "category_id": "railway", "name": "RRB Group D", "full_name": "Railway Group D", "logo": "RRB", "color": "#047857", "pattern_id": "rrb-alp-cbt1-2026", "tests_count": 22, "aspirants": 195000},
    {"id": "rrb-alp", "category_id": "railway", "name": "RRB ALP", "full_name": "Assistant Loco Pilot", "logo": "RRB", "color": "#047857", "pattern_id": "rrb-alp-cbt1-2026", "tests_count": 15, "aspirants": 82000},
    {"id": "rrb-tech", "category_id": "railway", "name": "RRB Technician", "full_name": "Railway Technician", "logo": "RRB", "color": "#059669", "pattern_id": "rrb-alp-cbt1-2026", "tests_count": 12, "aspirants": 68000},
    {"id": "rrb-je", "category_id": "railway", "name": "RRB JE", "full_name": "Railway Junior Engineer", "logo": "RRB", "color": "#059669", "pattern_id": "rrb-alp-cbt1-2026", "tests_count": 10, "aspirants": 42000},
    {"id": "rpf-si", "category_id": "railway", "name": "RPF SI", "full_name": "RPF Sub-Inspector", "logo": "RPF", "color": "#065F46", "pattern_id": "rrb-alp-cbt1-2026", "tests_count": 10, "aspirants": 38000},
    {"id": "rpf-const", "category_id": "railway", "name": "RPF Constable", "full_name": "RPF Constable", "logo": "RPF", "color": "#065F46", "pattern_id": "rrb-alp-cbt1-2026", "tests_count": 12, "aspirants": 62000},

    # State Exams
    {"id": "wbcs", "category_id": "state-exams", "name": "WBCS", "full_name": "West Bengal Civil Service", "logo": "WBCS", "color": "#EA580C", "pattern_id": "wbcs-prelims-2026", "tests_count": 15, "aspirants": 46000, "state": "West Bengal"},
    {"id": "wbpsc-misc", "category_id": "state-exams", "name": "WBPSC Misc.", "full_name": "WBPSC Miscellaneous Services", "logo": "WBPSC", "color": "#EA580C", "pattern_id": "wbcs-prelims-2026", "tests_count": 10, "aspirants": 22000, "state": "West Bengal"},
    {"id": "wb-police", "category_id": "state-exams", "name": "WB Police", "full_name": "West Bengal Police Constable", "logo": "WBP", "color": "#C2410C", "pattern_id": "wbcs-prelims-2026", "tests_count": 12, "aspirants": 35000, "state": "West Bengal"},
    {"id": "kolkata-police", "category_id": "state-exams", "name": "Kolkata Police", "full_name": "Kolkata Police Constable", "logo": "KP", "color": "#C2410C", "pattern_id": "wbcs-prelims-2026", "tests_count": 10, "aspirants": 18000, "state": "West Bengal"},
    {"id": "food-si", "category_id": "state-exams", "name": "Food SI", "full_name": "Food Sub-Inspector WB", "logo": "FSI", "color": "#9A3412", "pattern_id": "wbcs-prelims-2026", "tests_count": 8, "aspirants": 12000, "state": "West Bengal"},
    {"id": "up-si", "category_id": "state-exams", "name": "UP SI", "full_name": "Uttar Pradesh Sub-Inspector", "logo": "UPSI", "color": "#EA580C", "pattern_id": "wbcs-prelims-2026", "tests_count": 10, "aspirants": 42000, "state": "Uttar Pradesh"},
    {"id": "bpsc", "category_id": "state-exams", "name": "BPSC", "full_name": "Bihar Public Service Commission", "logo": "BPSC", "color": "#B45309", "pattern_id": "wbcs-prelims-2026", "tests_count": 12, "aspirants": 58000, "state": "Bihar"},

    # Teaching
    {"id": "ctet-p1", "category_id": "teaching", "name": "CTET Paper I", "full_name": "Central TET – Primary", "logo": "CTET", "color": "#DB2777", "pattern_id": "ctet-p1-2026", "tests_count": 15, "aspirants": 128000},
    {"id": "ctet-p2", "category_id": "teaching", "name": "CTET Paper II", "full_name": "Central TET – Upper Primary", "logo": "CTET", "color": "#DB2777", "pattern_id": "ctet-p1-2026", "tests_count": 12, "aspirants": 96000},
    {"id": "kvs", "category_id": "teaching", "name": "KVS PGT/TGT", "full_name": "Kendriya Vidyalaya", "logo": "KVS", "color": "#BE185D", "pattern_id": "ctet-p1-2026", "tests_count": 10, "aspirants": 42000},
    {"id": "nvs", "category_id": "teaching", "name": "NVS", "full_name": "Navodaya Vidyalaya", "logo": "NVS", "color": "#BE185D", "pattern_id": "ctet-p1-2026", "tests_count": 8, "aspirants": 28000},
    {"id": "dsssb", "category_id": "teaching", "name": "DSSSB", "full_name": "Delhi Subordinate Services", "logo": "DSSSB", "color": "#DB2777", "pattern_id": "ctet-p1-2026", "tests_count": 8, "aspirants": 22000},

    # Defence
    {"id": "nda", "category_id": "defence", "name": "NDA", "full_name": "National Defence Academy", "logo": "NDA", "color": "#4B5563", "pattern_id": "nda-2026-full", "tests_count": 18, "aspirants": 68000},
    {"id": "cds", "category_id": "defence", "name": "CDS", "full_name": "Combined Defence Services", "logo": "CDS", "color": "#374151", "pattern_id": "nda-2026-full", "tests_count": 15, "aspirants": 45000},
    {"id": "afcat", "category_id": "defence", "name": "AFCAT", "full_name": "Air Force Common Admission Test", "logo": "IAF", "color": "#1F2937", "pattern_id": "nda-2026-full", "tests_count": 12, "aspirants": 32000},
    {"id": "capf", "category_id": "defence", "name": "CAPF", "full_name": "Central Armed Police Forces", "logo": "CAPF", "color": "#4B5563", "pattern_id": "nda-2026-full", "tests_count": 10, "aspirants": 28000},
    {"id": "agniveer", "category_id": "defence", "name": "Agniveer", "full_name": "Agnipath Recruitment", "logo": "AGNI", "color": "#374151", "pattern_id": "nda-2026-full", "tests_count": 14, "aspirants": 92000},

    # Law
    {"id": "clat", "category_id": "law", "name": "CLAT", "full_name": "Common Law Admission Test", "logo": "CLAT", "color": "#B45309", "pattern_id": "clat-2026-full", "tests_count": 18, "aspirants": 78000},
    {"id": "ailet", "category_id": "law", "name": "AILET", "full_name": "All India Law Entrance Test (NLU-D)", "logo": "AILET", "color": "#B45309", "pattern_id": "clat-2026-full", "tests_count": 12, "aspirants": 42000},
    {"id": "slat", "category_id": "law", "name": "SLAT", "full_name": "Symbiosis Law Admission Test", "logo": "SLAT", "color": "#92400E", "pattern_id": "clat-2026-full", "tests_count": 8, "aspirants": 25000},
    {"id": "mh-cet-law", "category_id": "law", "name": "MH CET Law", "full_name": "Maharashtra CET Law", "logo": "MHCET", "color": "#92400E", "pattern_id": "clat-2026-full", "tests_count": 8, "aspirants": 22000},

    # Management
    {"id": "ipmat-indore", "category_id": "management", "name": "IPMAT Indore", "full_name": "IIM Indore IPM Aptitude Test", "logo": "IIMI", "color": "#4F46E5", "pattern_id": "ipmat-indore-2026", "tests_count": 15, "aspirants": 42000},
    {"id": "ipmat-rohtak", "category_id": "management", "name": "IPMAT Rohtak", "full_name": "IIM Rohtak IPM Aptitude Test", "logo": "IIMR", "color": "#4338CA", "pattern_id": "ipmat-rohtak-2026", "tests_count": 12, "aspirants": 32000},
    {"id": "jipmat", "category_id": "management", "name": "JIPMAT", "full_name": "Joint IPM Admission Test (IIM Jammu & Bodhgaya)", "logo": "JIPM", "color": "#4F46E5", "pattern_id": "ipmat-rohtak-2026", "tests_count": 8, "aspirants": 18000},
    {"id": "npat", "category_id": "management", "name": "NPAT", "full_name": "NMIMS Programs After Twelfth", "logo": "NPAT", "color": "#6366F1", "pattern_id": "ipmat-rohtak-2026", "tests_count": 8, "aspirants": 22000},
    {"id": "set", "category_id": "management", "name": "SET", "full_name": "Symbiosis Entrance Test", "logo": "SET", "color": "#4F46E5", "pattern_id": "ipmat-rohtak-2026", "tests_count": 6, "aspirants": 18000},
    {"id": "christ", "category_id": "management", "name": "Christ Univ.", "full_name": "Christ University Entrance", "logo": "CU", "color": "#6366F1", "pattern_id": "ipmat-rohtak-2026", "tests_count": 5, "aspirants": 12000},

    # CUET
    {"id": "cuet-general", "category_id": "cuet", "name": "CUET General", "full_name": "CUET UG General Test", "logo": "CUET", "color": "#0D9488", "pattern_id": "cuet-general-2026", "tests_count": 20, "aspirants": 285000},
    {"id": "cuet-english", "category_id": "cuet", "name": "CUET English", "full_name": "CUET UG English", "logo": "CUET", "color": "#0D9488", "pattern_id": "cuet-general-2026", "tests_count": 12, "aspirants": 168000},
    {"id": "cuet-domain", "category_id": "cuet", "name": "CUET Domain", "full_name": "CUET Domain-specific", "logo": "CUET", "color": "#0F766E", "pattern_id": "cuet-general-2026", "tests_count": 25, "aspirants": 92000},

    # UPSC & PSC
    {"id": "upsc-cse", "category_id": "upsc", "name": "UPSC CSE", "full_name": "Civil Services Examination", "logo": "UPSC", "color": "#DC2626", "pattern_id": "upsc-prelims-gs1-2026", "tests_count": 30, "aspirants": 156000},
    {"id": "upsc-csat", "category_id": "upsc", "name": "UPSC CSAT", "full_name": "Civil Services Aptitude Test", "logo": "UPSC", "color": "#B91C1C", "pattern_id": "upsc-prelims-gs1-2026", "tests_count": 20, "aspirants": 128000},

    # Other
    {"id": "other-1", "category_id": "other", "name": "SBI CBO", "full_name": "SBI Circle-Based Officer", "logo": "SBI", "color": "#64748B", "pattern_id": "sbi-po-2026-prelims", "tests_count": 6, "aspirants": 15000},
]


# ==================== TEST TYPES ====================
TEST_TYPES = [
    {"id": "free", "label": "Free Tests"},
    {"id": "full-mock", "label": "Full Length Mocks"},
    {"id": "sectional", "label": "Sectional Tests"},
    {"id": "subject", "label": "Subject Tests"},
    {"id": "topic", "label": "Topic Tests"},
    {"id": "memory-based", "label": "Memory Based"},
    {"id": "speed", "label": "Speed Tests"},
    {"id": "pyq", "label": "Previous Year"},
    {"id": "daily", "label": "Daily Test"},
    {"id": "current-affairs", "label": "Current Affairs"},
    {"id": "special", "label": "Special / Live"},
]


# ==================== TESTS (generated at seed time from exams × test-types) ====================
def _generate_seed_tests() -> List[dict]:
    """Generate a rich seed of tests spanning all exams and all test types."""
    tests: List[dict] = []
    idx = 0
    for exam in EXAMS:
        pattern = PATTERNS.get(exam["pattern_id"], {})
        # Pick ~6 test types per exam
        types_for_exam = ["free", "full-mock", "sectional", "topic", "pyq", "speed", "daily", "current-affairs", "special", "memory-based"]
        for i, ttype in enumerate(types_for_exam):
            idx += 1
            is_free = (ttype == "free") or (ttype == "daily" and i % 3 == 0) or (i == 0)
            tests.append({
                "id": f"t_{exam['id']}_{ttype}_{i+1}",
                "name": f"{exam['name']} {_pretty_type(ttype)} {(i % 5) + 1:02d}",
                "exam_id": exam["id"],
                "exam_name": exam["name"],
                "category_id": exam["category_id"],
                "pattern_id": exam["pattern_id"],
                "type": ttype,
                "type_label": next((t["label"] for t in TEST_TYPES if t["id"] == ttype), ttype),
                "stage": pattern.get("stage", "N/A"),
                "questions": pattern.get("total_questions", 100) if ttype in ("full-mock", "pyq") else (30 if ttype in ("sectional", "subject", "topic", "memory-based") else (20 if ttype == "speed" else 10)),
                "marks": pattern.get("total_marks", 100) if ttype in ("full-mock", "pyq") else 50,
                "duration_min": pattern.get("total_duration_min", 60) if ttype in ("full-mock", "pyq") else (25 if ttype in ("sectional", "subject", "topic", "memory-based") else (10 if ttype == "speed" else 8)),
                "language": pattern.get("language", "English + Hindi"),
                "difficulty": ["Easy", "Medium", "Hard"][i % 3],
                "is_free": is_free,
                "is_live": (ttype == "special" and i == 0),
                "attempts_count": 850 + (idx * 17 % 3200),
                "published_at": f"2026-{(i % 5) + 1:02d}-{(i * 3 % 27) + 1:02d}",
                "popularity": (idx * 7 % 100),
            })
    return tests


def _pretty_type(t: str) -> str:
    return {
        "free": "Free Mock", "full-mock": "Mock Test", "sectional": "Sectional",
        "subject": "Subject Test", "topic": "Topic Test", "memory-based": "Memory Based",
        "speed": "Speed Test", "pyq": "Previous Year", "daily": "Daily Test",
        "current-affairs": "CA Test", "special": "Live Mock",
    }.get(t, t.title())


TESTS = _generate_seed_tests()


# ==================== ENTITLEMENTS ====================
# All Free tests are always unlocked.
# Prime users unlock everything.
# Course purchase unlocks only that exam's tests.

async def _get_entitlement(user_id: Optional[str]) -> dict:
    """Return the user's Test-Prime entitlement snapshot."""
    if not user_id:
        return {"is_prime": False, "unlocked_exams": [], "unlocked_categories": [], "plan": None, "expires_at": None}
    doc = await _db.tp_entitlements.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return {"is_prime": False, "unlocked_exams": [], "unlocked_categories": [], "plan": None, "expires_at": None}
    return doc


def _is_test_unlocked(test: dict, ent: dict) -> bool:
    if test.get("is_free"):
        return True
    if ent.get("is_prime"):
        return True
    if test.get("exam_id") in (ent.get("unlocked_exams") or []):
        return True
    if test.get("category_id") in (ent.get("unlocked_categories") or []):
        return True
    return False


# ==================== ROUTES ====================
router = APIRouter(prefix="/api/test-prime", tags=["test-prime"])


@router.get("/categories")
async def list_categories():
    counts = {}
    for e in EXAMS:
        counts[e["category_id"]] = counts.get(e["category_id"], 0) + 1
    return {
        "categories": [
            {**c, "exam_count": counts.get(c["id"], 0)} for c in TP_CATEGORIES
        ]
    }


@router.get("/exams")
async def list_exams(category: Optional[str] = None, state: Optional[str] = None, q: Optional[str] = None):
    items = EXAMS
    if category:
        items = [e for e in items if e["category_id"] == category]
    if state:
        items = [e for e in items if e.get("state") == state]
    if q:
        q_low = q.strip().lower()
        items = [e for e in items if q_low in e["name"].lower() or q_low in e.get("full_name", "").lower()]
    return {"exams": items}


@router.get("/exams/{exam_id}")
async def exam_detail(exam_id: str):
    exam = next((e for e in EXAMS if e["id"] == exam_id), None)
    if not exam:
        raise HTTPException(404, "Exam not found")
    pattern = PATTERNS.get(exam["pattern_id"])
    return {**exam, "pattern": pattern}


@router.get("/test-types")
async def list_test_types():
    return {"types": TEST_TYPES}


@router.get("/tests")
async def list_tests(
    exam: Optional[str] = None, category: Optional[str] = None, type: Optional[str] = None,
    free_only: bool = False, prime_only: bool = False, sort: str = "latest",
    q: Optional[str] = None, user_id: Optional[str] = None, limit: int = 200,
):
    items = list(TESTS)
    if exam:
        items = [t for t in items if t["exam_id"] == exam]
    if category:
        items = [t for t in items if t["category_id"] == category]
    if type and type != "all":
        items = [t for t in items if t["type"] == type]
    if free_only:
        items = [t for t in items if t["is_free"]]
    if prime_only:
        items = [t for t in items if not t["is_free"]]
    if q:
        q_low = q.strip().lower()
        items = [t for t in items if q_low in t["name"].lower()]

    if sort == "popular":
        items.sort(key=lambda x: x["attempts_count"], reverse=True)
    elif sort == "difficulty":
        order = {"Easy": 0, "Medium": 1, "Hard": 2}
        items.sort(key=lambda x: order.get(x["difficulty"], 99))
    else:
        items.sort(key=lambda x: x["published_at"], reverse=True)

    ent = await _get_entitlement(user_id) if user_id else {"is_prime": False, "unlocked_exams": [], "unlocked_categories": []}
    result = []
    for t in items[:limit]:
        result.append({**t, "unlocked": _is_test_unlocked(t, ent)})
    return {"tests": result, "entitlement": ent}


@router.get("/tests/{test_id}")
async def test_detail(test_id: str, user_id: Optional[str] = None):
    t = next((x for x in TESTS if x["id"] == test_id), None)
    if not t:
        raise HTTPException(404, "Test not found")
    pattern = PATTERNS.get(t["pattern_id"])
    ent = await _get_entitlement(user_id) if user_id else {"is_prime": False, "unlocked_exams": [], "unlocked_categories": []}
    return {**t, "pattern": pattern, "unlocked": _is_test_unlocked(t, ent), "entitlement": ent}


@router.get("/entitlement")
async def get_entitlement(user_id: str):
    return await _get_entitlement(user_id)


class ActivateBody(BaseModel):
    plan: str  # "prime" | "banking" | "ssc" | ...
    duration_days: int = 365


@router.post("/entitlement/activate")
async def activate_plan(user_id: str, body: ActivateBody):
    """MOCK activation: no real payment. Used for demo/testing only."""
    now = datetime.now(timezone.utc)
    ent = await _db.tp_entitlements.find_one({"user_id": user_id}, {"_id": 0}) or {
        "user_id": user_id, "is_prime": False,
        "unlocked_exams": [], "unlocked_categories": [],
        "plan": None, "expires_at": None,
    }
    if body.plan == "prime":
        ent["is_prime"] = True
        ent["plan"] = "Test Prime"
    else:
        cats = list(set(ent.get("unlocked_categories", []) + [body.plan]))
        ent["unlocked_categories"] = cats
        ent["plan"] = f"Test Series – {body.plan.title()}"
    # store expiry as ISO string
    from datetime import timedelta
    ent["expires_at"] = (now + timedelta(days=body.duration_days)).isoformat()
    ent["activated_at"] = now.isoformat()
    await _db.tp_entitlements.update_one(
        {"user_id": user_id}, {"$set": ent}, upsert=True,
    )
    ent.pop("_id", None)
    return ent


@router.post("/entitlement/reset")
async def reset_entitlement(user_id: str):
    await _db.tp_entitlements.delete_one({"user_id": user_id})
    return {"ok": True}


async def ensure_test_prime_indexes(db):
    await db.tp_entitlements.create_index("user_id", unique=True)
