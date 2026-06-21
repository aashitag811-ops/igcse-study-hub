import pdfplumber

pdf_path = "ICT 0417 Paper 1/ICT 0417 Paper 1/May June 2020/0417_s20_qp_12.pdf"

with pdfplumber.open(pdf_path) as pdf:
    # Check pages 2-4
    for page_num in [2, 3, 4]:
        page = pdf.pages[page_num - 1]
        text = page.extract_text(layout=True)
        lines = text.split('\n')
        
        print(f"\n=== PAGE {page_num} ===")
        for i, line in enumerate(lines, 1):
            # Print lines that might contain Q3
            if 'Complete' in line or 'communication' in line or 'network' in line:
                print(f"{i:3d}: {line[:100]}")

# Made with Bob
