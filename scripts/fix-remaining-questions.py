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

print("=== Fixing Q10, Q20, Q35, Q40 ===\n")

# Fix Q10 - trim extra space
print("Fixing Q10...")
for page_num in range(len(doc)):
    page = doc[page_num]
    q10_y = find_question_on_page(page, 10)
    if q10_y:
        q11_y = find_question_on_page(page, 11)
        if q11_y:
            print(f"Q10 on page {page_num}, Q11 at y={q11_y}")
            # Trim closer to Q11 (10px margin)
            clip = fitz.Rect(0, q10_y - 10, page.rect.width, q11_y - 10)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            output_path = f"{output_dir}/q10.png"
            img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
            print(f"[OK] Q10 (trimmed) -> q10.png\n")
            break

# Fix Q20 - remove header from page 0
print("Fixing Q20...")
q20_page = 0
q21_page = 7
page_q20 = doc[q20_page]
page_q21 = doc[q21_page]

q20_y = find_question_on_page(page_q20, 20)
q21_y = find_question_on_page(page_q21, 21)

if q20_y and q21_y:
    print(f"Q20 on page {q20_page} at y={q20_y}")
    print(f"Q21 on page {q21_page} at y={q21_y}")

    # Start from Q20 number itself (skip header above it)
    clip1 = fitz.Rect(0, q20_y, page_q20.rect.width, page_q20.rect.height)
    pix1 = page_q20.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip1)
    img1 = Image.open(io.BytesIO(pix1.tobytes("png")))

    # Page 7: From top to Q21
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
    print(f"[OK] Q20 (no header) -> q20.png\n")

# Fix Q35 - trim whitespace
print("Fixing Q35...")
for page_num in range(len(doc)):
    page = doc[page_num]
    q35_y = find_question_on_page(page, 35)
    if q35_y:
        q36_y = find_question_on_page(page, 36)
        if q36_y:
            print(f"Q35 on page {page_num}, Q36 at y={q36_y}")
            # Trim closer to Q36 (10px margin)
            clip = fitz.Rect(0, q35_y - 10, page.rect.width, q36_y - 10)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            output_path = f"{output_dir}/q35.png"
            img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
            print(f"[OK] Q35 (trimmed) -> q35.png\n")
            break

# Fix Q40 - trim extra whitespace at bottom (last question)
print("Fixing Q40...")
for page_num in range(len(doc)):
    page = doc[page_num]
    q40_y = find_question_on_page(page, 40)
    if q40_y:
        print(f"Q40 on page {page_num} at y={q40_y}")
        # Q40 is the last question, extract to reasonable end (not full page)
        # Estimate: Q40 + question text + diagram + options = ~350px
        end_y = min(q40_y + 350, page.rect.height - 60)
        clip = fitz.Rect(0, q40_y - 10, page.rect.width, end_y)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        output_path = f"{output_dir}/q40.png"
        img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
        print(f"[OK] Q40 (trimmed bottom) -> q40.png\n")
        break

doc.close()
print("[DONE] All questions fixed!")

# Made with Bob
