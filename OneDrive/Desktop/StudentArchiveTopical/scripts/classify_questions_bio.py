"""
classify_questions_bio.py
Reads biology (0610) paper 2 JSONs, sends each question image to Gemini Vision,
gets topic + subtopic back, then inserts into Supabase questions table.

Usage:
    python scripts/classify_questions_bio.py --paper-id 0610_s23_qp_22
    python scripts/classify_questions_bio.py --subject 0610 --paper 2 --year-from 2020 --year-to 2025
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

SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── Gemini key + model pool — auto-rotates on quota/permission errors ─────────
_raw_keys = [k for k in [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
] if k]

if not _raw_keys:
    print("ERROR: No GEMINI_API_KEY found in .env")
    sys.exit(1)

_clients = [genai.Client(api_key=k) for k in _raw_keys]
print(f"Loaded {len(_clients)} Gemini API key(s)")

# ── IGCSE Biology 0610 syllabus ───────────────────────────────────────────────
CLASSIFY_PROMPT = """You are an expert IGCSE Biology examiner classifying Cambridge IGCSE Biology (0610) multiple choice questions.

SYLLABUS TAXONOMY — you MUST use ONLY these exact topic and subtopic names:

1. Characteristics and Classification of Living Organisms
   Subtopics: Characteristics of Living Organisms | Classification of Organisms | Dichotomous Keys

2. Organisation of the Organism
   Subtopics: Cell Structure | Bacterial Cells | Specialised Cells, Tissues and Organs | Size of Specimens

3. Movement into and out of Cells
   Subtopics: Diffusion | Osmosis | Active Transport

4. Biological Molecules
   Subtopics: Carbohydrates, Fats and Proteins | DNA

5. Enzymes
   Subtopics: Enzyme Action | Factors Affecting Enzyme Activity

6. Plant Nutrition
   Subtopics: Photosynthesis | Leaf Structure and Adaptations | Factors Affecting Photosynthesis

7. Human Nutrition
   Subtopics: Balanced Diet and Nutrients | The Human Digestive System | Digestion | Absorption and Assimilation

8. Transport in Plants
   Subtopics: Xylem and Phloem | Transpiration and Transport of Water | Translocation

9. Transport in Animals
   Subtopics: Circulatory Systems | The Heart | Blood Vessels | Blood

10. Diseases and Immunity
    Subtopics: Transmission of Pathogens | The Immune Response

11. Gas Exchange in Humans
    Subtopics: Gas Exchange System | Gas Exchange and Ventilation | Adaptations for Gas Exchange

12. Respiration
    Subtopics: Aerobic Respiration | Anaerobic Respiration | Exercise and Respiration

13. Excretion in Humans
    Subtopics: Excretion | The Kidneys and Urine Formation

14. Coordination and Response
    Subtopics: The Nervous System | Sense Organs and Receptors | Reflex Actions | Hormones | Coordination in Plants

15. Drugs
    Subtopics: Medicinal Drugs and Antibiotics | Drug Effects and Resistance

16. Reproduction
    Subtopics: Asexual and Sexual Reproduction | Sexual Reproduction in Flowering Plants | Seed Dispersal and Germination | Advantages and Disadvantages of Reproductive Methods

17. Reproduction in Humans
    Subtopics: Human Reproductive Systems | Fertilisation and Pregnancy | Hormonal Control of Reproduction | Contraception | Sexually Transmitted Infections

18. Chromosomes, Genes and Proteins
    Subtopics: Chromosomes and Cell Division | Inheritance | Genes and Protein Synthesis

19. Variation and Selection
    Subtopics: Variation | Selection

20. Organisms and their Environment
    Subtopics: Energy Flow and Food Webs | Nutrient Cycles | Populations

21. Human Influences on Ecosystems
    Subtopics: Human Pressures on Ecosystems | Conservation

22. Biotechnology and Genetic Modification
    Subtopics: Biotechnology | Genetic Modification

CLASSIFICATION RULES:
- Classify according to the PRIMARY CONCEPT BEING TESTED, not keywords mentioned in passing.
- Choose the MOST SPECIFIC applicable subtopic.
- Viruses and their diseases → Classification of Organisms (topic 1)
- Questions about dichotomous/identification keys → Dichotomous Keys
- Questions about magnification or image/actual size → Size of Specimens
- Questions about water moving across a membrane → Osmosis
- Questions about mineral ion uptake against a gradient → Active Transport
- Questions about food tests (Benedict's, biuret, iodine) → Carbohydrates, Fats and Proteins
- Questions about active site, enzyme-substrate complex → Enzyme Action
- Questions about temperature/pH effect on enzymes → Factors Affecting Enzyme Activity
- Questions about limiting factors in photosynthesis → Factors Affecting Photosynthesis
- Questions about villi and nutrient absorption → Absorption and Assimilation
- Questions about stomata and water loss from leaves → Transpiration and Transport of Water
- Questions about heart valves, atria, ventricles → The Heart
- Questions about haemoglobin and oxygen transport → Blood
- Questions about alveoli and gas exchange → Gas Exchange and Ventilation
- Questions about aerobic respiration equation → Aerobic Respiration
- Questions about lactic acid or fermentation → Anaerobic Respiration
- Questions about nephrons and filtration → The Kidneys and Urine Formation
- Questions about reflex arcs → Reflex Actions
- Questions about insulin, adrenaline, endocrine glands → Hormones
- Questions about auxin, phototropism → Coordination in Plants
- Questions about Punnett squares, dominant/recessive alleles → Inheritance
- Questions about mitosis, chromosome number → Chromosomes and Cell Division
- Questions about natural selection, adaptation → Selection
- Questions about food chains, energy transfer → Energy Flow and Food Webs
- Questions about carbon/nitrogen cycles → Nutrient Cycles
- Questions about plasmids, restriction enzymes, GM → Genetic Modification
- Questions about fermentation, industrial use of microorganisms → Biotechnology
- Do NOT create new topics or modify the taxonomy above.
- Do NOT assign multiple topics.
- Be consistent — same concept = same subtopic regardless of wording.

Look at the question image carefully. Respond with ONLY valid JSON, nothing else:
{"topic": "exact topic name from taxonomy", "subtopic": "exact subtopic name from taxonomy"}
"""

# ── Helpers ───────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent

def image_path_from_url(image_url: str) -> Path:
    """Convert imageUrl like /images/biology/0610_s23_qp_22/q1.png to local path."""
    clean = image_url.split("?")[0]
    return BASE_DIR / "public" / clean.lstrip("/")

def classify_with_gemini(image_path: Path, model: str) -> dict:
    """Send image to Gemini using the specified model only."""
    if not image_path.exists():
        return {"topic": "Unknown", "subtopic": "Unknown"}

    img_data = image_path.read_bytes()
    suffix   = image_path.suffix.lower()
    mime     = "image/png" if suffix == ".png" else "image/jpeg"

    for key_idx, client in enumerate(_clients):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[
                    CLASSIFY_PROMPT,
                    types.Part.from_bytes(data=img_data, mime_type=mime),
                ]
            )
            text  = response.text.strip()
            match = re.search(r'\{.*?\}', text, re.DOTALL)
            if match:
                result = json.loads(match.group())
                if "topic" in result and "subtopic" in result:
                    return result
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                print(f"    key{key_idx+1}: quota exhausted, trying next key...")
                continue
            elif "403" in err or "PERMISSION_DENIED" in err:
                print(f"    key{key_idx+1}: permission denied, trying next key...")
                continue
            elif "503" in err or "UNAVAILABLE" in err:
                print(f"    key{key_idx+1}: service unavailable, retrying in 5s...")
                time.sleep(5)
                continue
            else:
                print(f"    key{key_idx+1}: {err[:80]}")
                time.sleep(2)

    print(f"    All keys exhausted for model {model}.")
    return {"topic": "Unknown", "subtopic": "Unknown"}

def make_question_id(paper_id: str, question_number: int) -> str:
    return f"{paper_id}_Q{question_number:02d}"

# ── Main ──────────────────────────────────────────────────────────────────────
def process_papers(subject_code: str, paper_variant: str, limit: int = None, dry_run: bool = False, max_papers: int = None, year_from: int = None, year_to: int = None, paper_id: str = None, model: str = "gemini-3.1-flash-lite"):
    papers_dir = BASE_DIR / "public" / "papers"

    if paper_id:
        specific = papers_dir / f"{paper_id}.json"
        if not specific.exists():
            print(f"No paper found: {specific}")
            sys.exit(1)
        paper_files = [specific]
    else:
        pattern    = f"{subject_code}_*_qp_{paper_variant}*.json"
        paper_files = sorted(f for f in papers_dir.glob(pattern) if "view_mode" not in f.name)

        if year_from or year_to:
            def year_of(f):
                m = re.search(r'_(m|s|w)(\d{2})_', f.name)
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
    total_skipped  = 0
    total_errors   = 0

    for paper_file in paper_files:
        paper_data = json.loads(paper_file.read_text(encoding="utf-8"))
        paper_id_  = paper_data.get("paperId") or paper_data.get("paper_id") or paper_file.stem
        questions  = paper_data.get("questions", [])

        if limit:
            questions = questions[:limit]

        print(f"\n-- {paper_id_} ({len(questions)} questions) --")

        for q in questions:
            q_num     = q["questionNumber"]
            q_id      = make_question_id(paper_id_, q_num)
            image_url = q.get("imageUrl", "")
            img_path  = image_path_from_url(image_url)

            print(f"  Q{q_num:02d} -> {q_id} | image: {img_path.name}", end=" ")

            if not img_path.exists():
                print("[SKIP] image not found")
                total_skipped += 1
                continue

            existing = supabase.table("questions").select("id").eq("id", q_id).execute()
            if existing.data:
                print("[SKIP] already in DB")
                total_skipped += 1
                continue

            classification = classify_with_gemini(img_path, model=model)
            topic    = classification["topic"]
            subtopic = classification["subtopic"]
            print(f"-> {topic} / {subtopic}", end=" ")

            if dry_run:
                print("(dry run, not inserting)")
                continue

            try:
                supabase.table("questions").insert({
                    "id":           q_id,
                    "subject_code": subject_code,
                    "paper_id":     paper_id_,
                    "question_no":  q_num,
                    "topic":        topic,
                    "subtopic":     subtopic,
                }).execute()
                print("[OK]")
                total_inserted += 1
            except Exception as e:
                print(f"[ERROR] DB: {e}")
                total_errors += 1

            time.sleep(4)

    print(f"\n{'='*50}")
    print(f"Done. Inserted: {total_inserted} | Skipped: {total_skipped} | Errors: {total_errors}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Classify Biology MCQ questions using Gemini Vision")
    parser.add_argument("--subject",    default="0610",  help="Subject code e.g. 0610")
    parser.add_argument("--paper",      default="2",     help="Paper number e.g. 2 (matches qp_21, qp_22, qp_23)")
    parser.add_argument("--limit",      type=int,        help="Limit questions per paper (for testing)")
    parser.add_argument("--max-papers", type=int,        help="Limit number of papers to process")
    parser.add_argument("--year-from",  type=int,        help="Start year e.g. 2020")
    parser.add_argument("--year-to",    type=int,        help="End year e.g. 2025")
    parser.add_argument("--paper-id",                    help="Target a single paper e.g. 0610_s23_qp_22")
    parser.add_argument("--dry-run",    action="store_true", help="Classify but don't insert into DB")
    parser.add_argument("--model", default="gemini-flash-lite-latest", help="Gemini model to use")
    args = parser.parse_args()

    print(f"Using model: {args.model}")
    process_papers(args.subject, args.paper, args.limit, args.dry_run, args.max_papers, args.year_from, args.year_to, args.paper_id, args.model)
