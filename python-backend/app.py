from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import re
import io
import PyPDF2

app = Flask(__name__)
CORS(app)  # Allow requests from Next.js

class CambridgeICTConverter:
    def __init__(self, raw_text):
        self.raw_text = raw_text
        self.clean_text = self.remove_boilerplate(raw_text)

    def remove_boilerplate(self, text):
        """Strips out recurring Cambridge exam noise"""
        noise_patterns = [
            r"DO NOT WRITE IN THIS MARGIN",
            r"\[Turn over\]",
            r"UCLES 2025",
            r"\d{2}0417\d{2}2025\d\.\d+",
            r"--- PAGE \d+ ---",
            r"L\n",
        ]
        for pattern in noise_patterns:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)
        return text

    def parse_paper(self):
        """Extracts questions with hierarchy: Main (1) -> Part (a) -> Sub-part (i)"""
        structured_data = []
        main_blocks = re.split(r'\n(\d{1,2})\s+', "\n" + self.clean_text)
        
        for i in range(1, len(main_blocks), 2):
            if i + 1 >= len(main_blocks):
                break
                
            q_num = main_blocks[i]
            content = main_blocks[i+1]
            
            intro_text = content.split('(a)')[0].strip() if '(a)' in content else ""
            sub_parts = re.split(r'\(([a-z])\)', content)
            
            if len(sub_parts) > 1:
                for j in range(1, len(sub_parts), 2):
                    if j + 1 >= len(sub_parts):
                        break
                        
                    letter = sub_parts[j]
                    sub_content = sub_parts[j+1]
                    
                    sub_sub = re.split(r'\(([ivx]+)\)', sub_content)
                    
                    if len(sub_sub) > 1:
                        for k in range(1, len(sub_sub), 2):
                            if k + 1 >= len(sub_sub):
                                break
                                
                            roman = sub_sub[k]
                            final_text = sub_sub[k+1]
                            structured_data.append(self.build_json(
                                f"{q_num}{letter}{roman}", 
                                final_text, 
                                parent_context=intro_text,
                                parent_id=f"{q_num}{letter}",
                                level=2
                            ))
                    else:
                        structured_data.append(self.build_json(
                            f"{q_num}{letter}", 
                            sub_content, 
                            parent_context=intro_text,
                            parent_id=q_num,
                            level=1
                        ))
            else:
                structured_data.append(self.build_json(q_num, content, level=0))

        return structured_data

    def build_json(self, q_id, content, parent_context="", parent_id=None, level=0):
        """Formats the final object"""
        marks_match = re.search(r'\[(\d+)\]', content)
        marks = int(marks_match.group(1)) if marks_match else 1
        
        prompt = f"{parent_context} {content.split('[')[0]}".strip()
        prompt = re.sub(r'\s+', ' ', prompt).strip()
        
        return {
            "id": q_id,
            "text": prompt,
            "marks": marks,
            "level": level,
            "parentId": parent_id
        }


def extract_text_from_pdf(pdf_content):
    """Extract text from PDF bytes"""
    pdf_file = io.BytesIO(pdf_content)
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    
    return text


def download_from_papacambridge(subject_code, year, season_code, variant):
    """
    Download PDF from PapaCambridge
    URL format: https://pastpapers.papacambridge.com/Cambridge%20IGCSE/Information%20and%20Communication%20Technology%20(0417)/2025/0417_m25_qp_12.pdf
    """
    # Map season codes
    season_map = {
        'm': 'Feb-Mar',
        's': 'May-Jun',
        'w': 'Oct-Nov'
    }
    
    # Construct filename
    year_short = str(year)[-2:]
    filename = f"{subject_code}_{season_code}{year_short}_qp_1{variant}.pdf"
    
    # PapaCambridge URL structure
    base_url = "https://pastpapers.papacambridge.com"
    subject_path = "Cambridge%20IGCSE/Information%20and%20Communication%20Technology%20(0417)"
    url = f"{base_url}/{subject_path}/{year}/{filename}"
    
    print(f"Attempting to download: {url}")
    
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    
    return response.content


@app.route('/api/parse-paper', methods=['GET'])
def parse_paper():
    """
    Parse a Cambridge ICT paper
    Query params: subject, year, season, variant
    """
    try:
        subject = request.args.get('subject', '0417')
        year = int(request.args.get('year', 2025))
        season = request.args.get('season', 'm')  # m, s, or w
        variant = request.args.get('variant', '2')
        
        # Download PDF from PapaCambridge
        pdf_content = download_from_papacambridge(subject, year, season, variant)
        
        # Extract text
        text = extract_text_from_pdf(pdf_content)
        
        # Parse using Cambridge ICT algorithm
        converter = CambridgeICTConverter(text)
        questions_data = converter.parse_paper()
        
        # Group by question number
        questions_by_num = {}
        for item in questions_data:
            q_num = int(re.match(r'(\d+)', item['id']).group(1))
            if q_num not in questions_by_num:
                questions_by_num[q_num] = []
            questions_by_num[q_num].append(item)
        
        # Format for frontend
        questions = []
        for q_num in sorted(questions_by_num.keys()):
            parts = questions_by_num[q_num]
            total_marks = sum(p['marks'] for p in parts)
            questions.append({
                "number": q_num,
                "parts": parts,
                "totalMarks": total_marks
            })
        
        # Calculate total marks
        total_marks = sum(q['totalMarks'] for q in questions)
        
        # Season name mapping
        season_names = {
            'm': 'February March',
            's': 'May June',
            'w': 'October November'
        }
        
        result = {
            "id": f"{subject}_{year}_{season}_{variant}",
            "subject": f"ICT {subject}",
            "year": year,
            "season": season_names.get(season, season),
            "variant": int(variant),
            "totalMarks": total_marks,
            "duration": 90,
            "questions": questions
        }
        
        return jsonify(result)
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to download PDF: {str(e)}"}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to parse paper: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

# Made with Bob
