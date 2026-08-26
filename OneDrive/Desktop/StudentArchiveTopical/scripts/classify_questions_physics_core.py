"""
classify_questions_physics_core.py
Reads Cambridge IGCSE Physics Core (0625) paper JSONs, sends each question image
to Gemini Vision, gets topic + subtopic back, then inserts into Supabase questions table.

Usage:
    python scripts/classify_questions_physics_core.py --paper-id 0625_s23_qp_12
    python scripts/classify_questions_physics_core.py --subject 0625 --paper 1 --year-from 2020 --year-to 2025
    python scripts/classify_questions_physics_core.py --subject 0625 --paper 1 --year-from 2020 --year-to 2025 --use-key 1 --model gemini-2.5-flash
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

_raw_keys = [k for k in [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4"),
] if k]

if not _raw_keys:
    print("ERROR: No GEMINI_API_KEY found in .env")
    sys.exit(1)

if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

# ── Clients ───────────────────────────────────────────────────────────────────
_clients = [genai.Client(api_key=k) for k in _raw_keys]
print(f"Loaded {len(_clients)} Gemini API key(s)")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── IGCSE Physics Core 0625 syllabus ─────────────────────────────────────────
CLASSIFY_PROMPT = """You are an expert IGCSE Physics examiner classifying Cambridge IGCSE Physics Core (0625) multiple choice questions.

SYLLABUS TAXONOMY — you MUST use ONLY these exact topic and subtopic names:

1. Motion, Forces and Energy
   Subtopics: Measurements | Motion | Mass, Weight, Density and Pressure | Forces | Turning Effects and Centre of Gravity | Energy, Work and Power | Energy Resources

2. Thermal Physics
   Subtopics: States of Matter | Particle Model | Temperature | Thermal Expansion | Internal Energy | Specific Heat Capacity | Changes of State | Thermal Energy Transfer

3. Waves
   Subtopics: Properties of Waves | Phenomena of Light | Thin Lenses | Electromagnetic Spectrum | Sound

4. Electricity and Magnetism
   Subtopics: Magnetism | Electric Charge | Current and Resistance | Electromotive Force and Potential Difference | Electrical Energy and Power | Electric Circuits | Electrical Safety | Electromagnetic Effects

5. Nuclear Physics
   Subtopics: Atomic Structure | Detection of Radioactivity | Nuclear Emissions | Radioactive Decay and Half-Life | Nuclear Safety

6. Space Physics
   Subtopics: Earth and Solar System | Stars | Universe

CLASSIFICATION RULES:
- Classify according to the PRIMARY CONCEPT BEING TESTED, not keywords mentioned in passing.
- Choose the MOST SPECIFIC applicable subtopic.

TOPIC 1 — MOTION, FORCES AND ENERGY:
- Questions about measurement techniques, instruments, units, reading scales, measuring length/time/volume → Measurements
- Questions about speed, velocity, acceleration, distance-time or speed-time graphs, equations of motion → Motion
- Questions about mass, weight (W=mg), density (ρ=m/V) or pressure (p=F/A or p=ρgh) → Mass, Weight, Density and Pressure
- Questions about balanced/unbalanced forces, Newton's laws, friction, drag, terminal velocity, resultant force → Forces
- Questions about moments, torques, principle of moments, centre of gravity, stability → Turning Effects and Centre of Gravity
- Questions about kinetic energy, gravitational potential energy, work done (W=Fd), power (P=W/t), efficiency → Energy, Work and Power
- Questions about renewable/non-renewable energy sources, fossil fuels, solar, wind, nuclear as energy sources → Energy Resources

TOPIC 2 — THERMAL PHYSICS:
- Questions about arrangement, spacing and movement of particles in solids, liquids and gases → States of Matter
- Questions about particle model explanations of gas pressure, Brownian motion, diffusion in a thermal context → Particle Model
- Questions about thermometers, temperature scales, Celsius, Kelvin, fixed points → Temperature
- Questions about expansion of solids/liquids/gases when heated, bimetallic strips, applications of expansion → Thermal Expansion
- Questions about internal energy as sum of kinetic and potential energies of particles → Internal Energy
- Questions about specific heat capacity (Q=mcΔT), thermal capacity → Specific Heat Capacity
- Questions about melting, boiling, evaporation, condensation, freezing, latent heat, heating/cooling curves → Changes of State
- Questions about conduction, convection, radiation, insulation, vacuum flask → Thermal Energy Transfer

TOPIC 3 — WAVES:
- Questions about wave speed, frequency, wavelength, amplitude, period, transverse vs longitudinal → Properties of Waves
- Questions about reflection, refraction, total internal reflection, critical angle, diffraction of light → Phenomena of Light
- Questions about converging/diverging lenses, focal length, ray diagrams, real/virtual images → Thin Lenses
- Questions about the electromagnetic spectrum, types of EM waves, uses and dangers → Electromagnetic Spectrum
- Questions about sound waves, pitch, loudness, ultrasound, speed of sound, echoes → Sound

TOPIC 4 — ELECTRICITY AND MAGNETISM:
- Questions about permanent magnets, magnetic fields, field patterns, magnetic materials → Magnetism
- Questions about static electricity, electric charge, attraction/repulsion, charging by friction/induction → Electric Charge
- Questions about current (I=Q/t), resistance (R=V/I), Ohm's law, factors affecting resistance → Current and Resistance
- Questions about EMF, potential difference, terminal voltage, internal resistance → Electromotive Force and Potential Difference
- Questions about electrical power (P=IV, P=I²R), electrical energy (E=Pt), cost of electricity → Electrical Energy and Power
- Questions about series and parallel circuits, combined resistance, current and voltage rules → Electric Circuits
- Questions about fuses, earthing, circuit breakers, safe wiring, three-pin plugs → Electrical Safety
- Questions about the motor effect, electromagnetic induction, transformers, generators, loudspeakers → Electromagnetic Effects

TOPIC 5 — NUCLEAR PHYSICS:
- Questions about atomic structure, protons, neutrons, electrons, atomic number, mass number, isotopes → Atomic Structure
- Questions about Geiger-Müller tube, cloud chambers, detecting radiation, background radiation → Detection of Radioactivity
- Questions about properties of alpha, beta and gamma radiation, penetration, ionisation → Nuclear Emissions
- Questions about half-life, radioactive decay calculations, decay curves, activity → Radioactive Decay and Half-Life
- Questions about safe handling of radioactive materials, shielding, exposure limits, disposal → Nuclear Safety

TOPIC 6 — SPACE PHYSICS:
- Questions about the Earth, Moon, planets, Solar System, orbits, gravitational fields → Earth and Solar System
- Questions about the life cycle of stars, main sequence, red giant, white dwarf, neutron star, black hole → Stars
- Questions about galaxies, the Milky Way, the expanding universe, Big Bang, red-shift → Universe

EDGE CASES:
- Pressure in a liquid (p=ρgh) → Mass, Weight, Density and Pressure (NOT Forces).
- Kinetic energy calculation → Energy, Work and Power (NOT Motion).
- Acceleration calculation → Motion (NOT Forces unless Newton's second law F=ma is the main concept).
- Specific heat capacity vs latent heat: heating a substance (Q=mcΔT) → Specific Heat Capacity. Change of state (latent heat) → Changes of State.
- Light reflection/refraction → Phenomena of Light. Lens forming an image → Thin Lenses.
- V=IR or resistance calculation → Current and Resistance. Circuit analysis with multiple components → Electric Circuits.
- Motor effect → Electromagnetic Effects. Simple circuit current → Electric Circuits.
- Half-life → Radioactive Decay and Half-Life. Properties of radiation → Nuclear Emissions.
- Energy sources (solar panels, wind turbines as energy resources) → Energy Resources. Electrical power from a device → Electrical Energy and Power.

- Do NOT create new topics or modify the taxonomy above.
- Do NOT assign multiple topics.
- Be consistent — same concept = same subtopic regardless of wording.

Look at the question image carefully. Respond with ONLY valid JSON, nothing else:
{"topic": "exact topic name from taxonomy", "subtopic": "exact subtopic name from taxonomy"}
"""

# ── Helpers ───────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent

def image_path_from_url(image_url: str) -> Path:
    clean = image_url.split("?")[0]
    return BASE_DIR / "public" / clean.lstrip("/")

def classify_with_gemini(image_path: Path, model: str) -> dict:
    """Send image to Gemini. Hard-stops on any API error."""
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
                    result["topic"]    = re.sub(r'^\d+\.\s*', '', result["topic"]).strip()
                    result["subtopic"] = re.sub(r'^\d+\.\s*', '', result["subtopic"]).strip()
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

    return {"topic": "Unknown", "subtopic": "Unknown"}

def make_question_id(paper_id: str, question_number: int) -> str:
    return f"{paper_id}_Q{question_number:02d}"

# ── Main ──────────────────────────────────────────────────────────────────────
def process_papers(subject_code: str, paper_variant: str, limit: int = None, dry_run: bool = False, max_papers: int = None, year_from: int = None, year_to: int = None, paper_id: str = None, model: str = "gemini-2.5-flash"):
    papers_dir = BASE_DIR / "public" / "papers"

    if paper_id:
        specific = papers_dir / f"{paper_id}.json"
        if not specific.exists():
            print(f"No paper found: {specific}")
            sys.exit(1)
        paper_files = [specific]
    else:
        pattern     = f"{subject_code}_*_qp_{paper_variant}*.json"
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
            if "questionNumber" not in q:
                continue  # skip viewOnly stubs

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

            if topic == "Unknown" or subtopic == "Unknown":
                print("[SKIP] unknown classification — not inserting")
                total_skipped += 1
                continue

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
    parser = argparse.ArgumentParser(description="Classify Physics Core MCQ questions using Gemini Vision")
    parser.add_argument("--subject",    default="0625",  help="Subject code e.g. 0625")
    parser.add_argument("--paper",      default="1",     help="Paper number e.g. 1 (matches qp_11, qp_12, qp_13)")
    parser.add_argument("--limit",      type=int,        help="Limit questions per paper (for testing)")
    parser.add_argument("--max-papers", type=int,        help="Limit number of papers to process")
    parser.add_argument("--year-from",  type=int,        help="Start year e.g. 2020")
    parser.add_argument("--year-to",    type=int,        help="End year e.g. 2025")
    parser.add_argument("--paper-id",                    help="Target a single paper e.g. 0625_s23_qp_12")
    parser.add_argument("--dry-run",    action="store_true", help="Classify but don't insert into DB")
    parser.add_argument("--model",      default="gemini-2.5-flash", help="Gemini model to use")
    parser.add_argument("--use-key",    type=int, default=None, help="Use only this key slot: 1, 2, 3 or 4")
    args = parser.parse_args()

    if args.use_key is not None:
        idx = args.use_key - 1
        if idx < 0 or idx >= len(_clients):
            print(f"ERROR: --use-key {args.use_key} is out of range (only {len(_clients)} key(s) loaded)")
            sys.exit(1)
        _clients[:] = [_clients[idx]]
        print(f"Restricted to key slot {args.use_key} only")

    print(f"Using model: {args.model}")
    process_papers(args.subject, args.paper, args.limit, args.dry_run, args.max_papers, args.year_from, args.year_to, args.paper_id, args.model)
