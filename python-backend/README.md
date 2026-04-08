# Python Backend for Exam Paper Parsing

This Flask backend downloads Cambridge IGCSE ICT papers from PapaCambridge and parses them into structured JSON.

## Setup

1. Install Python 3.8+ if not already installed

2. Create virtual environment:
```bash
cd python-backend
python -m venv venv
```

3. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python app.py
```

Server runs on `http://localhost:5000`

## API Endpoints

### Parse Paper
```
GET /api/parse-paper?subject=0417&year=2025&season=m&variant=2
```

**Parameters:**
- `subject`: Subject code (default: 0417 for ICT)
- `year`: Exam year (e.g., 2025)
- `season`: Season code
  - `m` = February/March
  - `s` = May/June
  - `w` = October/November
- `variant`: Paper variant (1, 2, 3, etc.)

**Response:**
```json
{
  "id": "0417_2025_m_2",
  "subject": "ICT 0417",
  "year": 2025,
  "season": "February March",
  "variant": 2,
  "totalMarks": 80,
  "duration": 90,
  "questions": [
    {
      "number": 1,
      "totalMarks": 10,
      "parts": [
        {
          "id": "1a",
          "text": "Question text here",
          "marks": 2,
          "level": 1,
          "parentId": "1"
        }
      ]
    }
  ]
}
```

### Health Check
```
GET /health
```

Returns `{"status": "ok"}`

## How It Works

1. **Downloads PDF**: Fetches the paper from PapaCambridge using the standard URL format
2. **Extracts Text**: Uses PyPDF2 to extract text from the PDF
3. **Parses Structure**: Uses regex patterns to identify:
   - Main questions (1, 2, 3...)
   - Parts (a, b, c...)
   - Sub-parts (i, ii, iii...)
   - Marks ([X])
4. **Returns JSON**: Structured data ready for the frontend

## PapaCambridge URL Format

```
https://pastpapers.papacambridge.com/Cambridge%20IGCSE/Information%20and%20Communication%20Technology%20(0417)/{year}/{subject}_{season}{year_short}_qp_1{variant}.pdf
```

Example:
```
https://pastpapers.papacambridge.com/Cambridge%20IGCSE/Information%20and%20Communication%20Technology%20(0417)/2025/0417_m25_qp_12.pdf
```

## Notes

- No storage required - papers are fetched on-demand
- Parsing happens in real-time (typically 1-3 seconds)
- CORS enabled for Next.js frontend
- Error handling for missing papers or parsing failures