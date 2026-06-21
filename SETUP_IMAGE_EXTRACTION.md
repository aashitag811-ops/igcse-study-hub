# Setup Image Extraction Tool

## Quick Answer: Do I need to extract images manually?

**NO!** Use the automated script. Here's how:

## One-Time Setup

Install required Python packages:

```bash
pip install PyMuPDF Pillow
```

## Usage

### Extract images from a single PDF:

```bash
cd igcse-study-hub
python scripts/extract-images-from-pdf.py public/papers/pdfs/0417_s20_qp_11.pdf 0417_s20_qp_11
```

### Extract images from ALL PDFs at once:

```bash
cd igcse-study-hub
python scripts/extract-images-from-pdf.py --batch
```

## What the script does:

1. ✅ Automatically extracts ALL images from the PDF
2. ✅ Saves them in `public/papers/images/`
3. ✅ Names them as `{paper_id}_img1.png`, `{paper_id}_img2.png`, etc.
4. ✅ Creates a metadata JSON file listing all images
5. ✅ Shows you which page each image came from

## After extraction:

1. **Review the images** - Open `public/papers/images/` folder
2. **Identify questions** - Match images to questions (e.g., img1 and img2 are from Q3b)
3. **Rename for clarity** (optional):
   - `0417_s20_qp_11_img1.png` → `0417_s20_qp_11_q3b_img1.png`
   - `0417_s20_qp_11_img2.png` → `0417_s20_qp_11_q3b_img2.png`
4. **Update JSON** - Add image references to the question paper JSON

## Example: For 0417_s20_qp_11

After running the script, you'll get:
- `0417_s20_qp_11_img1.png` (RFID tag)
- `0417_s20_qp_11_img2.png` (Cheque)
- `0417_s20_qp_11_img3.png` (Barcode)
- `0417_s20_qp_11_img4.png` (Chip card)
- `0417_s20_qp_11_images.json` (metadata)

Then update the JSON:

```json
{
  "number": "b",
  "type": "image_based_list",
  "images": [
    {
      "path": "/papers/images/0417_s20_qp_11_img1.png",
      "description": "RFID tag"
    },
    {
      "path": "/papers/images/0417_s20_qp_11_img2.png",
      "description": "Cheque with MICR"
    }
  ]
}
```

## Troubleshooting

### "Module not found" error:
```bash
pip install PyMuPDF Pillow
```

### "No PDF files found":
- Make sure PDFs are in `public/papers/pdfs/` folder
- Or specify the correct path

### Images look wrong:
- Some PDFs have embedded images that may not extract perfectly
- You can manually screenshot those specific images

## Pro Tip: Batch Processing

Put all your PDF papers in `public/papers/pdfs/` and run:

```bash
python scripts/extract-images-from-pdf.py --batch
```

This will process ALL papers at once! 🚀