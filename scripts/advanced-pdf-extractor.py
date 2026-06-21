"""
Advanced PDF Extractor for Cambridge IGCSE Papers.
Now preserves prompt images and table structures so the frontend can render
format-heavy questions more faithfully.
"""

import base64
import io
import json
import os
import re
from pathlib import Path

import pdfplumber


IMAGE_HINT_PATTERNS = [
    r'\bshown\b',
    r'\bdiary entry\b',
    r'\boriginal image\b',
    r'\bedited image\b',
    r'\bimage\b',
    r'\bfigure\b',
    r'\bdiagram\b',
    r'\btable\b',
    r'\btick\b',
]

TABLE_HINT_PATTERNS = [
    r'\btick\b',
    r'\btable\b',
    r'\bshown\b',
    r'\binternal\b',
    r'\bexternal\b',
    r'\bjpg\b',
    r'\bpng\b',
    r'\bgif\b',
    r'\bmicr\b',
    r'\bocr\b',
    r'\bomr\b',
]


class AdvancedPDFExtractor:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.current_image_index = 0
        self.used_page_tables = set()
        self.used_page_images = set()

    def normalize_text(self, text):
        if not text:
            return text

        replacements = [
            ('thi s', 'this'), ('th is', 'this'), ('h is', 'his'),
            ('for m at t in g', 'formatting'), ('format t in g', 'formatting'),
            ('word process in g', 'word processing'), ('process in g', 'processing'),
            ('computerprocess in g', 'computer processing'),
            ('in ternal', 'internal'), ('in tern al', 'internal'),
            ('orig in al', 'original'), ('im age', 'image'), ('im ages', 'images'),
            ('pr in ter', 'printer'), ('Actu at or', 'Actuator'),
            ('of fice', 'office'), ('reg is ter', 'register'),
            ('reg is tr at i on', 'registration'), ('schoolreg is ter', 'school register'),
            ('Tawaraschool', 'Tawara school'), ('Blue to oth', 'Bluetooth'), ('Wi Fi', 'WiFi'),
            ('pho to graphs', 'photographs'), ('s to res', 'stores'), ('s to r in g', 'storing'),
        ]

        result = text
        for wrong, right in replacements:
            result = re.sub(re.escape(wrong), right, result, flags=re.IGNORECASE)

        result = re.sub(r'([a-z])([A-Z])', r'\1 \2', result)
        result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)
        result = re.sub(r'([A-Za-z])(\d)', r'\1 \2', result)
        result = re.sub(r'\b([a-z] ){3,}[a-z]\b', lambda m: m.group(0).replace(' ', ''), result, flags=re.IGNORECASE)
        result = re.sub(r'\b([A-Za-z]{3,})\s+in\s+g\b', lambda m: f"{m.group(1)}ing", result)
        result = re.sub(r'\b([A-Za-z]{3,})\s+ed\b', r'\1ed', result)
        result = re.sub(r'\s+', ' ', result)
        result = re.sub(r'\s+([.,;:!?\)])', r'\1', result)
        result = re.sub(r'([.,;:!?])(\w)', r'\1 \2', result)
        return result.strip()

    def clean_text(self, text):
        if not text:
            return text

        text = self.normalize_text(text)
        patterns = [
            r'©\s*Cambridge.*?(?=\n|$)',
            r'Permission to reproduce.*',
            r'Cambridge Assessment.*',
            r'University of Cambridge Local Examinations Syndicate.*',
            r'www\.cambridgeinternational\.org.*',
            r'www\.dynamicpapers\.com.*',
            r'\[Turn over\]',
            r'Question \d+ (?:starts|is) on page \d+',
            r'DO NOT WRITE IN THIS MARGIN',
            r'\*\s*\d{7,}\s*\*',
            r'\bDFD\b',
        ]
        for pattern in patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)

        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        return text.strip()

    def extract_images_from_page(self, page):
        page_images = []
        if not hasattr(page, 'images'):
            return page_images

        page_area = max(page.width * page.height, 1)
        for img_info in page.images:
            try:
                x0 = img_info.get('x0', 0)
                top = img_info.get('top', 0)
                x1 = img_info.get('x1', 0)
                bottom = img_info.get('bottom', 0)
                width = max(x1 - x0, 0)
                height = max(bottom - top, 0)
                area = width * height

                # Skip tiny decorative images; keep larger prompt images/snippets.
                if area < 0.02 * page_area and width < 120 and height < 80:
                    continue

                cropped = page.within_bbox((x0, top, x1, bottom)).to_image(resolution=180)
                img_bytes = io.BytesIO()
                cropped.original.save(img_bytes, format='PNG')
                img_base64 = base64.b64encode(img_bytes.getvalue()).decode()

                page_images.append({
                    'index': self.current_image_index,
                    'data': f'data:image/png;base64,{img_base64}',
                    'position': {
                        'x0': x0,
                        'top': top,
                        'x1': x1,
                        'bottom': bottom,
                        'width': width,
                        'height': height,
                        'area': area,
                    },
                })
                self.current_image_index += 1
            except Exception as exc:
                print(f'Error extracting image: {exc}')

        return page_images

    def extract_tables_from_page(self, page):
        try:
            raw_tables = page.extract_tables({
                'vertical_strategy': 'lines',
                'horizontal_strategy': 'lines',
                'snap_tolerance': 3,
                'intersection_tolerance': 3,
            }) or []
        except Exception:
            raw_tables = page.extract_tables() or []

        tables = []
        for table in raw_tables:
            if not table:
                continue

            cleaned_rows = []
            max_cols = 0
            for row in table:
                if not row:
                    continue
                cleaned = [self.clean_text((cell or '').replace('\n', ' ')) for cell in row]
                if any(cell for cell in cleaned):
                    cleaned_rows.append(cleaned)
                    max_cols = max(max_cols, len(cleaned))

            if len(cleaned_rows) < 2 or max_cols < 2:
                continue

            padded_rows = [row + [''] * (max_cols - len(row)) for row in cleaned_rows]
            tables.append({
                'headers': padded_rows[0],
                'rows': padded_rows[1:],
            })

        return tables

    def detect_list_answer(self, text):
        match = re.search(r'\b(\d+(?:\s+\d+)+)\s*$', text)
        if match:
            numbers = match.group(1).split()
            if len(numbers) >= 2 and all(n.isdigit() for n in numbers):
                nums = [int(n) for n in numbers]
                if nums == list(range(1, len(nums) + 1)):
                    return len(nums)
        return None

    def detect_mcq(self, text):
        patterns = [
            r'\bTick\b.*?\bone\b',
            r'\bTick\b.*?\btwo\b',
            r'\bCircle\b',
            r'\bSelect\b.*?\bcorrect\b',
            r'\bChoose\b.*?\bone\b',
            r'\bChoose\b.*?\btwo\b',
        ]
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)

    def extract_mcq_options(self, text, next_lines):
        combined = self.clean_text(text + '\n' + '\n'.join(next_lines[:10]))
        option_patterns = [
            r'[A-D]\.\s*(.+?)(?=\s+[A-D]\.|$)',
            r'[A-D]\)\s*(.+?)(?=\s+[A-D]\)|$)',
        ]
        for pattern in option_patterns:
            matches = re.findall(pattern, combined, re.MULTILINE)
            if len(matches) >= 2:
                return [self.clean_text(match) for match in matches]
        return []

    def detect_image_placeholder(self, text):
        lowered = text.lower()
        return any(re.search(pattern, lowered, re.IGNORECASE) for pattern in IMAGE_HINT_PATTERNS)

    def detect_table_placeholder(self, text):
        lowered = text.lower()
        return any(re.search(pattern, lowered, re.IGNORECASE) for pattern in TABLE_HINT_PATTERNS)

    def extract_questions(self):
        questions = []
        page_assets = []

        with pdfplumber.open(self.pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ''
                page_text = self.clean_text(page_text)
                page_assets.append({
                    'page': page_num,
                    'lines': [line.strip() for line in page_text.split('\n') if line.strip()],
                    'images': self.extract_images_from_page(page),
                    'tables': self.extract_tables_from_page(page),
                })

        current_question = None
        current_text = []
        current_page = None

        for page_entry in page_assets:
            lines = page_entry['lines']
            for idx, line in enumerate(lines):
                main_match = re.match(r'^(\d+)\s+(.+)', line)
                if main_match:
                    if current_question:
                        self.finalize_question(current_question, current_text, lines[idx:], page_assets[current_page - 1])
                        questions.append(current_question)

                    current_page = page_entry['page']
                    current_question = {
                        'number': main_match.group(1),
                        'text': main_match.group(2),
                        'subparts': [],
                        '_page': current_page,
                    }
                    current_text = [main_match.group(2)]
                    continue

                if not current_question:
                    continue

                subpart_match = re.match(r'^\(([a-z]+|[ivx]+)\)\s+(.+)', line)
                if subpart_match:
                    sub_number = subpart_match.group(1)
                    sub_text = subpart_match.group(2)
                    subpart = {
                        'number': sub_number,
                        'text': sub_text,
                        'subparts': [],
                        '_page': page_entry['page'],
                    }
                    if re.match(r'^[ivx]+$', sub_number):
                        if current_question['subparts']:
                            current_question['subparts'][-1].setdefault('subparts', []).append(subpart)
                    else:
                        current_question['subparts'].append(subpart)
                    current_text.append(sub_text)
                else:
                    current_text.append(line)

        if current_question and current_page is not None:
            self.finalize_question(current_question, current_text, [], page_assets[current_page - 1])
            questions.append(current_question)

        self._strip_internal_keys(questions)
        return questions

    def _strip_internal_keys(self, questions):
        for question in questions:
            question.pop('_page', None)
            for subpart in question.get('subparts', []):
                self._strip_internal_keys([subpart])

    def attach_page_table(self, question, page_entry, full_text):
        if not page_entry['tables']:
            return
        if not self.detect_table_placeholder(full_text):
            return

        for idx, table in enumerate(page_entry['tables']):
            table_key = (page_entry['page'], idx)
            if table_key in self.used_page_tables:
                continue

            headers = [self.clean_text(cell) for cell in table['headers'] if cell is not None]
            rows = [[self.clean_text(cell) for cell in row] for row in table['rows']]
            if len(headers) < 2 or not rows:
                continue

            question['tableData'] = {
                'headers': headers,
                'rows': rows,
                'kind': 'selection' if 'tick' in full_text.lower() else 'reference',
            }
            if 'tick' in full_text.lower():
                question['type'] = 'matrix_tick_table'
            elif question.get('type') in (None, 'text'):
                question['type'] = 'data_table'
            self.used_page_tables.add(table_key)
            return

    def attach_page_image(self, question, page_entry, full_text):
        if not page_entry['images']:
            return
        if not self.detect_image_placeholder(full_text):
            return

        best_image = None
        for idx, image in enumerate(sorted(page_entry['images'], key=lambda img: img['position']['area'], reverse=True)):
            image_key = (page_entry['page'], image['index'])
            if image_key in self.used_page_images:
                continue
            best_image = image
            self.used_page_images.add(image_key)
            break

        if not best_image:
            return

        question['hasImage'] = True
        question['image'] = best_image['data']
        question['imageMode'] = 'preserve-format'
        question['imageAlt'] = 'Question prompt image'
        question['promptImage'] = {
            'src': best_image['data'],
            'alt': 'Question prompt image',
            'mode': 'preserve-format',
        }

    def finalize_question(self, question, text_lines, next_lines, page_entry):
        full_text = self.clean_text(' '.join(text_lines))
        question['text'] = full_text

        marks_match = re.search(r'\[(\d+)\]', full_text)
        if marks_match:
            question['marks'] = int(marks_match.group(1))
            question['text'] = re.sub(r'\s*\[\d+\]', '', question['text']).strip()

        if self.detect_mcq(full_text):
            question['type'] = 'mcq'
            options = self.extract_mcq_options(full_text, next_lines)
            if options:
                question['options'] = options
            question['maxSelections'] = 2 if 'two' in full_text.lower() else 1

        list_count = self.detect_list_answer(full_text)
        if list_count:
            question['type'] = 'list'
            question['listCount'] = list_count
            question['text'] = re.sub(r'\s*\d+(?:\s+\d+)+\s*$', '', question['text']).strip()

        if 'type' not in question and 'marks' in question:
            question['type'] = 'text'

        self.attach_page_table(question, page_entry, full_text)
        self.attach_page_image(question, page_entry, full_text)

        for subpart in question.get('subparts', []):
            self.finalize_question(subpart, [subpart['text']], next_lines, page_entry)

    def extract_to_json(self, output_path):
        questions = self.extract_questions()

        def count_marks(question):
            total = question.get('marks', 0) or 0
            for sub in question.get('subparts', []):
                total += count_marks(sub)
            return total

        total_marks = sum(count_marks(question) for question in questions)

        paper = {
            'metadata': {
                'subject': 'ICT',
                'code': '0417',
                'year': 2025,
                'season': 'May/June',
                'variant': '12',
                'duration': 90,
                'totalMarks': total_marks,
            },
            'questions': questions,
        }

        with open(output_path, 'w', encoding='utf-8') as handle:
            json.dump(paper, handle, indent=2, ensure_ascii=False)

        print(f'[OK] Extracted {len(questions)} questions ({total_marks} marks)')
        print(f'[OK] Saved to {output_path}')
        return paper


def main():
    import sys

    if len(sys.argv) < 2:
        print('Usage: python advanced-pdf-extractor.py <pdf_file>')
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f'Error: File not found: {pdf_path}')
        sys.exit(1)

    base_name = Path(pdf_path).stem
    output_path = f'public/papers/{base_name}.json'
    os.makedirs('public/papers', exist_ok=True)

    extractor = AdvancedPDFExtractor(pdf_path)
    extractor.extract_to_json(output_path)


if __name__ == '__main__':
    main()

# Made with Bob
