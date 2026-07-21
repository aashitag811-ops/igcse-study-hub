rimport fitz  # PyMuPDF
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

print("=== Fixing Q40 (complete extraction) ===\n")

# Q40 is the last question, so extract to end of content (not page end)
for page_num in range(len(doc)):
    page = doc[page_num]
    q40_y = find_question_on_page(page, 40)
    if q40_y:
        print(f"Q40 found on page {page_num} at y={q40_y}")
        
        # Extract to end of page minus footer space (60px)
        end_y = page.rect.height - 60
        
        print(f"Extracting from y={q40_y - 10} to y={end_y}")
        
        clip = fitz.Rect(0, q40_y - 10, page.rect.width, end_y)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        
        output_path = f"{output_dir}/q40.png"
        img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
        print(f"[OK] Q40 (complete) -> q40.png")
        print(f"Image size: {img.width}x{img.height}")
        break

doc.close()
print("\n[DONE]")

# Made with Bob
