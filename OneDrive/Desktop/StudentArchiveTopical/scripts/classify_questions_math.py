"""
classify_questions_math.py
Reads Cambridge IGCSE Mathematics Extended (0580) paper 2 and paper 4 theory JSONs
(from public/theory-questions/), sends each leaf subpart's text to Gemini
(or optionally OpenAI), gets 1-3 topic/subtopic classifications back, then
inserts into:
  - theory_questions          (one row per leaf subpart)
  - theory_question_topics    (junction — one row per topic assigned)

The topics table must already be seeded with 0580 taxonomy
(run seed_math_topics.sql first).

JSON structure (from parse-theory-qp.mjs):
  question.id        e.g. "1"
  question.parts[]   e.g. [{id:"1a", parts:[{id:"1ai",...}, {id:"1aii",...}]}]
  Leaf parts (no nested parts[]) are the units we classify.

Variants covered: qp_21, qp_22, qp_23, qp_41, qp_42, qp_43

Usage:
    python scripts/classify_questions_math.py --paper-id 0580_m25_qp_42
    python scripts/classify_questions_math.py --year-from 2020 --year-to 2025
    python scripts/classify_questions_math.py --paper-id 0580_m25_qp_42 --dry-run
    python scripts/classify_questions_math.py --year-from 2020 --year-to 2025 --use-key 2 --model gemini-2.0-flash-lite
    python scripts/classify_questions_math.py --paper-id 0580_m25_qp_42 --openai
    python scripts/classify_questions_math.py --paper-id 0580_m25_qp_42 --openai --model gpt-4o
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

from google import genai
from dotenv import load_dotenv
from supabase import create_client

try:
    from openai import OpenAI as _OpenAI
    _openai_available = True
except ImportError:
    _openai_available = False

# ── Load env ──────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

_raw_keys = [k for k in [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4"),
] if k]

if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

_clients = [genai.Client(api_key=k) for k in _raw_keys] if _raw_keys else []
if _clients:
    print(f"Loaded {len(_clients)} Gemini API key(s)")

_openai_client = None
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── Taxonomy prompt ───────────────────────────────────────────────────────────
CLASSIFY_PROMPT = """You are an expert Cambridge IGCSE Mathematics examiner classifying subparts of theory questions (Papers 2 and 4 — Extended).

SYLLABUS TAXONOMY — use ONLY these exact topic and subtopic names:

1. Number
   Subtopics: Number Basics and Calculations | Fractions, Decimals and Percentages | Powers, Roots and Standard Form | Indices and Surds | Ratio and Proportion | Time and Money | Rounding, Estimation and Bounds | Exponential Growth and Decay

2. Algebra and Graphs
   Subtopics: Algebraic Manipulation and Factorisation | Algebraic Fractions | Equations and Inequalities | Sequences | Proportion | Graphs and Curves | Differentiation | Functions

3. Coordinate Geometry
   Subtopics: Equations of Linear Graphs | Parallel Lines | Perpendicular Lines

4. Geometry
   Subtopics: Constructions and Nets | Scale Drawings and Bearings | Similarity | Symmetry | Angles and Polygons | Circle Theorems

5. Mensuration
   Subtopics: Area and Perimeter — 2D Shapes | Circles, Arcs and Sectors | Surface Area and Volume — 3D Shapes

6. Trigonometry
   Subtopics: Pythagoras and Right-Angled Triangles | Sine and Cosine Rules | Angles of Elevation and Depression

7. Transformations
   Subtopics: Transformations

8. Vectors
   Subtopics: Vector Operations | Vector Geometry

9. Probability
   Subtopics: Venn Diagrams | Independent Events and Conditional Probability

10. Statistics
    Subtopics: Statistical Diagrams | Scatter Diagrams | Cumulative Frequency | Histograms

SUBTOPIC DESCRIPTIONS (use these to guide classification):

Number:
- Number Basics and Calculations: Four operations, order of operations, integer properties, LCM, HCF, prime factorisation.
- Fractions, Decimals and Percentages: Converting between forms; percentage increase and decrease; reverse percentage; simple and compound interest.
- Powers, Roots and Standard Form: Evaluating powers and roots, square and cube numbers, standard form calculations.
- Indices and Surds: Index laws including negative and fractional indices; simplifying surds and irrational root expressions.
- Ratio and Proportion: Simplifying and sharing ratios, comparing quantities, direct and inverse proportion, proportional problems. Use this subtopic for straightforward ratio sharing, map scales, or basic proportional reasoning. For algebraic direct/inverse proportion (y ∝ x, y ∝ 1/x, y ∝ x²) use Algebra → Proportion instead.
- Time and Money: Time calculations, timetables, durations, currency, budgeting, financial arithmetic.
- Rounding, Estimation and Bounds: Rounding to specified accuracy, significant figures, decimal places, upper and lower bounds, error intervals.
- Exponential Growth and Decay: Repeated percentage growth or decay, compound changes, exponential models.

Algebra and Graphs:
- Algebraic Manipulation and Factorisation: Expanding brackets, simplifying expressions, factorising algebraic expressions, algebraic identities.
- Algebraic Fractions: Simplifying, adding, subtracting, multiplying and dividing algebraic fractions.
- Equations and Inequalities: Solving linear, quadratic, fractional and simultaneous equations; changing the subject of a formula; solving or representing inequalities.
- Sequences: Finding terms, identifying patterns, nth term, arithmetic or other specified sequences.
- Proportion: Forming and solving equations involving direct or inverse proportional relationships including powers of variables (y = kx², y = k/x, etc.). This is the Extended-level algebraic treatment of proportion.
- Graphs and Curves: Constructing, interpreting and sketching linear, quadratic, cubic, reciprocal and exponential graphs; tables of values; finding roots and intersections; turning points and asymptotes; practical graphs and rates of change.
- Differentiation: Differentiating polynomial expressions, finding gradients of curves, determining stationary points, maxima or minima.
- Functions: Function notation, evaluating functions, composite and inverse functions, domain and range.

Coordinate Geometry:
- Equations of Linear Graphs: Finding and using equations in the form y=mx+c; interpreting gradients and intercepts; determining line equations from graphs or coordinates.
- Parallel Lines: Using equal gradients to identify parallel lines; finding unknown line equations or parameters.
- Perpendicular Lines: Using negative reciprocal gradients to identify perpendicular lines; finding unknown line equations or parameters.

Geometry:
- Constructions and Nets: Constructing lines, angles and triangles using geometrical instruments; drawing nets of 3D solids.
- Scale Drawings and Bearings: Scale diagrams, measuring distances and directions, three-figure bearings.
- Similarity: Identifying similar shapes, corresponding angles and side ratios, missing lengths or scale factors.
- Symmetry: Line symmetry and rotational symmetry in 2D shapes.
- Angles and Polygons: Calculating angles using angle rules, parallel lines, triangles, quadrilaterals, interior and exterior angles, regular polygons.
- Circle Theorems: Circle-angle properties and tangent-radius relationships, angle in a semicircle, other circle theorems.

Mensuration:
- Area and Perimeter — 2D Shapes: Perimeters and areas of standard 2D shapes and composite figures.
- Circles, Arcs and Sectors: Circumference, area of circles, arc lengths and sector areas.
- Surface Area and Volume — 3D Shapes: Surface areas and volumes of cuboids, prisms, cylinders, spheres, pyramids, cones, composite solids.

Trigonometry:
- Pythagoras and Right-Angled Triangles: Pythagoras' theorem and sine/cosine/tangent ratios to find missing lengths and angles in right-angled triangles.
- Sine and Cosine Rules: Sine rule and cosine rule to find unknown sides or angles in non-right-angled triangles.
- Angles of Elevation and Depression: Problems involving horizontal lines of sight, heights, distances and angles of elevation or depression.

Transformations:
- Transformations: Describing, applying or combining reflections, rotations, enlargements and translations on a coordinate plane; identifying the type, centre, angle, scale factor or vector of a transformation.

Vectors:
- Vector Operations: Adding, subtracting and multiplying vectors by scalars; expressing vectors in terms of other vectors.
- Vector Geometry: Using vectors to describe geometric relationships, determine ratios and positions, construct geometric proofs.

Probability:
- Venn Diagrams: Representing sets and events using Venn diagrams; interpreting intersections and unions; calculating probabilities from the diagram.
- Independent Events and Conditional Probability: Determining whether events are independent; calculating probabilities of combined events; finding probabilities given another event has occurred.

Statistics:
- Statistical Diagrams: Constructing and interpreting bar charts, pie charts, pictograms, stem-and-leaf diagrams, frequency diagrams.
- Scatter Diagrams: Plotting paired data, identifying correlation, lines of best fit, making estimates.
- Cumulative Frequency: Constructing and interpreting cumulative frequency tables and curves; estimating medians, quartiles, percentiles, interquartile ranges.
- Histograms: Constructing and interpreting histograms using frequency density, class intervals and frequency.

CLASSIFICATION RULES:
- You are classifying a SINGLE SUBPART (e.g. Q3(b)(ii)), not the whole question.
- Identify the PRIMARY mathematical skill this specific subpart is testing.
- Assign 1 topic+subtopic if the subpart clearly tests one concept.
- Assign 2 topic+subtopic pairs ONLY if the subpart genuinely bridges two distinct concepts.
- NEVER assign more than 3 pairs — do not force extra topics.
- Use ONLY the exact topic and subtopic strings from the taxonomy above.
- Do NOT invent new topics or subtopics.

SPECIFIC CLASSIFICATION RULES:
- Basic ratio sharing or scale problems → Number / Ratio and Proportion
- Algebraic y = kxⁿ or y = k/xⁿ proportion → Algebra and Graphs / Proportion
- y = mx + c, gradient, intercept → Coordinate Geometry / Equations of Linear Graphs
- Parallel lines (equal gradients) → Coordinate Geometry / Parallel Lines
- Perpendicular lines (negative reciprocal) → Coordinate Geometry / Perpendicular Lines
- General curve sketching, quadratic/cubic graphs, turning points → Algebra and Graphs / Graphs and Curves
- Gradient of a curve by differentiation → Algebra and Graphs / Differentiation
- f(x) notation, composite f(g(x)), inverse f⁻¹(x) → Algebra and Graphs / Functions
- Area or perimeter of 2D shapes → Mensuration / Area and Perimeter — 2D Shapes
- Circumference, arc, sector → Mensuration / Circles, Arcs and Sectors
- Surface area or volume of 3D shapes → Mensuration / Surface Area and Volume — 3D Shapes
- Pythagoras or SOHCAHTOA in right-angled triangle → Trigonometry / Pythagoras and Right-Angled Triangles
- Sine rule or cosine rule → Trigonometry / Sine and Cosine Rules
- Angle of elevation or depression → Trigonometry / Angles of Elevation and Depression
- Circle angle properties, tangent-radius → Geometry / Circle Theorems
- Vectors adding/subtracting/scalar multiply → Vectors / Vector Operations
- Vector proofs, midpoints, geometric relationships → Vectors / Vector Geometry
- Venn diagram probability → Probability / Venn Diagrams
- Tree diagram, conditional probability, independent events → Probability / Independent Events and Conditional Probability
- Mensuration and geometry overlap: calculating area, perimeter, surface area or volume belongs under Mensuration even when geometric shapes are involved.
- Trigonometry and Pythagoras overlap: use Pythagoras and Right-Angled Triangles when that is the main method; use the relevant trigonometry subtopic when trigonometric ratios or rules are central.

Respond with ONLY valid JSON, nothing else. Examples:

Single topic:
{"classifications": [{"topic": "Algebra and Graphs", "subtopic": "Equations and Inequalities"}]}

Two topics (only when subpart genuinely spans both):
{"classifications": [{"topic": "Mensuration", "subtopic": "Surface Area and Volume — 3D Shapes"}, {"topic": "Trigonometry", "subtopic": "Pythagoras and Right-Angled Triangles"}]}
"""

# ── Helpers ───────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent.parent
SUBJECT_CODE = "0580"
THEORY_DIR   = BASE_DIR / "public" / "theory-questions"

def _parse_classifications(text: str) -> list[dict]:
    """Parse JSON classifications from model response text."""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        result = json.loads(match.group())
        classifications = result.get("classifications", [])
        valid = [
            c for c in classifications
            if isinstance(c, dict) and "topic" in c and "subtopic" in c
        ]
        return valid[:3]
    return []

def classify_with_gemini(part_text: str, context_text: str, model: str) -> list[dict]:
    """Send subpart text to Gemini. Returns list of {topic, subtopic} dicts."""
    prompt_content = CLASSIFY_PROMPT
    if context_text:
        prompt_content += f"\n\nQuestion context: {context_text}"
    prompt_content += f"\n\nSubpart to classify: {part_text}"

    for key_idx, client in enumerate(_clients):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[prompt_content]
            )
            result = _parse_classifications(response.text.strip())
            if result:
                return result
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                print(f"\n[FATAL] key{key_idx+1}: quota exhausted — rotate your API key and re-run.")
                sys.exit(1)
            elif "403" in err or "PERMISSION_DENIED" in err:
                print(f"\n[FATAL] key{key_idx+1}: permission denied — check your API key.")
                sys.exit(1)
            elif "503" in err or "UNAVAILABLE" in err:
                print(f"\n[FATAL] key{key_idx+1}: service unavailable — try again later.")
                sys.exit(1)
            else:
                print(f"\n[FATAL] key{key_idx+1}: unexpected error — {err[:120]}")
                sys.exit(1)

    return []

def classify_with_openai(part_text: str, context_text: str, model: str) -> list[dict]:
    """Send subpart text to OpenAI. Returns list of {topic, subtopic} dicts."""
    global _openai_client
    if _openai_client is None:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            print("[FATAL] OPENAI_API_KEY not found in .env")
            sys.exit(1)
        _openai_client = _OpenAI(api_key=openai_key)

    messages = [{"role": "system", "content": CLASSIFY_PROMPT}]
    user_content = ""
    if context_text:
        user_content += f"Question context: {context_text}\n\n"
    user_content += f"Subpart to classify: {part_text}"
    messages.append({"role": "user", "content": user_content})

    try:
        response = _openai_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0,
        )
        text = response.choices[0].message.content.strip()
        result = _parse_classifications(text)
        if result:
            return result
    except Exception as e:
        err = str(e)
        if "429" in err or "rate_limit" in err.lower():
            print(f"\n[FATAL] OpenAI: rate limit hit — slow down or upgrade plan.")
            sys.exit(1)
        elif "401" in err or "authentication" in err.lower():
            print(f"\n[FATAL] OpenAI: invalid API key.")
            sys.exit(1)
        else:
            print(f"\n[FATAL] OpenAI: unexpected error — {err[:120]}")
            sys.exit(1)

    return []

_topic_id_cache: dict[tuple, int] = {}

def lookup_topic_id(topic: str, subtopic: str) -> int | None:
    """Look up topic id. Falls back to subtopic-only if model shortened the topic name."""
    key = (SUBJECT_CODE, topic, subtopic)
    if key in _topic_id_cache:
        return _topic_id_cache[key]

    result = (
        supabase.table("topics")
        .select("id")
        .eq("subject_code", SUBJECT_CODE)
        .eq("topic", topic)
        .eq("subtopic", subtopic)
        .execute()
    )
    if result.data:
        tid = result.data[0]["id"]
        _topic_id_cache[key] = tid
        return tid

    # Fallback: subtopic-only match
    result2 = (
        supabase.table("topics")
        .select("id")
        .eq("subject_code", SUBJECT_CODE)
        .eq("subtopic", subtopic)
        .execute()
    )
    if result2.data:
        tid = result2.data[0]["id"]
        _topic_id_cache[key] = tid
        return tid

    return None

def make_subpart_id(paper_id: str, part_id: str) -> str:
    return f"{paper_id}_{part_id}"

def get_leaf_parts(question: dict) -> list[dict]:
    """Recursively collect all leaf parts (parts with no nested parts)."""
    leaves = []
    q_no   = int(question["id"])

    def _to_str(val) -> str:
        if isinstance(val, list):
            return " ".join(str(v) for v in val if v)
        return val or ""

    q_context = _to_str(question.get("text") or question.get("context"))

    def walk(part: dict, parent_context: str):
        children = part.get("parts", [])
        if not children:
            leaves.append({**part, "_q_no": q_no, "_context": parent_context})
        else:
            combined = (parent_context + " " + _to_str(part.get("text"))).strip()
            for child in children:
                walk(child, combined)

    top_parts = question.get("parts", [])
    if not top_parts:
        leaves.append({
            "id":          question["id"],
            "label":       question["id"],
            "text":        question.get("text", ""),
            "marks":       question.get("marks", 1),
            "diagramOnly": False,
            "_q_no":       q_no,
            "_context":    "",
        })
    else:
        for part in top_parts:
            walk(part, q_context)

    return leaves

# ── Main ──────────────────────────────────────────────────────────────────────
def process_papers(
    paper_id_arg: str = None,
    year_from: int = None,
    year_to: int = None,
    max_papers: int = None,
    dry_run: bool = False,
    model: str = "gemini-2.0-flash-lite",
    use_openai: bool = False,
):
    if paper_id_arg:
        specific = THEORY_DIR / f"{paper_id_arg}.json"
        if not specific.exists():
            print(f"No paper found: {specific}")
            sys.exit(1)
        paper_files = [specific]
    else:
        # Match paper 2 and paper 4 variants
        all_files = []
        for pattern in [f"{SUBJECT_CODE}_*_qp_2*.json", f"{SUBJECT_CODE}_*_qp_4*.json"]:
            all_files.extend(THEORY_DIR.glob(pattern))
        paper_files = sorted(set(all_files))

        if year_from or year_to:
            def year_of(f):
                m = re.search(r'_(m|s|w)(\d{2})_', f.name)
                return int(m.group(2)) + 2000 if m else 0
            paper_files = [
                f for f in paper_files if
                (year_from is None or year_of(f) >= year_from) and
                (year_to   is None or year_of(f) <= year_to)
            ]

    if not paper_files:
        print("No papers found.")
        sys.exit(1)

    if max_papers:
        paper_files = paper_files[:max_papers]

    print(f"Found {len(paper_files)} paper(s)")

    total_inserted = 0
    total_skipped  = 0
    total_errors   = 0

    for paper_file in paper_files:
        paper_data = json.loads(paper_file.read_text(encoding="utf-8"))
        paper_id_  = paper_data.get("paperId") or paper_file.stem
        questions  = paper_data.get("questions", [])

        if not questions or questions == [{"viewOnly": True}] or questions == [{}]:
            print(f"\n-- {paper_id_} [SKIP] view-only stub --")
            continue

        all_leaves = []
        for q in questions:
            all_leaves.extend(get_leaf_parts(q))

        print(f"\n-- {paper_id_} ({len(questions)} questions, {len(all_leaves)} subparts) --")

        for leaf in all_leaves:
            raw_text  = leaf.get("text", "")
            part_text = (" ".join(raw_text) if isinstance(raw_text, list) else raw_text).strip()
            context   = leaf.get("_context", "").strip()
            q_no      = leaf["_q_no"]
            marks     = leaf.get("marks") or 1
            part_id   = leaf["id"]
            subpart_id = make_subpart_id(paper_id_, part_id)

            print(f"  {subpart_id}", end=" ")

            if leaf.get("diagramOnly") and not part_text and not context:
                print("[SKIP] diagram-only, no context")
                total_skipped += 1
                continue

            if not part_text and not context:
                print("[SKIP] no text")
                total_skipped += 1
                continue

            classify_text = part_text if part_text else context

            existing = supabase.table("theory_questions").select("id").eq("id", subpart_id).execute()
            if existing.data:
                print("[SKIP] already in DB")
                total_skipped += 1
                continue

            if use_openai:
                classifications = classify_with_openai(classify_text, context, model=model)
            else:
                classifications = classify_with_gemini(classify_text, context, model=model)

            if not classifications:
                print("[SKIP] no valid classification returned")
                total_skipped += 1
                continue

            labels = " + ".join(c["subtopic"] for c in classifications)
            print(f"-> {labels}", end=" ")

            if dry_run:
                print("(dry run)")
                continue

            try:
                supabase.table("theory_questions").insert({
                    "id":           subpart_id,
                    "subject_code": SUBJECT_CODE,
                    "paper_id":     paper_id_,
                    "question_no":  q_no,
                    "subpart":      part_id,
                    "marks":        marks,
                    "image_path":   None,
                }).execute()

                inserted_topics = 0
                for c in classifications:
                    tid = lookup_topic_id(c["topic"], c["subtopic"])
                    if tid is None:
                        print(f"\n  [WARN] topic not in DB: {c['topic']} / {c['subtopic']} — skipping")
                        continue
                    supabase.table("theory_question_topics").insert({
                        "question_id": subpart_id,
                        "topic_id":    tid,
                    }).execute()
                    inserted_topics += 1

                print(f"[OK] ({inserted_topics} topic(s))")
                total_inserted += 1

            except Exception as e:
                print(f"[ERROR] DB: {e}")
                total_errors += 1

            time.sleep(3)

    print(f"\n{'='*55}")
    print(f"Done. Inserted: {total_inserted} | Skipped: {total_skipped} | Errors: {total_errors}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Classify Mathematics Extended theory subparts (Papers 2 & 4) using Gemini or OpenAI"
    )
    parser.add_argument("--paper-id",   help="Single paper e.g. 0580_m25_qp_42")
    parser.add_argument("--year-from",  type=int, help="Start year e.g. 2020")
    parser.add_argument("--year-to",    type=int, help="End year e.g. 2025")
    parser.add_argument("--max-papers", type=int, help="Limit number of papers processed")
    parser.add_argument("--dry-run",    action="store_true", help="Classify but don't insert into DB")
    parser.add_argument("--model",      default="gemini-2.0-flash-lite", help="Model to use (Gemini or OpenAI)")
    parser.add_argument("--use-key",    type=int, default=None, help="Gemini key slot: 1, 2, 3 or 4")
    parser.add_argument("--openai",     action="store_true", help="Use OpenAI instead of Gemini (uses OPENAI_API_KEY from .env)")
    args = parser.parse_args()

    if args.openai:
        if not _openai_available:
            print("ERROR: openai package not installed — run: pip install openai")
            sys.exit(1)
        openai_model = args.model if args.model != "gemini-2.0-flash-lite" else "gpt-4o-mini"
        print(f"Using OpenAI model: {openai_model}")
        process_papers(
            paper_id_arg = args.paper_id,
            year_from    = args.year_from,
            year_to      = args.year_to,
            max_papers   = args.max_papers,
            dry_run      = args.dry_run,
            model        = openai_model,
            use_openai   = True,
        )
    else:
        if not _clients:
            print("ERROR: No GEMINI_API_KEY found in .env")
            sys.exit(1)
        if args.use_key is not None:
            idx = args.use_key - 1
            if idx < 0 or idx >= len(_clients):
                print(f"ERROR: --use-key {args.use_key} out of range (only {len(_clients)} key(s) loaded)")
                sys.exit(1)
            _clients[:] = [_clients[idx]]
            print(f"Restricted to key slot {args.use_key} only")
        print(f"Using Gemini model: {args.model}")
        process_papers(
            paper_id_arg = args.paper_id,
            year_from    = args.year_from,
            year_to      = args.year_to,
            max_papers   = args.max_papers,
            dry_run      = args.dry_run,
            model        = args.model,
            use_openai   = False,
        )
