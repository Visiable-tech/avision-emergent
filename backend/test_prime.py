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


# ==================== SALIENT FEATURES / HIGHLIGHTS / FAQ / PLANS ====================
TP_FEATURES = [
    {"id": "pyp", "title": "25k+ Previous Year Papers", "icon": "history", "iconLib": "material", "color": "#2563EB", "bg": "#DBEAFE"},
    {"id": "reattempt", "title": "Unlimited Re-Attempt", "icon": "refresh-circle", "iconLib": "ion", "color": "#D97706", "bg": "#FEF3C7"},
    {"id": "refund", "title": "500% Refund", "icon": "cash-refund", "iconLib": "material", "color": "#059669", "bg": "#D1FAE5"},
    {"id": "mock", "title": "1.5 Lakh+ Mock Tests", "icon": "chart-bar", "iconLib": "material", "color": "#7C3AED", "bg": "#EDE9FE"},
]

TP_HIGHLIGHTS = [
    "Mock & Topic Tests based on Latest Pattern with Detailed Solutions",
    "Overall & Sectional Analysis, Ranks and Comparison with Topper",
    "Doubt Solving on App, Telegram Groups & In Person at Offline Centers",
    "Seminar & Topper Talks at Offline Centers",
    "In-Person Counselling, Physical Support Helpdesk at Test Prime Expiry",
    "24×7 Chat & Call Support for Test Prime Members",
    "Personalized Report Card and Adaptive Practice Suggestions",
    "1-click Bilingual switch (English ⇄ Hindi) inside every test",
    "AIR & Percentile ranking against 1L+ live aspirants",
    "Downloadable PDFs of Solutions & Analysis after every test",
]

TP_FAQS = [
    {"q": "What is Test Prime?", "a": "Test Prime is Avision’s single all-access pass that unlocks every mock, sectional, topic-wise and previous-year test across 40+ Government & Entrance exams — with detailed solutions, ranking, and analytics."},
    {"q": "How many exams are covered under Test Prime?", "a": "Test Prime covers 40+ major exams across Banking, SSC, Railway, State PSCs, Teaching, Defence, Law, Management, CUET and UPSC — a total of 1.5 Lakh+ tests."},
    {"q": "Will I also get the previous year's papers for the government exams under Test Prime?", "a": "Yes. You get access to 25k+ Previous Year Papers across all covered exams with detailed section-wise solutions."},
    {"q": "Are topic-wise tests or daily quizzes included in the package?", "a": "Absolutely. Test Prime includes Sectional, Subject, Topic, Speed, Daily and Current Affairs tests, updated every day."},
    {"q": "Can I reattempt a test?", "a": "Yes — every test can be reattempted unlimited times. Your best score, latest score and average are all tracked in your Report Card."},
    {"q": "Are the mock tests updated according to the latest exam pattern?", "a": "Every test on Test Prime is aligned with the officially notified latest pattern (2026). We revise papers within 48 hours of any pattern change."},
    {"q": "When will the mock tests be available in my account?", "a": "All tests are unlocked instantly the moment your Test Prime is activated. Live mocks appear as per the published schedule."},
    {"q": "How to access the test series?", "a": "Open the Avision app → Test Prime tab → pick your exam → Start Test. Tests can be paused and resumed on any device."},
    {"q": "What is 1-month or 12-month validity?", "a": "Validity is the duration for which your Test Prime pass stays active from the day of purchase. All benefits are available throughout that duration."},
    {"q": "What is a Personalized Report Card?", "a": "After every attempt, we generate a detailed report with topic-wise accuracy, time management, weak-area suggestions and comparison against toppers."},
    {"q": "What is the 500% Refund on Selection Policy?", "a": "If you clear the final selection of any exam covered under Test Prime, we refund 5× the amount you paid — subject to verification of your appointment letter."},
    {"q": "Does the subscription include a multilingual test series, or do I need to buy them separately?", "a": "All bilingual (English + Hindi) tests are included. Additional regional languages are available for Railway and select State exams at no extra cost."},
    {"q": "Will I be able to access my attempted tests even after the Test Prime Expiry?", "a": "Yes — your attempt history, report cards and PDF solutions remain accessible read-only even after expiry."},
    {"q": "What happens if I renew the Prime before the expiry date?", "a": "Your remaining days automatically get added to the new plan — you never lose a single day."},
]

TP_PLANS = [
    {"id": "1m", "label": "1 Month", "months": 1, "price": 99, "mrp": 299, "discount_pct": 66, "popular": False},
    {"id": "3m", "label": "3 Months", "months": 3, "price": 199, "mrp": 599, "discount_pct": 66, "popular": False},
    {"id": "6m", "label": "6 Months", "months": 6, "price": 249, "mrp": 799, "discount_pct": 68, "popular": True},
    {"id": "12m", "label": "12 Months", "months": 12, "price": 299, "mrp": 999, "discount_pct": 70, "popular": True},
    {"id": "24m", "label": "24 Months", "months": 24, "price": 499, "mrp": 1999, "discount_pct": 75, "popular": False},
]


# ==================== ROUTES ====================
router = APIRouter(prefix="/api/test-prime", tags=["test-prime"])


@router.get("/landing")
async def landing_bundle(category: Optional[str] = None):
    """One-shot bundle for the Test Prime landing screen."""
    # Build category counts
    counts = {}
    for e in EXAMS:
        counts[e["category_id"]] = counts.get(e["category_id"], 0) + 1
    categories = [{**c, "exam_count": counts.get(c["id"], 0)} for c in TP_CATEGORIES]

    # Filter exams by category
    exams = EXAMS
    if category:
        exams = [e for e in exams if e["category_id"] == category]

    # Compute free-test count per exam (from generated seed tests)
    exam_ids = {e["id"] for e in exams}
    free_by_exam: dict = {}
    for t in TESTS:
        if t["exam_id"] in exam_ids and t.get("is_free"):
            free_by_exam[t["exam_id"]] = free_by_exam.get(t["exam_id"], 0) + 1

    enriched = []
    for e in exams:
        enriched.append({
            **e,
            "free_tests": free_by_exam.get(e["id"], 3),
            "languages": ["ENGLISH", "HINDI"],
        })

    return {
        "categories": categories,
        "exams": enriched,
        "features": TP_FEATURES,
        "highlights": TP_HIGHLIGHTS,
        "faqs": TP_FAQS,
        "plans": TP_PLANS,
    }


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


# ==================== CBT ENGINE — Attempts + Analytics + Ranking ====================
import hashlib
import json
import os
import random
import statistics

# ------- Load curated question bank -------
_BANK_PATH = os.path.join(os.path.dirname(__file__), "data", "question_bank.json")
try:
    with open(_BANK_PATH, "r", encoding="utf-8") as _f:
        _QUESTION_BANK: dict = json.load(_f)
except Exception:
    _QUESTION_BANK = {}

# Admin question overlay collection is loaded from Mongo at query time.

# Topic templates per broad subject — used to tag questions for analytics
_TOPIC_MAP = {
    "quant": ["Number System", "Algebra", "Percentage", "Time & Work", "Data Interpretation", "Averages", "Ratio", "Profit & Loss"],
    "reasoning": ["Puzzles", "Blood Relations", "Coding-Decoding", "Syllogism", "Series", "Direction", "Seating Arrangement"],
    "english": ["Reading Comprehension", "Cloze Test", "Error Spotting", "Para Jumble", "Vocabulary", "Grammar"],
    "gk": ["Static GK", "Current Affairs", "History", "Geography", "Polity", "Economy"],
    "science": ["Physics", "Chemistry", "Biology", "Environment"],
    "legal": ["Constitution", "Contracts", "Torts", "Criminal Law", "IPR"],
    "math": ["Algebra", "Geometry", "Trigonometry", "Calculus", "Number Theory"],
    "general": ["Mixed Topics", "Analytical", "Application", "Reasoning"],
}

def _subject_key(section_name: str) -> str:
    n = section_name.lower()
    if any(k in n for k in ["quant", "arith", "aptitude", "numerical"]): return "quant"
    if any(k in n for k in ["reason", "intell", "logic", "mental"]): return "reasoning"
    if "english" in n or "verbal" in n or "language" in n: return "english"
    if "aware" in n or "awareness" in n or "current" in n or "general knowledge" in n: return "gk"
    if "science" in n or "physics" in n or "chemistry" in n or "biology" in n: return "science"
    if "legal" in n or "law" in n: return "legal"
    if "math" in n and "aptitude" not in n: return "math"
    return "general"


async def _bank_for(subject: str, topic: str) -> List[dict]:
    """Return curated + admin custom questions for a subject/topic."""
    base = ((_QUESTION_BANK.get(subject) or {}).get(topic)) or []
    # merge in admin-added custom questions
    admin = []
    try:
        cur = _db.tp_questions.find({"subject": subject, "topic": topic}, {"_id": 0})
        admin = await cur.to_list(length=500)
    except Exception:
        admin = []
    return list(base) + list(admin)


async def _gen_question_bank(test: dict, seed: int) -> List[dict]:
    """Generate a full question paper for one attempt — draws from the curated bank first, then fills gaps with templated stems."""
    rnd = random.Random(seed)
    pattern = PATTERNS.get(test["pattern_id"], {})
    sections = pattern.get("sections") or [{"name": "General", "questions": test.get("questions", 20), "marks": test.get("marks", 40), "duration_min": test.get("duration_min", 30)}]

    questions: List[dict] = []
    qidx = 0
    for sec in sections:
        subj = _subject_key(sec["name"])
        topics = _TOPIC_MAP.get(subj, _TOPIC_MAP["general"])
        qcount = int(sec.get("questions") or 0)
        per_q_marks = round((sec.get("marks", 0) / max(1, qcount)), 2) if qcount else 1
        # Round-robin over topics
        for i in range(qcount):
            qidx += 1
            topic = topics[i % len(topics)]
            bank_pool = await _bank_for(subj, topic)
            src = None
            if bank_pool:
                src = rnd.choice(bank_pool)
            if src:
                q = {
                    "id": f"q{qidx}",
                    "section": sec["name"],
                    "subject": subj,
                    "topic": topic,
                    "text": src["text"],
                    "options": list(src["options"]),
                    "correct": int(src["correct"]),
                    "marks": per_q_marks,
                    "difficulty": src.get("difficulty", ["Easy", "Medium", "Hard"][rnd.randint(0, 2)]),
                    "explanation": src.get("explanation", f"See topic notes for {topic}."),
                    "source": "curated" if src.get("_from") != "admin" else "admin",
                }
            else:
                # Fallback to templated demo question
                correct_idx = rnd.randint(0, 3)
                q = {
                    "id": f"q{qidx}",
                    "section": sec["name"],
                    "subject": subj,
                    "topic": topic,
                    "text": _q_stem(subj, topic, i + 1, rnd),
                    "options": _q_options(subj, topic, correct_idx, rnd),
                    "correct": correct_idx,
                    "marks": per_q_marks,
                    "difficulty": ["Easy", "Medium", "Hard"][rnd.randint(0, 2)],
                    "explanation": f"The correct answer is Option {chr(65 + correct_idx)}. This tests your understanding of {topic}.",
                    "source": "templated",
                }
            questions.append(q)
    return questions


def _q_stem(subject: str, topic: str, n: int, rnd: random.Random) -> str:
    if subject == "quant":
        a, b = rnd.randint(11, 99), rnd.randint(2, 20)
        stems = [
            f"If x = {a} and y = {b}, find the value of x + 2y.",
            f"The average of first {a} natural numbers is:",
            f"A shopkeeper marks his goods {b}% above cost and gives a discount of 10%. His profit % is:",
            f"Find the compound interest on ₹{a * 100} at {b}% p.a. for 2 years.",
            f"Simplify: √{a * a}  +  {b}² =",
            f"If {a}% of a number is {b * 4}, then the number is:",
        ]
        return f"Q{n}. {stems[n % len(stems)]}"
    if subject == "reasoning":
        stems = [
            f"If MOTHER is coded as OQVJGT, how is FATHER coded?",
            f"Pointing to a man, Riya said, 'He is the only son of my mother's father'. How is the man related to Riya?",
            f"Find the odd one out: 121, 144, 169, 200",
            f"Statement: All roses are flowers. Some flowers fade quickly. Conclusion?",
            f"Which number should come next in the series: 2, 6, 12, 20, 30, __ ?",
            f"If A is South-East of B, and C is North-East of B, then A is in which direction of C?",
        ]
        return f"Q{n}. {stems[n % len(stems)]}"
    if subject == "english":
        stems = [
            f"Choose the correct synonym of 'Meticulous':",
            f"Identify the error: 'She don't like coffee in the morning.'",
            f"Fill in the blank: The manager was reluctant _____ the proposal.",
            f"Choose the antonym of 'Ephemeral':",
            f"Rearrange the para: (P) He then went to the market. (Q) He returned home. (R) He got up early. (S) He bought vegetables.",
            f"Choose the correctly spelt word:",
        ]
        return f"Q{n}. {stems[n % len(stems)]}"
    if subject == "gk":
        stems = [
            f"Who is the current Governor of the Reserve Bank of India (2026)?",
            f"The Constitution of India was adopted on which date?",
            f"'Silent Valley' is a national park located in which state?",
            f"Which country hosted the G20 Summit in 2026?",
            f"The 'Fundamental Duties' were added to the Constitution by which amendment?",
            f"Which is the longest river in India?",
        ]
        return f"Q{n}. {stems[n % len(stems)]}"
    if subject == "legal":
        stems = [
            f"Under the Indian Contract Act, an agreement without consideration is:",
            f"The doctrine of 'Basic Structure' was propounded in which case?",
            f"Article 21 of the Constitution guarantees:",
            f"Which of the following is NOT a valid defence in Tort?",
            f"The concept of 'Actus Reus' refers to:",
        ]
        return f"Q{n}. {stems[n % len(stems)]}"
    if subject == "math":
        a, b = rnd.randint(3, 15), rnd.randint(2, 9)
        stems = [
            f"Solve for x: {a}x + {b} = {a * 2 + b}",
            f"The value of sin({a * 15}°) + cos({a * 15}°) is:",
            f"If f(x) = x² - {a}x + {b}, then f'(x) at x = 2 is:",
            f"The area of a circle with radius {a} cm is (π = 3.14):",
        ]
        return f"Q{n}. {stems[n % len(stems)]}"
    if subject == "science":
        stems = [
            f"The unit of electric potential is:",
            f"Which gas is most abundant in Earth's atmosphere?",
            f"The powerhouse of the cell is:",
            f"Which vitamin is produced by the skin in sunlight?",
        ]
        return f"Q{n}. {stems[n % len(stems)]}"
    # general
    return f"Q{n}. Practice question on {topic}. Choose the most appropriate option."


def _q_options(subject: str, topic: str, correct: int, rnd: random.Random) -> List[str]:
    # Generate 4 plausible options; correct one is at position `correct`.
    pool_map = {
        "quant": ["24", "36", "42", "58", "64", "72", "84", "98", "112", "125", "140", "160", "180", "216", "225"],
        "reasoning": ["Uncle", "Brother", "Father", "Son", "Nephew", "Cousin", "North", "East", "West", "South"],
        "english": ["Careful", "Careless", "Precise", "Detailed", "Thorough", "Sloppy", "Casual", "Attentive"],
        "gk": ["1949", "1950", "1951", "1935", "Kerala", "Karnataka", "Tamil Nadu", "Andhra Pradesh", "India", "USA", "UK", "Brazil"],
        "legal": ["Valid", "Void", "Voidable", "Illegal", "Kesavananda Bharati", "Golaknath", "Minerva Mills", "Maneka Gandhi"],
        "math": ["2", "3", "4", "5", "6", "7", "8", "9", "10", "12", "15", "20", "24", "28.26", "50.24", "78.5"],
        "science": ["Volt", "Ampere", "Ohm", "Watt", "Nitrogen", "Oxygen", "Argon", "Carbon Dioxide", "Nucleus", "Mitochondria", "Ribosome", "Golgi"],
        "general": ["Option A", "Option B", "Option C", "Option D"],
    }
    pool = pool_map.get(subject, pool_map["general"])
    picked = rnd.sample(pool, k=4) if len(pool) >= 4 else pool[:4] + ["N/A"] * (4 - len(pool))
    return picked


def _percentile_rank(user_score: float, dist: List[float]) -> float:
    if not dist: return 0.0
    below = sum(1 for x in dist if x < user_score)
    return round(100.0 * below / len(dist), 2)


def _synthetic_score_distribution(total_marks: float, aspirants: int, seed: int) -> List[float]:
    """Generate a bell-ish distribution around 40-55% of total_marks."""
    rnd = random.Random(seed)
    mu = total_marks * 0.48
    sigma = total_marks * 0.14
    # Cap population to reasonable size for compute
    n = min(max(aspirants, 500), 25000)
    return [max(0.0, min(total_marks, rnd.gauss(mu, sigma))) for _ in range(n)]


@router.post("/attempts/start")
async def start_attempt(user_id: str, body: dict):
    """Start a new attempt. Body: {test_id: string, language?: string}"""
    test_id = body.get("test_id")
    if not test_id:
        raise HTTPException(400, "test_id required")
    test = next((x for x in TESTS if x["id"] == test_id), None)
    if not test:
        raise HTTPException(404, "Test not found")
    ent = await _get_entitlement(user_id)
    if not _is_test_unlocked(test, ent):
        raise HTTPException(402, "Test locked — activate Prime")

    attempt_id = uuid.uuid4().hex
    seed = int(hashlib.md5(f"{user_id}:{test_id}:{attempt_id}".encode()).hexdigest()[:8], 16)
    questions = await _gen_question_bank(test, seed)
    pattern = PATTERNS.get(test["pattern_id"], {})
    sections_meta = pattern.get("sections") or [{"name": "General", "questions": test["questions"], "marks": test["marks"], "duration_min": test["duration_min"]}]

    # Compute retake number
    prior_count = await _db.tp_attempts.count_documents({"user_id": user_id, "test_id": test_id})

    now = datetime.now(timezone.utc)
    doc = {
        "attempt_id": attempt_id,
        "user_id": user_id,
        "test_id": test_id,
        "test_name": test["name"],
        "exam_id": test["exam_id"],
        "exam_name": test["exam_name"],
        "category_id": test["category_id"],
        "pattern_id": test["pattern_id"],
        "language": body.get("language", "English"),
        "started_at": now.isoformat(),
        "submitted_at": None,
        "status": "in_progress",
        "sections": [
            {
                "name": s["name"],
                "total_questions": s.get("questions", 0),
                "total_marks": s.get("marks", 0),
                "duration_sec": (s.get("duration_min", 30) * 60),
                "time_left_sec": (s.get("duration_min", 30) * 60),
                "started": False,
                "completed": False,
            } for s in sections_meta
        ],
        "sectional_timing": pattern.get("sectional_timing", False),
        "total_duration_sec": pattern.get("total_duration_min", test.get("duration_min", 30)) * 60,
        "total_time_left_sec": pattern.get("total_duration_min", test.get("duration_min", 30)) * 60,
        "negative_marking": pattern.get("negative_marking", 0),
        "questions": questions,  # stored server-side (with correct)
        "answers": {},           # qid -> option_idx
        "marked": [],            # [qid]
        "seen": [],              # [qid]
        "current_index": 0,
        # Anti-cheat tracking
        "violations": [],           # [{type, at, note}]
        "violation_count": 0,
        # Retake metadata
        "attempt_number": prior_count + 1,
        # analytics fields populated on submit:
        "score": None, "percentage": None, "rank": None, "percentile": None,
        "correct_count": None, "wrong_count": None, "unattempted_count": None,
        "accuracy": None, "time_spent_sec": None,
    }
    await _db.tp_attempts.insert_one(doc)

    # Return sanitized (no correct answers)
    return _public_attempt(doc)


def _public_attempt(doc: dict) -> dict:
    d = {k: v for k, v in doc.items() if k not in ("_id",)}
    if d.get("status") != "submitted":
        # Strip correct answers before returning to client
        d = {**d, "questions": [_strip_q(q) for q in d.get("questions", [])]}
    return d


def _strip_q(q: dict) -> dict:
    return {k: v for k, v in q.items() if k not in ("correct", "explanation")}


@router.get("/attempts/{attempt_id}")
async def get_attempt(attempt_id: str, user_id: str):
    doc = await _db.tp_attempts.find_one({"attempt_id": attempt_id, "user_id": user_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "Attempt not found")
    return _public_attempt(doc)


@router.patch("/attempts/{attempt_id}/state")
async def save_state(attempt_id: str, user_id: str, body: dict):
    """Save partial state during a live test. Body: {answers?, marked?, seen?, current_index?, section_times?: {name: time_left_sec}, total_time_left_sec?}"""
    doc = await _db.tp_attempts.find_one({"attempt_id": attempt_id, "user_id": user_id})
    if not doc: raise HTTPException(404, "Attempt not found")
    if doc.get("status") == "submitted":
        return _public_attempt(doc)

    update = {}
    if "answers" in body: update["answers"] = body["answers"] or {}
    if "marked" in body: update["marked"] = list(set(body["marked"] or []))
    if "seen" in body: update["seen"] = list(set(body["seen"] or []))
    if "current_index" in body: update["current_index"] = int(body["current_index"] or 0)
    if "total_time_left_sec" in body: update["total_time_left_sec"] = int(body["total_time_left_sec"])
    if "section_times" in body:
        st_map = body["section_times"] or {}
        new_secs = []
        for s in doc.get("sections", []):
            nt = st_map.get(s["name"])
            if nt is not None:
                s["time_left_sec"] = max(0, int(nt))
            new_secs.append(s)
        update["sections"] = new_secs
    if "active_section" in body:
        # mark started
        act = body["active_section"]
        new_secs = update.get("sections") or doc.get("sections", [])
        for s in new_secs:
            if s["name"] == act: s["started"] = True
        update["sections"] = new_secs

    await _db.tp_attempts.update_one({"attempt_id": attempt_id}, {"$set": update})
    doc = await _db.tp_attempts.find_one({"attempt_id": attempt_id}, {"_id": 0})
    return _public_attempt(doc)


@router.post("/attempts/{attempt_id}/submit")
async def submit_attempt(attempt_id: str, user_id: str):
    """Score + compute full analytics + AIR/percentile."""
    doc = await _db.tp_attempts.find_one({"attempt_id": attempt_id, "user_id": user_id})
    if not doc: raise HTTPException(404, "Attempt not found")
    if doc.get("status") == "submitted":
        return _public_result(doc)

    questions: List[dict] = doc.get("questions", [])
    answers: dict = doc.get("answers", {}) or {}
    neg = float(doc.get("negative_marking") or 0)
    test = next((t for t in TESTS if t["id"] == doc["test_id"]), None)
    exam = next((e for e in EXAMS if e["id"] == doc["exam_id"]), None)
    aspirants = int((exam or {}).get("aspirants", 12000))

    correct_count = 0
    wrong_count = 0
    unattempted_count = 0
    total_marks = 0.0
    score = 0.0

    # Per-section + per-topic aggregates
    sec_agg: dict = {}
    topic_agg: dict = {}
    diff_agg = {"Easy": {"total": 0, "correct": 0, "wrong": 0}, "Medium": {"total": 0, "correct": 0, "wrong": 0}, "Hard": {"total": 0, "correct": 0, "wrong": 0}}

    review_list: List[dict] = []

    for q in questions:
        total_marks += float(q.get("marks", 1))
        sec = q.get("section", "General")
        topic = q.get("topic", "General")
        diff = q.get("difficulty", "Medium")
        sec_agg.setdefault(sec, {"section": sec, "total": 0, "correct": 0, "wrong": 0, "unattempted": 0, "score": 0.0, "max_score": 0.0, "accuracy": 0.0})
        topic_agg.setdefault(f"{sec}|{topic}", {"section": sec, "topic": topic, "total": 0, "correct": 0, "wrong": 0, "accuracy": 0.0})

        sec_agg[sec]["total"] += 1
        sec_agg[sec]["max_score"] += float(q.get("marks", 1))
        topic_agg[f"{sec}|{topic}"]["total"] += 1
        diff_agg[diff]["total"] += 1

        ans = answers.get(q["id"])
        if ans is None:
            unattempted_count += 1
            sec_agg[sec]["unattempted"] += 1
            status_ = "unattempted"
        elif int(ans) == int(q["correct"]):
            correct_count += 1
            score += float(q.get("marks", 1))
            sec_agg[sec]["correct"] += 1
            sec_agg[sec]["score"] += float(q.get("marks", 1))
            topic_agg[f"{sec}|{topic}"]["correct"] += 1
            diff_agg[diff]["correct"] += 1
            status_ = "correct"
        else:
            wrong_count += 1
            score -= neg
            sec_agg[sec]["wrong"] += 1
            sec_agg[sec]["score"] -= neg
            topic_agg[f"{sec}|{topic}"]["wrong"] += 1
            diff_agg[diff]["wrong"] += 1
            status_ = "wrong"

        review_list.append({
            "id": q["id"], "section": sec, "topic": topic, "difficulty": diff,
            "text": q["text"], "options": q["options"],
            "correct": q["correct"], "user": ans if ans is not None else None,
            "explanation": q.get("explanation", ""), "status": status_,
            "marks_earned": float(q.get("marks", 1)) if status_ == "correct" else (-neg if status_ == "wrong" else 0.0),
        })

    attempted = correct_count + wrong_count
    accuracy = round(100.0 * correct_count / attempted, 2) if attempted else 0.0
    percentage = round(100.0 * max(0.0, score) / max(1.0, total_marks), 2)

    # Sectional accuracy
    for k, v in sec_agg.items():
        v["accuracy"] = round(100.0 * v["correct"] / max(1, v["correct"] + v["wrong"]), 2)
        v["score"] = round(v["score"], 2)
    for k, v in topic_agg.items():
        v["accuracy"] = round(100.0 * v["correct"] / max(1, v["correct"] + v["wrong"]), 2)

    # Rank + Percentile using synthetic distribution
    dist = _synthetic_score_distribution(total_marks, aspirants, seed=hash(doc["test_id"]) & 0xffffffff)
    percentile = _percentile_rank(score, dist)
    total_pop = len(dist)
    rank = max(1, int(round((100.0 - percentile) / 100.0 * total_pop))) if total_pop else 1
    # scale to full aspirant pool visual number
    scale = aspirants / max(1, total_pop)
    virtual_rank = max(1, int(round(rank * scale)))
    topper_score = round(max(dist + [score]), 2)
    avg_score = round(statistics.mean(dist), 2) if dist else 0.0

    # Time spent
    started = datetime.fromisoformat(doc["started_at"])
    now = datetime.now(timezone.utc)
    time_spent = int(max(0, (now - started).total_seconds()))

    result = {
        "status": "submitted",
        "submitted_at": now.isoformat(),
        "time_spent_sec": time_spent,
        "score": round(score, 2),
        "max_score": round(total_marks, 2),
        "percentage": percentage,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "unattempted_count": unattempted_count,
        "attempted": attempted,
        "total_questions": len(questions),
        "accuracy": accuracy,
        "rank": virtual_rank,
        "percentile": percentile,
        "aspirants": aspirants,
        "topper_score": topper_score,
        "average_score": avg_score,
        "sectional": [sec_agg[s["name"]] for s in doc.get("sections", []) if s["name"] in sec_agg],
        "topic_wise": list(topic_agg.values()),
        "difficulty_wise": [{"difficulty": k, **v, "accuracy": round(100.0 * v["correct"] / max(1, v["correct"] + v["wrong"]), 2)} for k, v in diff_agg.items()],
        "review": review_list,
    }
    await _db.tp_attempts.update_one({"attempt_id": attempt_id}, {"$set": result})
    doc = await _db.tp_attempts.find_one({"attempt_id": attempt_id}, {"_id": 0})
    return _public_result(doc)


def _public_result(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}


@router.get("/attempts/{attempt_id}/analytics")
async def get_analytics(attempt_id: str, user_id: str):
    doc = await _db.tp_attempts.find_one({"attempt_id": attempt_id, "user_id": user_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "Attempt not found")
    if doc.get("status") != "submitted":
        raise HTTPException(400, "Attempt not submitted")
    return doc


@router.get("/attempts")
async def list_attempts(user_id: str, limit: int = 20, test_id: Optional[str] = None):
    q = {"user_id": user_id}
    if test_id:
        q["test_id"] = test_id
    cur = _db.tp_attempts.find(q, {"_id": 0, "questions": 0, "review": 0}).sort("started_at", -1).limit(limit)
    docs = await cur.to_list(length=limit)
    return {"attempts": docs}


@router.get("/attempts/summary/{test_id}")
async def attempt_summary(test_id: str, user_id: str):
    """Best / latest / attempts count for a specific test — used for Retake UI."""
    cur = _db.tp_attempts.find({"user_id": user_id, "test_id": test_id, "status": "submitted"}, {"_id": 0, "questions": 0, "review": 0}).sort("submitted_at", -1)
    docs = await cur.to_list(length=100)
    if not docs:
        return {"count": 0, "best": None, "latest": None, "average_score": None}
    best = max(docs, key=lambda d: d.get("score") or -1e9)
    latest = docs[0]
    avg = round(sum((d.get("score") or 0) for d in docs) / len(docs), 2)
    return {"count": len(docs), "best": best, "latest": latest, "average_score": avg}


@router.post("/attempts/{attempt_id}/violation")
async def log_violation(attempt_id: str, user_id: str, body: dict):
    """Anti-cheat: log a violation (tab-switch, blur, fullscreen-exit)."""
    doc = await _db.tp_attempts.find_one({"attempt_id": attempt_id, "user_id": user_id})
    if not doc:
        raise HTTPException(404, "Attempt not found")
    if doc.get("status") == "submitted":
        return {"violation_count": doc.get("violation_count", 0)}
    v = {
        "type": (body.get("type") or "unknown")[:32],
        "note": (body.get("note") or "")[:200],
        "at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.tp_attempts.update_one(
        {"attempt_id": attempt_id},
        {"$push": {"violations": v}, "$inc": {"violation_count": 1}},
    )
    updated = await _db.tp_attempts.find_one({"attempt_id": attempt_id}, {"_id": 0, "questions": 0, "review": 0})
    return {"violation_count": updated.get("violation_count", 0), "violations": updated.get("violations", [])}


# ==================== ADMIN: Questions & Tests CRUD ====================
def _is_admin(user: dict) -> bool:
    if not user:
        return False
    return bool(user.get("is_admin")) or user.get("email") in ("admin@avision.com", "test@avision.com")


class AdminQuestionBody(BaseModel):
    subject: str
    topic: str
    text: str
    options: List[str]
    correct: int
    difficulty: Optional[str] = "Medium"
    explanation: Optional[str] = ""
    tags: Optional[List[str]] = []


@router.get("/admin/questions")
async def admin_list_questions(subject: Optional[str] = None, topic: Optional[str] = None, q: Optional[str] = None, limit: int = 200):
    """List curated + admin questions."""
    items: List[dict] = []
    # Curated
    for subj, topics in _QUESTION_BANK.items():
        if subject and subj != subject:
            continue
        for t, qs in (topics or {}).items():
            if topic and t != topic:
                continue
            for i, x in enumerate(qs):
                if q and q.lower() not in x["text"].lower():
                    continue
                items.append({
                    "id": f"curated:{subj}:{t}:{i}",
                    "source": "curated",
                    "subject": subj, "topic": t,
                    "text": x["text"], "options": x["options"], "correct": x["correct"],
                    "difficulty": x.get("difficulty", "Medium"), "explanation": x.get("explanation", ""),
                    "read_only": True,
                })
    # Admin
    q_filter = {}
    if subject: q_filter["subject"] = subject
    if topic: q_filter["topic"] = topic
    if q: q_filter["text"] = {"$regex": q, "$options": "i"}
    cur = _db.tp_questions.find(q_filter, {"_id": 0}).limit(limit)
    async for doc in cur:
        items.append({**doc, "source": "admin", "read_only": False})
    return {"items": items[:limit], "count": len(items[:limit])}


@router.post("/admin/questions")
async def admin_create_question(body: AdminQuestionBody):
    q = {
        "id": f"aq_{uuid.uuid4().hex[:10]}",
        "subject": body.subject,
        "topic": body.topic,
        "text": body.text,
        "options": body.options,
        "correct": int(body.correct),
        "difficulty": body.difficulty or "Medium",
        "explanation": body.explanation or "",
        "tags": body.tags or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.tp_questions.insert_one(q)
    return q


@router.patch("/admin/questions/{qid}")
async def admin_update_question(qid: str, body: dict):
    upd = {k: v for k, v in body.items() if k in ("subject", "topic", "text", "options", "correct", "difficulty", "explanation", "tags")}
    if "correct" in upd:
        upd["correct"] = int(upd["correct"])
    await _db.tp_questions.update_one({"id": qid}, {"$set": upd})
    q = await _db.tp_questions.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Not found")
    return q


@router.delete("/admin/questions/{qid}")
async def admin_delete_question(qid: str):
    r = await _db.tp_questions.delete_one({"id": qid})
    return {"deleted": r.deleted_count}


class AdminTestBody(BaseModel):
    name: str
    exam_id: str
    type: str = "full-mock"
    is_free: bool = False
    duration_min: int = 60
    questions: int = 100
    marks: int = 100


@router.get("/admin/tests")
async def admin_list_tests(exam: Optional[str] = None, q: Optional[str] = None, limit: int = 200):
    """List curated (in-memory) + admin custom tests."""
    items = []
    for t in TESTS:
        if exam and t["exam_id"] != exam:
            continue
        if q and q.lower() not in t["name"].lower():
            continue
        items.append({**t, "source": "curated", "read_only": True})
    f = {}
    if exam: f["exam_id"] = exam
    if q: f["name"] = {"$regex": q, "$options": "i"}
    cur = _db.tp_admin_tests.find(f, {"_id": 0}).limit(limit)
    async for d in cur:
        items.append({**d, "source": "admin", "read_only": False})
    return {"items": items[:limit], "count": len(items[:limit])}


@router.post("/admin/tests")
async def admin_create_test(body: AdminTestBody):
    exam = next((e for e in EXAMS if e["id"] == body.exam_id), None)
    if not exam:
        raise HTTPException(400, "Exam not found")
    t = {
        "id": f"at_{uuid.uuid4().hex[:10]}",
        "name": body.name,
        "exam_id": exam["id"], "exam_name": exam["name"],
        "category_id": exam["category_id"], "pattern_id": exam["pattern_id"],
        "type": body.type, "type_label": next((tt["label"] for tt in TEST_TYPES if tt["id"] == body.type), body.type),
        "stage": PATTERNS.get(exam["pattern_id"], {}).get("stage", "N/A"),
        "questions": int(body.questions), "marks": int(body.marks),
        "duration_min": int(body.duration_min),
        "language": PATTERNS.get(exam["pattern_id"], {}).get("language", "English + Hindi"),
        "difficulty": "Medium", "is_free": bool(body.is_free), "is_live": False,
        "attempts_count": 0, "published_at": datetime.now(timezone.utc).isoformat()[:10], "popularity": 0,
    }
    await _db.tp_admin_tests.insert_one(t)
    TESTS.append(t)  # register into runtime list so it becomes attemptable
    return t


@router.delete("/admin/tests/{tid}")
async def admin_delete_test(tid: str):
    r = await _db.tp_admin_tests.delete_one({"id": tid})
    # Also remove from runtime list
    global TESTS
    TESTS[:] = [t for t in TESTS if t["id"] != tid]
    return {"deleted": r.deleted_count}


@router.get("/admin/stats")
async def admin_stats():
    q_count = sum(len(qs) for topics in _QUESTION_BANK.values() for qs in (topics or {}).values())
    admin_q = await _db.tp_questions.count_documents({})
    admin_t = await _db.tp_admin_tests.count_documents({})
    attempts = await _db.tp_attempts.count_documents({})
    submitted = await _db.tp_attempts.count_documents({"status": "submitted"})
    return {
        "curated_questions": q_count,
        "admin_questions": admin_q,
        "curated_tests": len(TESTS) - admin_t,
        "admin_tests": admin_t,
        "total_attempts": attempts,
        "submitted_attempts": submitted,
    }


async def _register_admin_tests(db):
    async for d in db.tp_admin_tests.find({}, {"_id": 0}):
        if not any(x["id"] == d["id"] for x in TESTS):
            TESTS.append(d)


async def ensure_test_prime_indexes(db):
    await db.tp_entitlements.create_index("user_id", unique=True)
    await db.tp_attempts.create_index("attempt_id", unique=True)
    await db.tp_attempts.create_index([("user_id", 1), ("started_at", -1)])
    await db.tp_questions.create_index("id", unique=True)
    await db.tp_questions.create_index([("subject", 1), ("topic", 1)])
    await db.tp_admin_tests.create_index("id", unique=True)
    await _register_admin_tests(db)
