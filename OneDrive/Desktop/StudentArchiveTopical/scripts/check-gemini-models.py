"""
Check which Gemini models are available and have quota remaining.
Tests all 3 API keys from .env and reports results per key.
Usage: python scripts/check-gemini-models.py
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(Path(__file__).parent.parent / ".env")

KEYS = {
    "Key 1 (GEMINI_API_KEY)":   os.getenv("GEMINI_API_KEY"),
    "Key 2 (GEMINI_API_KEY_2)": os.getenv("GEMINI_API_KEY_2"),
    "Key 3 (GEMINI_API_KEY_3)": os.getenv("GEMINI_API_KEY_3"),
}

# Tiny 1x1 white PNG (avoids needing a real image)
TINY_PNG = bytes([
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
    0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41,0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00,
    0x00,0x00,0x02,0x00,0x01,0xE2,0x21,0xBC,0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,
    0x44,0xAE,0x42,0x60,0x82
])

def test_key(label: str, api_key: str):
    if not api_key:
        print(f"\n{'='*50}")
        print(f"{label}: NOT SET in .env")
        return

    client = genai.Client(api_key=api_key)
    print(f"\n{'='*50}")
    print(f"{label} — fetching models...")

    all_models = []
    try:
        for m in client.models.list():
            name = m.name.replace("models/", "")
            if "flash" in name or "pro" in name:
                all_models.append(name)
    except Exception as e:
        print(f"  Could not list models: {e}")
        return

    available = []
    for model in all_models:
        try:
            client.models.generate_content(
                model=model,
                contents=["Say OK", types.Part.from_bytes(data=TINY_PNG, mime_type="image/png")]
            )
            print(f"  ✓ {model} — AVAILABLE")
            available.append(model)
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                print(f"  ✗ {model} — QUOTA EXHAUSTED")
            elif "404" in err or "NOT_FOUND" in err:
                print(f"  ✗ {model} — NOT FOUND")
            elif "403" in err or "PERMISSION_DENIED" in err:
                print(f"  ✗ {model} — PERMISSION DENIED")
            elif "400" in err or "not supported" in err.lower():
                print(f"  ~ {model} — NO VISION SUPPORT")
            else:
                print(f"  ? {model} — {err[:100]}")

    print(f"\n  → {len(available)} model(s) available on this key")

for label, key in KEYS.items():
    test_key(label, key)
