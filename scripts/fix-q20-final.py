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

print("=== Fixing Q20 (Remove ALL header text) ===\n")

q20_page = 0
q21_page = 7
page_q20 = doc[q20_page]
page_q21 = doc[q21_page]

q20_y = find_question_on_page(page_q20, 20)
q21_y = find_question_on_page(page_q21, 21)

if q20_y and q21_y:
    print(f"Q20 on page {q20_page} at y={q20_y}")
    print(f"Q21 on page {q21_page} at y={q21_y}")

    # Start BELOW the header - add more margin to skip all header text
    # The header is about 40-50px above Q20, so start at Q20 position
    clip1 = fitz.Rect(0, q20_y, page_q20.rect.width, page_q20.rect.height)
    pix1 = page_q20.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip1)
    img1 = Image.open(io.BytesIO(pix1.tobytes("png")))

    # Page 7: From top to Q21 (skip header on this page too)
    clip2 = fitz.Rect(0, 50, page_q21.rect.width, q21_y - 10)
    pix2 = page_q21.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip2)
    img2 = Image.open(io.BytesIO(pix2.tobytes("png")))

    # Merge
    total_height = img1.height + img2.height
    merged = Image.new('RGB', (img1.width, total_height), 'white')
    merged.paste(img1, (0, 0))
    merged.paste(img2, (0, img1.height))

    output_path = f"{output_dir}/q20.png"
    merged.save(output_path, 'PNG', quality=95, dpi=(150, 150))
    print(f"[OK] Q20 (clean, no header) -> q20.png")
else:
    print("ERROR: Could not find Q20 or Q21")

doc.close()
print("\n[DONE]")

# Made with Bob
