import json

# Load detected positions
with open('detected_positions.json', 'r') as f:
    detected = json.load(f)

# Load main JSON
with open('../public/papers/0610_m20_qp_22.json', 'r') as f:
    data = json.load(f)

print("Applying OCR-detected letter positions...")
print("=" * 60)

# Apply detected positions
for question in data['questions']:
    q_num = str(question['questionNumber'])
    
    if q_num in detected:
        detected_pos = detected[q_num]
        
        # Update positions for detected letters
        for letter in ['A', 'B', 'C', 'D']:
            if letter in detected_pos:
                if letter in question['optionPositions']:
                    # Keep the y-coordinate from JSON, use x from OCR
                    old_x = question['optionPositions'][letter]['x']
                    new_x = detected_pos[letter]['x']
                    question['optionPositions'][letter]['x'] = new_x
                    print(f"Q{q_num} {letter}: Changed x from {old_x} to {new_x}")

# Save
with open('../public/papers/0610_m20_qp_22.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 60)
print("SUCCESS! Applied OCR-detected positions")
print("The circles should now be exactly on the letters!")
print("\nRefresh your browser to see the changes")

# Made with Bob