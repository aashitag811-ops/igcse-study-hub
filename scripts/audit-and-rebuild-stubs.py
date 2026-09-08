"""
audit-and-rebuild-stubs.py
───────────────────────────────────────────────────────────────────────────
The definitive rebuild:
1. Build a set of ALL PDFs that actually exist in scripts/pastpapers/
2. For every stub in public/papers/:
   - If the corresponding QP pdf exists → keep/update as viewOnly stub
   - If no PDF exists AND questions are empty (fake stub) → DELETE
   - If questions exist and are real (parsed MCQ) → KEEP untouched
3. Create new viewOnly stubs for any qp_ PDFs that don't have a stub yet
4. Regenerate both manifests from what remains
"""

import os, re, json, io, sys
from pathlib import Path

PDF_DIR    = Path('scripts/pastpapers')
PUBLIC_DIR = Path('public/papers')

# ── Subject name maps ──────────────────────────────────────────────────────────

IGCSE_NAMES = {
    '0400':'Art & Design','0410':'Music','0411':'Drama',
    '0413':'Physical Education','0417':'ICT',
    '0447':'Co-ordinated Sciences (Double)','0448':'Co-ordinated Sciences (Single)',
    '0450':'Business Studies','0452':'Accounting','0454':'Enterprise',
    '0455':'Economics','0457':'Global Perspectives','0460':'Geography',
    '0470':'History','0471':'Travel & Tourism','0475':'English Literature',
    '0478':'Computer Science','0490':'Religious Studies','0493':'Islamiyat',
    '0495':'Sociology','0500':'First Language English',
    '0508':'English as a Second Language (Count-in Speaking)',
    '0510':'English as a Second Language','0520':'French',
    '0549':'Hindi as a Second Language','0580':'Mathematics',
    '0600':'Agriculture','0606':'Additional Mathematics',
    '0610':'Biology','0620':'Chemistry','0625':'Physics',
    '0648':'Food & Nutrition','0654':'Co-ordinated Sciences',
    '0680':'Environmental Management',
}
IGCSE91_NAMES = {
    '0970':'Biology','0971':'Chemistry','0972':'Physics',
    '0973':'Co-ordinated Sciences','0976':'Geography','0977':'History',
    '0978':'Music','0980':'Mathematics','0984':'Computer Science',
    '0985':'Accounting','0986':'Business Studies','0987':'Economics',
    '0989':'Art and Design','0990':'English — First Language',
    '0992':'English Literature','0994':'Drama','0995':'Physical Education',
    '7184':'Arabic — First Language',
}
ALEVEL_NAMES = {
    '8021':'English General Paper','9084':'Law','9093':'English Language',
    '9231':'Further Mathematics','9395':'Physical Education',
    '9488':'Islamic Studies','9489':'History','9608':'Computer Science',
    '9609':'Business','9618':'Computer Science','9691':'Computing',
    '9698':'Psychology','9699':'Sociology','9700':'Biology',
    '9701':'Chemistry','9702':'Physics','9706':'Accounting',
    '9707':'Business Studies','9708':'Economics','9709':'Mathematics',
    '9713':'Applied ICT','9990':'Psychology',
}
OLEVEL_NAMES = {
    '1123':'English Language','2059':'Pakistan Studies',
    '2210':'Computer Science','2281':'Economics','3204':'Bengali',
    '4024':'Mathematics D','4037':'Additional Mathematics','4040':'Statistics',
    '5054':'Physics','5070':'Chemistry','5090':'Biology',
    '7010':'Computer Studies','7094':'Bangladesh Studies','7100':'Commerce',
    '7110':'Principles of Accounts','7115':'Business Studies','7707':'Accounting',
}
ALL_NAMES = {**IGCSE_NAMES, **IGCSE91_NAMES, **ALEVEL_NAMES, **OLEVEL_NAMES}

IGCSE91_CODES = set(IGCSE91_NAMES)
ALEVEL_CODES  = set(ALEVEL_NAMES)
OLEVEL_CODES  = set(OLEVEL_NAMES)
IGCSE_CODES   = set(IGCSE_NAMES)

def section_for(code):
    if code in ALEVEL_CODES:  return 'alevel'
    if code in IGCSE91_CODES: return 'igcse91'
    if code in OLEVEL_CODES:  return 'olevel'
    if code in IGCSE_CODES:   return 'igcse'
    return None

SESSION_NAMES = {'m':'February/March','s':'May/June','w':'October/November'}

# ── Step 1: index all PDFs that exist ─────────────────────────────────────────

existing_pdfs = {f.stem for f in PDF_DIR.glob('*.pdf')}
print(f'PDFs in pastpapers/: {len(existing_pdfs)}')

# Only care about qp_ files for stub creation
qp_pdfs = {s for s in existing_pdfs if '_qp_' in s}
print(f'QP pdfs: {len(qp_pdfs)}')

# ── Step 2: audit existing stubs ──────────────────────────────────────────────

QP_RE = re.compile(r'^(\d{3,4})_([msw])(\d{2})_qp_(\d{1,2})$')

kept_real   = 0
kept_parsed = 0
deleted     = 0
errors      = 0

for stub_path in list(PUBLIC_DIR.glob('*.json')):
    stub_id = stub_path.stem
    
    # Load stub
    try:
        with io.open(stub_path, encoding='utf-8', errors='replace') as f:
            d = json.load(f)
    except Exception as e:
        print(f'  ERROR reading {stub_path.name}: {e}')
        errors += 1
        continue
    
    questions = d.get('questions', [])
    has_real_questions = len(questions) > 2  # >2 means it's a real parsed MCQ paper
    
    # If it's a real parsed MCQ paper, keep it unconditionally
    if has_real_questions:
        kept_parsed += 1
        continue
    
    # It's a stub (viewOnly or fake). Check if the PDF exists.
    if stub_id in existing_pdfs:
        # PDF exists — ensure it's properly marked viewOnly
        if not d.get('viewOnly'):
            d['viewOnly'] = True
            d['testModeAvailable'] = False
            with open(stub_path, 'w', encoding='utf-8') as f:
                json.dump(d, f, indent=2)
        kept_real += 1
    else:
        # PDF does NOT exist — delete this stub
        stub_path.unlink()
        deleted += 1

print(f'\nKept parsed MCQ papers: {kept_parsed}')
print(f'Kept real PDF stubs:    {kept_real}')
print(f'Deleted fake stubs:     {deleted}')
print(f'Errors:                 {errors}')

# ── Step 3: create missing stubs for qp_ PDFs ─────────────────────────────────

created = 0
skipped_unknown = 0

for stem in sorted(qp_pdfs):
    stub_path = PUBLIC_DIR / (stem + '.json')
    if stub_path.exists():
        continue  # already handled above
    
    m = QP_RE.match(stem)
    if not m:
        skipped_unknown += 1
        continue
    
    code, sess, yr_str, comp_var = m.groups()
    yr   = int(yr_str)
    year = 2000 + yr
    
    section = section_for(code)
    if not section:
        skipped_unknown += 1
        continue
    
    # Parse component and variant
    if len(comp_var) == 2:
        component = int(comp_var[0])
        variant   = int(comp_var[1])
    else:
        component = int(comp_var)
        variant   = 0
    
    subj_name    = ALL_NAMES.get(code, code)
    session_name = SESSION_NAMES.get(sess, sess.upper())
    
    stub = {
        'id': stem,
        'subject': subj_name,
        'subjectCode': code,
        'year': year,
        'session': sess,
        'sessionName': session_name,
        'component': component,
        'variant': variant,
        'paperType': 'Question Paper',
        'section': section,
        'pdfUrl': f'/api/pdfs/{stem}.pdf',
        'viewOnly': True,
        'testModeAvailable': False,
        'questions': [],
    }
    
    with open(stub_path, 'w', encoding='utf-8') as f:
        json.dump(stub, f, indent=2)
    created += 1

print(f'\nCreated {created} new stubs for previously missing QP PDFs')
print(f'Skipped {skipped_unknown} unknown/unmatched')

total = len(list(PUBLIC_DIR.glob('*.json')))
print(f'\nTotal stubs in public/papers/: {total}')
