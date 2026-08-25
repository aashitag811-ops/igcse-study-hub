"""
Batch MCQ Parser — A-Level + IGCSE 2026

A-Level MCQ subjects (all years 2010-2026):
  9700 Biology     Paper 1  (40q, image-based)
  9701 Chemistry   Paper 1  (40q, image-based)
  9702 Physics     Paper 1  (40q, image-based)
  9708 Economics   Paper 1 & 3  (30q)
  9706 Accounting  Paper 1  (30q)

IGCSE 2026 MCQ subjects (m26 + s26 only):
  0610 Biology     Papers 1 & 2  (40q)
  0620 Chemistry   Papers 1 & 2  (40q)
  0625 Physics     Papers 1 & 2  (40q)
  0455 Economics   Paper 1  (30q)
  0452 Accounting  Paper 1  (30q)

Usage:
  python scripts/batch-parse-alevels-mcq.py
  python scripts/batch-parse-alevels-mcq.py --subject 9700
  python scripts/batch-parse-alevels-mcq.py --force
  python scripts/batch-parse-alevels-mcq.py --igcse-2026-only
  python scripts/batch-parse-alevels-mcq.py --alevels-only
"""

import os, sys, json, argparse, importlib.util
import urllib.request
from pathlib import Path

# ── paths ─────────────────────────────────────────────────────────────────────

ROOT       = Path(__file__).parent.parent
LOCAL_2026 = Path(__file__).parent / "pastpapers-2026"
CACHE_DIR  = Path(os.environ.get("TEMP", "/tmp")) / "alevels-mcq-pdfs"
OUTPUT_DIR = ROOT / "public" / "papers"

CACHE_DIR.mkdir(parents=True, exist_ok=True)

ALEVEL_ARCHIVE = "https://archive.org/download/student-archive-alevels-pastpapers"
IGCSE_ARCHIVE  = "https://archive.org/download/student-archive-igcse-pastpapers"

# ── load single-paper parser via importlib (hyphens in filename) ──────────────

def _load(name: str):
    spec = importlib.util.spec_from_file_location(
        name, Path(__file__).parent / f"{name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

_parser = _load("parse-alevels-mcq")
parse_one = _parser.parse_paper

# ── A-Level target list ───────────────────────────────────────────────────────

ALEVEL_MCQ = {
    "9700": [1], "9701": [1], "9702": [1],
    "9708": [1, 3], "9706": [1],
}

def alevel_targets(subject_filter=None):
    for code in sorted(ALEVEL_MCQ):
        if subject_filter and code != subject_filter:
            continue
        for comp in ALEVEL_MCQ[code]:
            for yr in range(10, 27):       # s10..s26
                for var in ["1","2","3"]:
                    yield code, f"s{yr:02d}", comp, var
            for yr in range(10, 26):       # w10..w25
                for var in ["1","2","3"]:
                    yield code, f"w{yr:02d}", comp, var
            for yr in range(16, 27):       # m16..m26
                yield code, f"m{yr:02d}", comp, "2"

# ── IGCSE 2026 target list ────────────────────────────────────────────────────

IGCSE_2026_MCQ = {
    "0610": [1, 2], "0620": [1, 2], "0625": [1, 2],
    "0455": [1],    "0452": [1],
}

def igcse_2026_targets():
    for code in sorted(IGCSE_2026_MCQ):
        for comp in IGCSE_2026_MCQ[code]:
            yield code, "m26", comp, "2"           # march — variant 2 only
            for var in ["1","2","3"]:
                yield code, "s26", comp, var        # mayjune — variants 1,2,3

# ── PDF fetch ─────────────────────────────────────────────────────────────────

def _local(code, sess, comp, var, kind):
    p = LOCAL_2026 / f"{code}_{sess}_{kind}_{comp}{var}.pdf"
    return p if p.exists() else None

def _get(code, sess, comp, var, kind, archive_base):
    lp = _local(code, sess, comp, var, kind)
    if lp:
        return lp
    dest = CACHE_DIR / f"{code}_{sess}_{kind}_{comp}{var}.pdf"
    if dest.exists() and dest.stat().st_size > 5_000:
        return dest
    url = f"{archive_base}/{code}_{sess}_{kind}_{comp}{var}.pdf"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BatchMCQ/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        if len(data) < 5_000:
            return None
        dest.write_bytes(data)
        return dest
    except Exception:
        return None

def already_parsed(code, sess, comp, var):
    out = OUTPUT_DIR / f"{code}_{sess}_qp_{comp}{var}.json"
    if not out.exists():
        return False
    try:
        d = json.loads(out.read_text(encoding="utf-8"))
        return bool(d.get("isMcqParsed")) and len(d.get("questions", [])) > 5
    except Exception:
        return False

# ── batch runner ──────────────────────────────────────────────────────────────

def run_batch(targets, archive_base, label, force):
    print(f"\n=== {label} ===", flush=True)
    total = ok = skipped = no_qp = failed = 0
    for code, sess, comp, var in targets:
        total += 1
        if not force and already_parsed(code, sess, comp, var):
            skipped += 1
            continue
        qp = _get(code, sess, comp, var, "qp", archive_base)
        if not qp:
            no_qp += 1
            continue
        _get(code, sess, comp, var, "ms", archive_base)  # pre-fetch MS
        pid = f"{code}_{sess}_qp_{comp}{var}"
        print(f"  {pid} ...", end=" ", flush=True)
        try:
            result = parse_one(str(qp), str(OUTPUT_DIR))
            if result and result.get("isMcqParsed"):
                ok += 1
                print(f"OK ({len(result.get('questions',[]))}q)", flush=True)
            else:
                skipped += 1
                print("skip", flush=True)
        except Exception as e:
            failed += 1
            print(f"ERR: {e}", flush=True)
    print(f"  => total={total} ok={ok} skipped={skipped} no_qp={no_qp} failed={failed}")

# ── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", help="Limit A-level batch to one code (e.g. 9700)")
    ap.add_argument("--force",   action="store_true", help="Re-parse even if already done")
    ap.add_argument("--igcse-2026-only", action="store_true")
    ap.add_argument("--alevels-only",    action="store_true")
    args = ap.parse_args()

    if not args.igcse_2026_only:
        run_batch(
            list(alevel_targets(args.subject)),
            ALEVEL_ARCHIVE,
            f"A-Level MCQ (all years)",
            args.force,
        )

    if not args.alevels_only:
        run_batch(
            list(igcse_2026_targets()),
            IGCSE_ARCHIVE,
            "IGCSE 2026 MCQ (m26 + s26)",
            args.force,
        )

    print("\nDone. Run:")
    print("  node scripts/generate-alevels-manifest.js")
    print("  node scripts/generate-papers-manifest.js")

if __name__ == "__main__":
    main()
