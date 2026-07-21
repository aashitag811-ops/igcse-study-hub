# test_advanced_tools.py
import sys

print("Testing Advanced PDF Tools...")
print("-" * 50)

# Test 1: Tesseract
try:
    import pytesseract
    version = pytesseract.get_tesseract_version()
    print(f"OK Tesseract OCR: v{version}")
except Exception as e:
    print(f"FAIL Tesseract OCR: {e}")

# Test 2: pdf2image
try:
    from pdf2image import convert_from_path
    print("OK pdf2image: Installed")
except Exception as e:
    print(f"FAIL pdf2image: {e}")

# Test 3: OpenCV
try:
    import cv2
    print(f"OK OpenCV: v{cv2.__version__}")
except Exception as e:
    print(f"FAIL OpenCV: {e}")

# Test 4: pdfplumber (already installed)
try:
    import pdfplumber
    print("OK pdfplumber: Installed")
except Exception as e:
    print(f"FAIL pdfplumber: {e}")

print("-" * 50)
print("\nIf all tests pass, run the advanced parser!")

# Made with Bob
