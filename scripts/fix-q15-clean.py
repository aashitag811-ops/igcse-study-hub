import fitz  # PyMuPDF
from PIL import Image
import io

# Open the PDF
pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
doc = fitz.open(pdf_path)

output_dir = r"c:\Users\sahal\Documents\GitHub\igcse-study-hub\public\images\biology\questions"

# Find question number on page (left margin only)
def find_question_on_page(page, q_num):
    """Find question number on page (left margin only)"""
    text_instances = page.search_for(str(q_num))
    for inst in text_instances:
        if inst.x0 < 100:  # Left margin
            return inst.y0
    return None

# Extract Q15 - it spans pages 5 and 6
print("\n=== Extracting Q15 (Clean) ===")

# Find Q15 on page 5
page5 = doc[5]
q15_y = find_question_on_page(page5, 15)
print(f"Found Q15 on page 5 at y={q15_y}")

# Extract from page 5 (from Q15 to bottom, excluding footer)
page5_height = page5.rect.height
# Stop 60px before page end to avoid footer
clip1 = fitz.Rect(0, q15_y - 10, page5.rect.width, page5_height - 60)
pix1 = page5.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip1)
img1 = Image.open(io.BytesIO(pix1.tobytes("png")))

# Find Q16 on page 6
page6 = doc[6]
q16_y = find_question_on_page(page6, 16)
print(f"Found Q16 on page 6 at y={q16_y}")

# Extract from page 6 (from top to just before Q16, excluding header)
# Start at 50px to skip header, stop just before Q16
# Q16 is at y=62, so we only have a small section (50 to 62)
# This is too small, so let's just take from page 5 only
print("Q16 is too close to page top, extracting Q15 from page 5 only")
# Don't extract from page 6, Q15 ends on page 5
img2 = None

# Save just page 5 content (no merging needed)
output_path = f"{output_dir}/q15.png"
img1.save(output_path, 'PNG', quality=95, dpi=(150, 150))
print(f"[OK] Q15 (clean, no footer) -> q15.png")

doc.close()
print("\n[DONE] Q15 re-extracted without footer and Q16")

# Made with Bob
