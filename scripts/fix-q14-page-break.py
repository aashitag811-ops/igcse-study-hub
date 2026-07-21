import fitz  # PyMuPDF
from PIL import Image
import io
import re

# Open the PDF
pdf_path = r"C:\Users\sahal\Downloads\0610_m20_qp_22.pdf"
doc = fitz.open(pdf_path)

# Q14 spans pages - we need to find where it starts and ends
# Based on the screenshot, Q14 starts on one page and continues on the next

output_path = "public/images/biology/questions/q14.png"

# Strategy: Find Q14 on the page, then find where Q15 starts
# Extract everything between Q14 and Q15

def find_question_positions(doc):
    """Find all question number positions across all pages"""
    positions = []
    
    for page_num in range(1, len(doc)):  # Skip page 0 (front page)
        page = doc[page_num]
        text_instances = page.search_for("14")
        
        for inst in text_instances:
            # Check if this is a question number (left margin, specific format)
            if inst.x0 < 100:  # Left margin
                positions.append({
                    'page': page_num,
                    'number': 14,
                    'y': inst.y0,
                    'rect': inst
                })
    
    return positions

# Find Q14 and Q15 positions
q14_positions = []
q15_positions = []

for page_num in range(1, len(doc)):
    page = doc[page_num]
    
    # Find "14" in left margin
    text_instances = page.search_for("14")
    for inst in text_instances:
        if inst.x0 < 100:  # Left margin
            q14_positions.append({'page': page_num, 'y': inst.y0})
    
    # Find "15" in left margin
    text_instances = page.search_for("15")
    for inst in text_instances:
        if inst.x0 < 100:  # Left margin
            q15_positions.append({'page': page_num, 'y': inst.y0})

print(f"Found Q14 at: {q14_positions}")
print(f"Found Q15 at: {q15_positions}")

if not q14_positions:
    print("ERROR: Could not find Q14")
    exit(1)

# Q14 starts on one page
q14_start_page = q14_positions[0]['page']
q14_start_y = q14_positions[0]['y']

# Find where Q14 ends (either Q15 starts or page ends)
if q15_positions and q15_positions[0]['page'] == q14_start_page:
    # Q14 and Q15 on same page
    q14_end_page = q14_start_page
    q14_end_y = q15_positions[0]['y'] - 10
    print(f"Q14 is on single page {q14_start_page}")
else:
    # Q14 spans to next page
    q14_end_page = q14_start_page + 1
    if q15_positions and q15_positions[0]['page'] == q14_end_page:
        q14_end_y = q15_positions[0]['y'] - 10
    else:
        # Use page height
        q14_end_y = doc[q14_end_page].rect.height - 40
    print(f"Q14 spans pages {q14_start_page} to {q14_end_page}")

# Extract Q14 from first page
page1 = doc[q14_start_page]
page1_height = page1.rect.height
clip1 = fitz.Rect(0, q14_start_y - 10, page1.rect.width, page1_height - 40)
pix1 = page1.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip1)
img1 = Image.open(io.BytesIO(pix1.tobytes("png")))

if q14_end_page > q14_start_page:
    # Extract continuation from second page
    page2 = doc[q14_end_page]
    clip2 = fitz.Rect(0, 40, page2.rect.width, q14_end_y)
    pix2 = page2.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip2)
    img2 = Image.open(io.BytesIO(pix2.tobytes("png")))
    
    # Merge vertically
    total_height = img1.height + img2.height
    merged = Image.new('RGB', (img1.width, total_height), 'white')
    merged.paste(img1, (0, 0))
    merged.paste(img2, (0, img1.height))
    
    merged.save(output_path, 'PNG', quality=95, dpi=(150, 150))
    print(f"[OK] Q14 merged from 2 pages -> {output_path}")
else:
    # Single page
    img1.save(output_path, 'PNG', quality=95, dpi=(150, 150))
    print(f"[OK] Q14 single page -> {output_path}")

doc.close()

# Made with Bob
