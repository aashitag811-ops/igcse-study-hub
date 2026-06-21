"""
Fix 2021 ICT papers with improved spacing, question-type detection,
and structured metadata for tables, tick questions, word banks, and images.
"""

import json
import re
from pathlib import Path

NUMBER_WORDS = {
    'one': 1,
    'two': 2,
    'three': 3,
    'four': 4,
    'five': 5,
    'six': 6,
    'seven': 7,
    'eight': 8,
}

TABLE_ROW_LABELS = [
    'Name of fitness tracker',
    'Battery life in days',
    'Method of internet connection',
    'Water resistant',
    'GPS',
    'Cost',
]

WORD_BANK_TERMS = [
    'bar code reader',
    'chip reader',
    'micr',
    'magnetic stripe reader',
    'ocr',
    'omr',
    'pin pad',
    'rfid',
    'rfid reader',
]


def normalize_text(text):
    """Repair common PDF extraction spacing issues while preserving meaning."""
    if not text:
        return text

    replacements = [
        ('thi s', 'this'), ('th is', 'this'), ('h is', 'his'), ('th at', 'that'), ('the ir', 'their'), ('the re', 'there'),
        ('whe the r', 'whether'), ('whe re', 'where'), ('whe n', 'when'), ('wh ich', 'which'),
        ('for m at', 'format'), ('format t in g', 'formatting'), ('for m at t in g', 'formatting'), ('for m at ted', 'formatted'),
        ('word process in g', 'word processing'), ('process in g', 'processing'), ('computerprocess in g', 'computer processing'),
        ('in form at i on', 'information'), ('applic at i on', 'application'), ('applic at i on s', 'applications'),
        ('c on nect', 'connect'), ('c on nected', 'connected'), ('c on necti on', 'connection'),
        ('c on trol', 'control'), ('c on ta in', 'contain'), ('c on ta in s', 'contains'),
        ('c on s is ts', 'consists'), ('c on sidering', 'considering'),
        ('d at a', 'data'), ('d at abase', 'database'), ('d at e', 'date'),
        ('de vice', 'device'), ('de vices', 'devices'), ('de scribe', 'describe'),
        ('d is cuss', 'discuss'), ('d is advantage', 'disadvantage'), ('d is advantages', 'disadvantages'),
        ('ef for t', 'effort'), ('ex am ple', 'example'), ('ex am ples', 'examples'),
        ('ex pl ain', 'explain'), ('fe at ure', 'feature'), ('fe at ures', 'features'),
        ('g re at', 'great'), ('giv in g', 'giving'), ('hardw are', 'hardware'),
        ('he at in g', 'heating'), ('im age', 'image'), ('im ages', 'images'), ('orig in al', 'original'),
        ('in clud in g', 'including'), ('in put', 'input'), ('in ked', 'inked'),
        ('in put', 'input'), ('in ternet', 'internet'), ('in tern al', 'internal'),
        ('lap top', 'laptop'), ('m at ch', 'match'), ('m at erials', 'materials'),
        ('m at hs', 'maths'), ('m at rix', 'matrix'), ('m on itor', 'monitor'), ('m on i to rs', 'monitors'),
        ('m is s to red', 'is stored'), ('of fice', 'office'),
        ('mo to rs', 'motors'), ('ne two rk', 'network'), ('o the r', 'other'),
        ('out put', 'output'), ('p are nts', 'parents'), ('p at ient', 'patient'), ('p at ients', 'patients'),
        ('phys ic al', 'physical'), ('plann in g', 'planning'), ('pre sen t at i on', 'presentation'),
        ('pre sen t at i on s', 'presentations'), ('pr in ter', 'printer'), ('pr in t in g', 'printing'),
        ('pro cess', 'process'), ('pro cess in g', 'processing'), ('pro cessor', 'processor'),
        ('pro duce', 'produce'), ('questi on', 'question'), ('questi on s', 'questions'),
        ('reg is ter', 'register'), ('reg is ters', 'registers'), ('reg is tr at i on', 'registration'),
        ('schoolreg is ter', 'school register'),
        ('ra the r', 'rather'), ('read in gs', 'readings'), ('re at ed', 'related'), ('res is tant', 'resistant'),
        ('s of tw are', 'software'), ('sav in g', 'saving'), ('shopp in g', 'shopping'),
        ('smartph on e', 'smartphone'), ('sp ac in g', 'spacing'), ('sp read sheet', 'spreadsheet'),
        ('st at e', 'state'), ('st at ement', 'statement'), ('st at ements', 'statements'),
        ('stor in g', 'storing'), ('temper at ure', 'temperature'), ('the name', 'the name'),
        ('the number', 'the number'), ('to ld', 'told'), ('to m at ically', 'automatically'),
        ('to mography', 'tonography'), ('to n er', 'toner'), ('us in g', 'using'),
        ('vari able', 'variable'), ('v is it', 'visit'), ('v is ited', 'visited'),
        ('web s ite', 'website'), ('web s ites', 'websites'), ('who le', 'whole'),
        ('Wi Fi', 'WiFi'), ('Blue to oth', 'Bluetooth'), ('P IN', 'PIN'), ('IN R', 'INR'),
        ('Tawaraschool', 'Tawara school'), ('thereg is ter', 'the register'), ('thereg is tr at i on', 'the registration'),
        ('toavoidtheissueofdisclosureofanswer-relatedinformationtocandidates', 'To avoid the issue of disclosure of answer-related information to candidates'),
        ('Permissiontoreproduceitemswherethird-partyownedmaterialprotectedbycopyrightisincludedhasbeensoughtandclearedwherepossible', 'Permission to reproduce items where third-party owned material protected by copyright is included has been sought and cleared where possible'),
    ]

    result = text
    for wrong, right in replacements:
        result = re.sub(re.escape(wrong), right, result, flags=re.IGNORECASE)

    result = re.sub(r'([a-z])([A-Z])', r'\1 \2', result)
    result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)
    result = re.sub(r'([A-Za-z])(\d)', r'\1 \2', result)
    result = re.sub(r'\b([a-z] ){3,}[a-z]\b', lambda m: m.group(0).replace(' ', ''), result, flags=re.IGNORECASE)
    result = re.sub(r'\b([Tt]awara)([A-Z][a-z]+)', r'\1 \2', result)
    result = re.sub(r'\b([A-Za-z]{3,})\s+in\s+g\b', lambda m: f"{m.group(1)}ing", result)
    result = re.sub(r'\b([A-Za-z]{3,})\s+ed\b', r'\1ed', result)
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'\s+([.,;:!?\)])', r'\1', result)
    result = re.sub(r'([\[(])\s+', r'\1', result)
    result = re.sub(r'([.,;:!?])(\w)', r'\1 \2', result)

    return result.strip()


def clean_question_text(text):
    """Remove boilerplate, page codes, and extraction noise."""
    text = normalize_text(text or '')

    compact_patterns = [
        r'Permissiontoreproduceitems.*',
        r'Everyreasonableeffort.*',
        r'Toavoidtheissueofdisclosure.*',
        r'allcopyrightacknowledgements.*',
        r'Booklet\.Thisisproducedforeachseries.*',
        r'CambridgeAssessmentInternationalEducation.*',
        r'UniversityofCambridgeLocalExaminationsSyndicate.*',
        r'www\.dynamicpapers\.com.*',
        r'atwww\.cambridgeinternational\.org.*',
        r'Educationispartof.*',
        r'Assessmentisthebrandnameofthe.*',
    ]

    for pattern in compact_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)

    patterns = [
        r'Permission to reproduce items.*',
        r'Every reasonable effort.*',
        r'To avoid the issue of disclosure.*',
        r'all copyright acknowledgements.*',
        r'Copyright Acknowledgements Booklet.*',
        r'Cambridge Assessment International Education.*',
        r'University of Cambridge Local Examinations Syndicate.*',
        r'Cambridge Assessment Group.*',
        r'www\.cambridgeinternational\.org.*',
        r'www\.dynamicpapers\.com.*',
        r'at www\.cambridgeinternational\.org.*',
        r'Question\s+\d+\s+starts on page\s+\d+\.?',
        r'\b0417/1[123]/[A-Z]/[A-Z]/\d{2}\b',
        r'\*\s*\d{7,}\s*\*',
        r'\bDFD\b',
        r'^hours\s+You must answer on the question paper\..*?hardware\.$',
        r'^You must answer on the question paper\..*?hardware\.$',
        r'^INSTRUCTIONS\s+Answer all questions\..*?hardware\.$',
    ]

    for pattern in patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)

    text = re.sub(r'\s+\d+(?:\s+\d+)+\s*$', '', text)
    text = re.sub(r'(?:Feature|Method|Description|Source|Rule|Point|Advantage|Disadvantage)\s+\d+(?:\s+(?:Feature|Method|Description|Source|Rule|Point|Advantage|Disadvantage)\s+\d+)*\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+', ' ', text)
    return text.strip(' -')


def extract_selection_count(text, default=1):
    lowered = text.lower()
    for word, count in NUMBER_WORDS.items():
        if re.search(rf'\b{word}\b', lowered):
            return count
    return default


def should_use_numbered_list(text, marks):
    if not text:
        return False

    lowered = text.lower()
    instruction = re.search(r'\b(state|describe|give|identify|list|write down|name|suggest|explain)\b', lowered)
    count = extract_selection_count(lowered, 0)
    ends_with_numbers = re.search(r'\b1(?:\s+2){0,1}(?:\s+3)?(?:\s+4)?(?:\s+5)?(?:\s+6)?\s*$', lowered)

    if 'tick' in lowered or 'circle' in lowered:
        return False
    if 'table' in lowered or 'word bank' in lowered:
        return False
    if marks is not None and marks <= 1 and not ends_with_numbers:
        return False

    return bool((instruction and count >= 2) or ends_with_numbers)


def extract_tick_selection_options(text):
    normalized = clean_question_text(text)
    normalized = re.sub(r'\(\s*[3?xX]?\s*\)', '', normalized)

    patterns = [
        r'Tick\s+\w+\s+[^.]+?\b(?:devices|items|statements|features|options)\.?\s*(.+)',
        r'Circle\s+\w+\s+[^.]+?\b(?:devices|items|statements|features|options)\.?\s*(.+)',
    ]

    options_part = ''
    for pattern in patterns:
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            options_part = match.group(1)
            break

    if not options_part:
        return []

    options_part = re.sub(r'\b(Tick|Circle)\b.*$', '', options_part, flags=re.IGNORECASE)
    options_part = re.sub(r'\bThis\b.*$', '', options_part, flags=re.IGNORECASE)
    options_part = options_part.strip(' .')

    candidates = re.split(r'\s{2,}|\s(?=[A-Z][a-z])', options_part)
    cleaned = []
    for item in candidates:
        item = item.strip(' ,.;')
        if len(item) < 2:
            continue
        if re.search(r'printer is|following statements|most appropriate', item, re.IGNORECASE):
            continue
        cleaned.append(item)

    deduped = []
    for item in cleaned:
        if item not in deduped:
            deduped.append(item)

    return deduped[:8]


def extract_word_bank_items(text):
    normalized = clean_question_text(text)
    lowered = normalized.lower()
    if 'complete the following sentences' not in lowered and 'using the most appropriate' not in lowered:
        return []

    found = []
    for term in WORD_BANK_TERMS:
        if term.lower() in lowered:
            found.append(normalize_text(term))

    deduped = []
    for item in found:
        if item not in deduped:
            deduped.append(item)
    return deduped


def build_matrix_table(text):
    normalized = clean_question_text(text)
    compact = re.sub(r'\(\s*[?3xX]?\s*\)', '', normalized)

    internal_external = re.search(
        r'Tick.*?whether.*?examples of (?:an )?internal or external hardware devices\.?\s*internal\s+external\s+(.+)',
        compact,
        re.IGNORECASE,
    )
    if internal_external:
        items = re.findall(r'(Mouse|Video card|Printer|Actuator|Keyboard|Monitor|Speakers|Microphone)', internal_external.group(1), re.IGNORECASE)
        rows = [[normalize_text(item)] for item in items]
        if rows:
            return {
                'headers': ['Item', 'internal', 'external'],
                'rows': rows,
                'kind': 'selection',
                'maxSelectionsPerRow': 1,
            }

    printer_match = re.search(
        r'Tick.*?printer.*?statements\.?\s*(3D)\s+(Dot matrix)\s+(Laser)\s+(.+)',
        compact,
        re.IGNORECASE,
    )
    if printer_match:
        row_text = printer_match.group(4)
        statements = re.findall(r'This printer[^T]+(?=This printer|$)', row_text, re.IGNORECASE)
        rows = [[normalize_text(statement)] for statement in statements]
        if rows:
            return {
                'headers': ['Statement', '3D', 'Dot matrix', 'Laser'],
                'rows': rows,
                'kind': 'selection',
                'maxSelectionsPerRow': 1,
            }

    category_sets = [
        ['jpg', 'png', 'gif'],
        ['optical', 'magnetic', 'solid state'],
        ['desktop computer', 'tablet computer', 'smartwatch'],
    ]

    lowered = compact.lower()
    for categories in category_sets:
        if all(category in lowered for category in categories):
            split_point = max(lowered.find(category) for category in categories)
            tail = compact[split_point + len(categories[-1]):].strip()
            phrases = re.split(r'(?<=[a-z])\s+(?=[A-Z])', tail)
            rows = [[normalize_text(phrase)] for phrase in phrases if len(phrase.strip()) > 8]
            if rows:
                return {
                    'headers': ['Statement', *categories],
                    'rows': rows[:8],
                    'kind': 'selection',
                    'maxSelectionsPerRow': 1,
                }

    return None


def build_data_table(text):
    normalized = clean_question_text(text)
    if 'Name of fitness tracker' not in normalized:
        return None

    working = normalized
    positions = []
    for label in TABLE_ROW_LABELS:
        idx = working.find(label)
        if idx == -1:
            return None
        positions.append((idx, label))

    positions.sort()
    segments = {}
    for i, (idx, label) in enumerate(positions):
        start = idx + len(label)
        end = positions[i + 1][0] if i + 1 < len(positions) else len(working)
        segments[label] = working[start:end].strip()

    tracker_names = segments['Name of fitness tracker'].split()
    if len(tracker_names) < 4:
        return None

    left_name = ' '.join(tracker_names[:2])
    right_name = ' '.join(tracker_names[2:4])

    rows = []
    value_patterns = {
        'Battery life in days': r'(.+?days)\s+(.+?days)$',
        'Method of internet connection': r'(.+?)\s+(WiFi|Bluetooth|Wi Fi|Blue tooth)$',
        'Water resistant': r'(.+?m)\s+(.+?m)$',
        'GPS': r'([YN])\s+([YN])$',
        'Cost': r'(.+?)\s+(INR\s*\d+\s*\d+|INR\s*\d+)$',
    }

    for label in TABLE_ROW_LABELS[1:]:
        segment = segments[label]
        pattern = value_patterns.get(label)
        if not pattern:
            continue
        match = re.search(pattern, segment, re.IGNORECASE)
        if not match:
            return None
        rows.append([label, normalize_text(match.group(1)), normalize_text(match.group(2))])

    return {
        'headers': ['Name of fitness tracker', normalize_text(left_name), normalize_text(right_name)],
        'rows': rows,
        'kind': 'reference',
    }


def detect_question_type(text, marks, existing_question=None):
    normalized = clean_question_text(text)
    lowered = normalized.lower()

    if build_matrix_table(normalized):
        return 'matrix_tick_table'
    if extract_word_bank_items(normalized):
        return 'word_bank'
    if build_data_table(normalized):
        return 'data_table'
    if 'circle' in lowered:
        return 'circle_selection'
    if 'tick' in lowered and extract_tick_selection_options(normalized):
        return 'tick_selection'
    if should_use_numbered_list(normalized, marks):
        return 'numbered_list'
    if re.search(r'(Method|Benefit|Rule|Feature)\s*1', normalized, re.IGNORECASE):
        return 'paired_notebook'
    if marks is not None and marks >= 6:
        return 'standard_notebook'
    if marks is not None and marks >= 1:
        return 'box_answer'
    return 'short_answer'


def process_question(question):
    text = question.get('text', '')
    marks = question.get('marks')
    cleaned_text = clean_question_text(text)
    question['text'] = cleaned_text

    q_type = detect_question_type(cleaned_text, marks, question)
    question['type'] = q_type

    if q_type in {'circle_selection', 'tick_selection'}:
        options = extract_tick_selection_options(cleaned_text)
        if options:
            question['options'] = options
            question['maxSelections'] = extract_selection_count(cleaned_text)

    if q_type == 'numbered_list':
        question['listCount'] = extract_selection_count(cleaned_text, marks or 2)

    if q_type == 'word_bank':
        items = extract_word_bank_items(cleaned_text)
        if items:
            question['wordBankItems'] = items

    if q_type == 'matrix_tick_table':
        table_data = build_matrix_table(cleaned_text)
        if table_data:
            question['tableData'] = table_data
            question['maxSelections'] = table_data.get('maxSelectionsPerRow', 1)

    if q_type == 'data_table':
        table_data = build_data_table(cleaned_text)
        if table_data:
            question['tableData'] = table_data

    if question.get('hasImage') and question.get('image'):
        question['imageMode'] = 'preserve-format' if q_type in {'matrix_tick_table', 'data_table', 'word_bank'} else 'full-width'
        question['imageAlt'] = question.get('imageAlt') or 'Question prompt image'

    for subpart in question.get('subparts', []):
        process_question(subpart)

    return question


def fix_paper(input_path, output_path):
    print(f'Processing {input_path}...')
    with open(input_path, 'r', encoding='utf-8') as handle:
        paper = json.load(handle)

    for question in paper.get('questions', []):
        process_question(question)

    with open(output_path, 'w', encoding='utf-8') as handle:
        json.dump(paper, handle, indent=2, ensure_ascii=False)

    print(f'[OK] Fixed and saved to {output_path}')
    print(f'     Total questions: {len(paper.get("questions", []))}')


def main():
    papers_dir = Path(__file__).parent.parent / 'public' / 'papers'
    papers_to_fix = [
        '0417_m21_qp_12.json',
        '0417_s21_qp_11.json',
        '0417_s21_qp_12.json',
        '0417_s21_qp_13.json',
        '0417_w21_qp_11.json',
        '0417_w21_qp_12.json',
        '0417_w21_qp_13.json',
    ]

    for paper_file in papers_to_fix:
        input_path = papers_dir / paper_file
        if input_path.exists():
            fix_paper(input_path, input_path)
        else:
            print(f'[WARN] Skipping {paper_file} (not found)')

    print('\n[OK] All papers processed!')


if __name__ == '__main__':
    main()

# Made with Bob
