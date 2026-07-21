# Option Position Detection Setup

This guide explains how to automatically detect A, B, C, D letter positions in MCQ question images.

## Prerequisites

You need to install Tesseract OCR and Python packages.

### 1. Install Tesseract OCR

**Windows:**
1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Run the installer (tesseract-ocr-w64-setup-5.x.x.exe)
3. During installation, note the installation path (usually `C:\Program Files\Tesseract-OCR`)
4. Add to PATH or update the script with the path

**Mac:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

### 2. Install Python Packages

```bash
pip install pytesseract opencv-python pillow numpy
```

Or update your requirements.txt:
```bash
pip install -r scripts/requirements.txt
```

## Usage

### Run the Detection Script

```bash
cd scripts
python detect-option-positions.py
```

The script will:
1. ✅ Read all question images from `public/images/biology/questions/`
2. 🔍 Use OCR to detect A, B, C, D letter positions
3. 📊 Calculate center coordinates as percentages
4. 💾 Update `public/papers/0610_m20_qp_22.json` with position data

### Output Format

The JSON will be updated with `optionPositions` for each question:

```json
{
  "questionNumber": 1,
  "imageUrl": "/images/biology/questions/q1.png?v=24",
  "correctAnswer": "B",
  "marks": 1,
  "optionPositions": {
    "A": {"x": 11.5, "y": 35.2},
    "B": {"x": 11.5, "y": 45.8},
    "C": {"x": 11.5, "y": 56.3},
    "D": {"x": 11.5, "y": 66.9}
  }
}
```

Coordinates are percentages (0-100) relative to image dimensions.

## Frontend Integration

The MCQQuestionCard component will automatically use these positions to create clickable regions over the letters in the image.

If `optionPositions` exists in the JSON, it uses those coordinates.
If not, it falls back to default estimated positions.

## Troubleshooting

### "Tesseract not found"
- Make sure Tesseract is installed
- On Windows, update the script with your Tesseract path:
  ```python
  pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
  ```

### Low detection accuracy
- Check image quality (should be clear, high resolution)
- Adjust OCR confidence threshold in script (currently 60)
- Try different PSM modes in the script

### Missing letters
- Some questions may have unusual formatting
- You can manually add positions to the JSON for those questions

## Manual Position Adjustment

If OCR doesn't detect positions correctly, you can manually edit the JSON:

1. Open the question image
2. Note the approximate position of each letter
3. Add/update `optionPositions` in the JSON
4. Coordinates are percentages: x (left to right), y (top to bottom)

Example:
```json
"optionPositions": {
  "A": {"x": 10, "y": 30},
  "B": {"x": 10, "y": 45},
  "C": {"x": 10, "y": 60},
  "D": {"x": 10, "y": 75}
}
```

## Next Steps

After running the script:
1. ✅ Check the updated JSON file
2. 🔄 Refresh your browser
3. 🎯 Click directly on the letters in the question images!

The clickable regions will now be perfectly positioned over the actual letters.