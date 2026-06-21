"""
Download PDFs from Supabase Storage and convert them with the advanced extractor.

This version uses the REST API plus the richer PDF pipeline so generated JSON
can include prompt images and table data.
"""

import os
import re
import sys
import tempfile
import importlib.util
from pathlib import Path

import requests

EXTRACTOR_PATH = Path(__file__).with_name("advanced-pdf-extractor.py")
spec = importlib.util.spec_from_file_location("advanced_pdf_extractor", EXTRACTOR_PATH)
advanced_pdf_extractor = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(advanced_pdf_extractor)
AdvancedPDFExtractor = advanced_pdf_extractor.AdvancedPDFExtractor


print("=" * 60)
print("Convert Papers from Supabase with Advanced Extraction")
print("=" * 60)

SUPABASE_URL = input("\nEnter your Supabase URL: ").strip().rstrip("/")
SUPABASE_KEY = input("Enter your Supabase Anon Key: ").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Both URL and Key are required.")
    sys.exit(1)


def list_papers_in_bucket():
    """List ICT paper PDFs from Supabase Storage using the REST API."""
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
    }

    papers = []
    subject_folder = "ICT 0417 Paper 1"
    season_url = f"{SUPABASE_URL}/storage/v1/object/list/Past Papers"

    try:
        season_response = requests.post(
            season_url,
            headers=headers,
            json={"prefix": f"{subject_folder}/", "limit": 200},
            timeout=30,
        )
        season_response.raise_for_status()
        season_folders = season_response.json()

        for season in season_folders:
            season_name = season.get("name", "")
            if not season_name or season_name == subject_folder:
                continue

            folder_name = season_name.replace(f"{subject_folder}/", "")
            pdf_response = requests.post(
                season_url,
                headers=headers,
                json={"prefix": f"{subject_folder}/{folder_name}/", "limit": 200},
                timeout=30,
            )

            if pdf_response.status_code != 200:
                continue

            pdfs = pdf_response.json()
            for pdf in pdfs:
                pdf_name = pdf.get("name", "")
                if pdf_name.endswith(".pdf") and "_qp_" in pdf_name:
                    filename = pdf_name.split("/")[-1]
                    papers.append({
                        "path": f"{subject_folder}/{folder_name}/{filename}",
                        "name": filename,
                    })
    except Exception as exc:
        print(f"Failed to list papers: {exc}")
        return []

    return papers


def download_from_supabase(file_path):
    """Download a PDF from Supabase Storage."""
    print(f"Downloading: {file_path}")
    url = f"{SUPABASE_URL}/storage/v1/object/Past Papers/{file_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }

    response = requests.get(url, headers=headers, timeout=120)
    response.raise_for_status()
    print(f"Downloaded {len(response.content)} bytes")
    return response.content


def parse_filename(filename):
    match = re.match(r"(\d{4})_([msw])(\d{2})_qp_1(\d)\.pdf", filename)
    if match:
        subject = match.group(1)
        season = match.group(2)
        year = int("20" + match.group(3))
        variant = int(match.group(4))
        return subject, year, season, variant
    return None, None, None, None


def enrich_metadata(json_path, filename):
    import json

    subject, year, season, variant = parse_filename(filename)
    if not all(value is not None for value in [subject, year, season, variant]):
        return

    season_names = {
        "m": "February March",
        "s": "May June",
        "w": "October November",
    }

    with open(json_path, "r", encoding="utf-8") as handle:
        paper = json.load(handle)

    total_marks = paper.get("metadata", {}).get("totalMarks", 0)
    questions = paper.get("questions", [])

    transformed = {
        "id": f"{subject}_{year}_{season}_{variant}",
        "subject": f"ICT {subject}",
        "year": year,
        "season": season_names.get(season, season),
        "variant": variant,
        "totalMarks": total_marks,
        "duration": paper.get("metadata", {}).get("duration", 90),
        "questions": questions,
    }

    with open(json_path, "w", encoding="utf-8") as handle:
        json.dump(transformed, handle, indent=2, ensure_ascii=False)


def convert_one_paper(paper, output_dir):
    pdf_bytes = download_from_supabase(paper["path"])

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        temp_pdf.write(pdf_bytes)
        temp_pdf_path = temp_pdf.name

    try:
        output_path = output_dir / paper["name"].replace(".pdf", ".json")
        extractor = AdvancedPDFExtractor(temp_pdf_path)
        extractor.extract_to_json(str(output_path))
        enrich_metadata(output_path, paper["name"])
        print(f"Saved to: {output_path}")
        return True
    finally:
        try:
            os.unlink(temp_pdf_path)
        except OSError:
            pass


def main():
    print("\nListing papers in Supabase...")
    papers = list_papers_in_bucket()

    if not papers:
        print("No papers found in Supabase.")
        sys.exit(1)

    print(f"\nFound {len(papers)} papers:")
    for index, paper in enumerate(papers, start=1):
        print(f"  {index}. {paper['name']}")

    print("\nOptions:")
    print("  all")
    print("  1,2,3")
    print("  q")
    choice = input("\nYour choice: ").strip().lower()

    if choice == "q":
        print("Cancelled.")
        sys.exit(0)

    if choice == "all":
        selected = papers
    else:
        try:
            indices = [int(item.strip()) - 1 for item in choice.split(",")]
            selected = [papers[i] for i in indices if 0 <= i < len(papers)]
        except Exception:
            print("Invalid choice.")
            sys.exit(1)

    output_dir = Path(__file__).parent.parent / "public" / "papers"
    output_dir.mkdir(parents=True, exist_ok=True)

    success_count = 0
    for paper in selected:
        print(f"\n{'=' * 60}")
        print(f"Converting: {paper['name']}")
        print("=" * 60)
        try:
            if convert_one_paper(paper, output_dir):
                success_count += 1
        except Exception as exc:
            print(f"Failed: {exc}")

    print(f"\n{'=' * 60}")
    print(f"Converted {success_count}/{len(selected)} papers")
    print(f"Output: {output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
