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

print("\n=== Extracting Q20 ===")

# Q20 is on page 7 (index 7), Q21 is on page 8 (index 8)
page7 = doc[7]
q20_y = find_question_on_page(page7, 20)

if q20_y:
    print(f"Found Q20 on page 7 at y={q20_y}")
    
    # Check if Q21 is on same page
    q21_y = find_question_on_page(page7, 21)
    
    if q21_y:
        print(f"Found Q21 on same page at y={q21_y}")
        # Q21 comes before Q20 on the page (Q21 at y=394, Q20 at y=796)
        # So Q20 goes from y=796 to end of page
        clip = fitz.Rect(0, q20_y - 10, page7.rect.width, page7.rect.height - 40)
        pix = page7.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        output_path = f"{output_dir}/q20.png"
        img.save(output_path, 'PNG', quality=95, dpi=(150, 150))
        print(f"[OK] Q20 (from y={q20_y} to page end) -> q20.png")
    else:
        # Q21 is on next page
        page8 = doc[8]
        q21_y = find_question_on_page(page8, 21)
        print(f"Found Q21 on page 8 at y={q21_y}")
        
        # Extract from page 7 (Q20 to bottom)
        clip1 = fitz.Rect(0, q20_y - 10, page7.rect.width, page7.rect.height - 40)
        pix1 = page7.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip1)
        img1 = Image.open(io.BytesIO(pix1.tobytes("png")))
        
        # Extract from page 8 (top to Q21)
        clip2 = fitz.Rect(0, 40, page8.rect.width, q21_y - 30)
        pix2 = page8.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip2)
        img2 = Image.open(io.BytesIO(pix2.tobytes("png")))
        
        # Merge vertically
        total_height = img1.height + img2.height
        merged = Image.new('RGB', (img1.width, total_height), 'white')
        merged.paste(img1, (0, 0))
        merged.paste(img2, (0, img1.height))
        
        output_path = f"{output_dir}/q20.png"
        merged.save(output_path, 'PNG', quality=95, dpi=(150, 150))
        print(f"[OK] Q20 merged from pages 7-8 -> q20.png")
else:
    print("ERROR: Could not find Q20")

doc.close()
print("\n[DONE] Q20 re-extracted")

# Made with Bob
