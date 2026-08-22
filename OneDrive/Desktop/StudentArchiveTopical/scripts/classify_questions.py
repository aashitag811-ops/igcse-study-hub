"""
classify_questions.py
Reads physics paper 2 JSONs, sends each question image to Gemini Vision,
gets topic + subtopic back, then inserts into Supabase questions table.

Usage:
    python scripts/classify_questions.py --subject 0625 --paper 22 --limit 5
    python scripts/classify_questions.py --subject 0625 --paper 22
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

from google import genai
from google.genai import types
from dotenv import load_dotenv
from supabase import create_client

# ── Load env ──────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env")

GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY")
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not all([GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    print("ERROR: Missing keys in .env file. Need GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY")
    sys.exit(1)

# ── Clients ───────────────────────────────────────────────────────────────────
gemini = genai.Client(api_key=GEMINI_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── IGCSE Physics 0625 syllabus ───────────────────────────────────────────────
CLASSIFY_PROMPT = """You are an expert IGCSE Physics examiner classifying Cambridge IGCSE Physics (0625) Paper 4 multiple choice questions.

SYLLABUS TAXONOMY — you MUST use ONLY these exact topic and subtopic names:

1. Motion, Forces and Energy
   Subtopics: Making Measurements | Motion | Mass, Weight and Density | Forces | Momentum | Turning Effects | Forces and Elasticity | Pressure | Energy | Work, Power and Efficiency

2. Thermal Physics
   Subtopics: Kinetic Particle Model | Thermal Properties | Thermal Energy Transfers

3. Waves
   Subtopics: Wave Properties | Light | Sound | Electromagnetic Spectrum

4. Electricity and Magnetism
   Subtopics: Magnetism | Static Electricity | Electrical Quantities | Electric Circuits | Electrical Safety | Electromagnetic Effects

5. Nuclear Physics
   Subtopics: Atomic Structure | Radioactivity | Radioactive Decay | Uses and Hazards

6. Space Physics
   Subtopics: Solar System | Stars | Galaxies and Universe | Cosmology

CLASSIFICATION RULES:
- Classify according to the PRIMARY CONCEPT BEING TESTED, not keywords mentioned in passing.
- Choose the MOST SPECIFIC applicable subtopic.
- If a question requires calculating kinetic energy even though acceleration is mentioned, classify as Energy not Motion.
- If a question requires calculating acceleration, classify as Motion.
- If a question tests V=IR, classify as Electrical Quantities not Electric Circuits.
- If a question tests resistor combinations or circuit analysis, classify as Electric Circuits.
- If a question tests pressure in a liquid (p=rho*g*h), classify as Pressure.
- If a question tests spring constant or Hooke's law, classify as Forces and Elasticity.
- If a question tests measurement technique (using a ruler, measuring cylinder etc.), classify as Making Measurements.
- If a question tests half-life calculations, classify as Radioactive Decay.
- If a question tests total internal reflection or refraction, classify as Light.
- If a question tests the motor effect or electromagnetic induction, classify as Electromagnetic Effects.
- Do NOT create new topics or modify the taxonomy above.
- Do NOT assign multiple topics.
- Be consistent — same concept = same subtopic regardless of wording.

EXAMPLES:
- "Calculate kinetic energy at 20 m/s" → Motion, Forces and Energy | Energy
- "Calculate acceleration from 10 to 20 m/s in 5s" → Motion, Forces and Energy | Motion
- "Two resistors in series, find combined resistance" → Electricity and Magnetism | Electric Circuits
- "Calculate current using V=IR" → Electricity and Magnetism | Electrical Quantities
- "Find spring constant from graph" → Motion, Forces and Energy | Forces and Elasticity
- "Measure volume using measuring cylinder" → Motion, Forces and Energy | Making Measurements
- "Calculate pressure at depth in water" → Motion, Forces and Energy | Pressure
- "Half-life of 6 hours, find activity after 18 hours" → Nuclear Physics | Radioactive Decay
- "Total internal reflection in glass" → Waves | Light
- "Wire carrying current in magnetic field" → Electricity and Magnetism | Electromagnetic Effects

Look at the question image carefully. Respond with ONLY valid JSON, nothing else:
{"topic": "exact topic name from taxonomy", "subtopic": "exact subtopic name from taxonomy"}
"""

# ── Helpers ───────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent

def image_path_from_url(image_url: str, paper_id: str) -> Path:
    """Convert imageUrl like /images/physics/0625_m23_qp_22/q1.png?v=24 to local path."""
    # Strip query string
    clean = image_url.split("?")[0]
    # Build local path: public/images/physics/0625_m23_qp_22/q1.png
    return BASE_DIR / "public" / clean.lstrip("/")

def classify_with_gemini(image_path: Path, retries: int = 3) -> dict:
    """Send image to Gemini and return {topic, subtopic}."""
    if not image_path.exists():
        return {"topic": "Unknown", "subtopic": "Unknown"}

    img_data = image_path.read_bytes()
    suffix = image_path.suffix.lower()
    mime = "image/png" if suffix == ".png" else "image/jpeg"

    for attempt in range(retries):
        try:
            response = gemini.models.generate_content(
                model="gemini-3.1-flash-lite-preview",
                contents=[
                    CLASSIFY_PROMPT,
                    types.Part.from_bytes(data=img_data, mime_type=mime),
                ]
            )
            text = response.text.strip()
            # Extract JSON even if Gemini adds extra text
            match = re.search(r'\{.*?\}', text, re.DOTALL)
            if match:
                result = json.loads(match.group())
                if "topic" in result and "subtopic" in result:
                    return result
        except Exception as e:
            print(f"    Gemini attempt {attempt+1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    
    return {"topic": "Unknown", "subtopic": "Unknown"}

def make_question_id(paper_id: str, question_number: int) -> str:
    """Build ID like 0625_m23_qp_22_Q01"""
    return f"{paper_id}_Q{question_number:02d}"

def session_label(session: str) -> str:
    mapping = {"m": "Feb/March", "s": "May/June", "w": "Oct/Nov"}
    return mapping.get(session, session)

# ── Main ──────────────────────────────────────────────────────────────────────
def process_papers(subject_code: str, paper_variant: str, limit: int = None, dry_run: bool = False, max_papers: int = None, year_from: int = None, year_to: int = None, paper_id: str = None):
    papers_dir = BASE_DIR / "public" / "papers"

    # If a specific paper ID is given, just load that one file directly
    if paper_id:
        specific = papers_dir / f"{paper_id}.json"
        if not specific.exists():
            print(f"No paper found: {specific}")
            sys.exit(1)
        paper_files = [specific]
    else:
        # paper "4" matches qp_41, qp_42, qp_43 etc.
        pattern = f"{subject_code}_*_qp_{paper_variant}*.json"
        paper_files = sorted(papers_dir.glob(pattern))

        # Filter by year range if specified (e.g. 2020-2025 → m20..w25)
        if year_from or year_to:
            def year_of(f):
                m = __import__('re').search(r'_(m|s|w)(\d{2})_', f.name)
                return int(m.group(2)) + 2000 if m else 0
            paper_files = [f for f in paper_files if
                           (year_from is None or year_of(f) >= year_from) and
                           (year_to   is None or year_of(f) <= year_to)]

    if not paper_files:
        print(f"No papers found for: {paper_id or pattern}")
        sys.exit(1)

    if max_papers:
        paper_files = paper_files[:max_papers]

    print(f"Found {len(paper_files)} papers")

    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    for paper_file in paper_files:
        paper_data = json.loads(paper_file.read_text(encoding="utf-8"))
        paper_id   = paper_data["paperId"]
        questions  = paper_data.get("questions", [])

        if limit:
            questions = questions[:limit]

        print(f"\n-- {paper_id} ({len(questions)} questions) --")

        for q in questions:
            q_num     = q["questionNumber"]
            q_id      = make_question_id(paper_id, q_num)
            image_url = q.get("imageUrl", "")
            img_path  = image_path_from_url(image_url, paper_id)

            print(f"  Q{q_num:02d} -> {q_id} | image: {img_path.name}", end=" ")

            if not img_path.exists():
                print("[SKIP] image not found")
                total_skipped += 1
                continue

            # Check if already in Supabase
            existing = supabase.table("questions").select("id").eq("id", q_id).execute()
            if existing.data:
                print("[SKIP] already in DB")
                total_skipped += 1
                continue

            # Classify with Gemini
            classification = classify_with_gemini(img_path)
            topic    = classification["topic"]
            subtopic = classification["subtopic"]
            print(f"-> {topic} / {subtopic}", end=" ")

            if dry_run:
                print("(dry run, not inserting)")
                continue

            # Insert into Supabase
            try:
                supabase.table("questions").insert({
                    "id":           q_id,
                    "subject_code": subject_code,
                    "paper_id":     paper_id,
                    "question_no":  q_num,
                    "topic":        topic,
                    "subtopic":     subtopic,
                }).execute()
                print("[OK]")
                total_inserted += 1
            except Exception as e:
                print(f"[ERROR] DB: {e}")
                total_errors += 1

            # Respect Gemini free tier: 15 req/min
            time.sleep(4)

    print(f"\n{'='*50}")
    print(f"Done. Inserted: {total_inserted} | Skipped: {total_skipped} | Errors: {total_errors}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Classify MCQ questions using Gemini Vision")
    parser.add_argument("--subject", default="0625",  help="Subject code e.g. 0625")
    parser.add_argument("--paper",   default="4",     help="Paper number e.g. 4 (matches qp_41, qp_42, qp_43)")
    parser.add_argument("--limit",      type=int, help="Limit questions per paper (for testing)")
    parser.add_argument("--max-papers", type=int, help="Limit number of papers to process (for testing)")
    parser.add_argument("--year-from",  type=int, help="Start year e.g. 2020")
    parser.add_argument("--year-to",    type=int, help="End year e.g. 2025")
    parser.add_argument("--paper-id",   help="Target a single paper exactly e.g. 0625_s24_qp_23")
    parser.add_argument("--dry-run", action="store_true", help="Classify but don't insert into DB")
    args = parser.parse_args()

    process_papers(args.subject, args.paper, args.limit, args.dry_run, args.max_papers, args.year_from, args.year_to, args.paper_id)
