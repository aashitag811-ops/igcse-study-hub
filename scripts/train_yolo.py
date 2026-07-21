"""
Train YOLOv8 model on MCQ letter dataset
Run this after annotating images on Roboflow
"""

import sys
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics not installed")
    print("Install with: pip install ultralytics")
    sys.exit(1)


def train_model(data_yaml_path, epochs=50):
    """
    Train YOLO model on annotated dataset
    
    Args:
        data_yaml_path: Path to data.yaml from Roboflow
        epochs: Number of training epochs (default: 50)
    """
    print("\n" + "="*70)
    print("YOLOv8 MCQ Letter Detector - Training")
    print("="*70)
    print(f"Dataset: {data_yaml_path}")
    print(f"Epochs: {epochs}")
    print("="*70 + "\n")
    
    # Load pre-trained nano model (lightweight, fast)
    print("Loading YOLOv8 nano model...")
    model = YOLO('yolov8n.pt')
    
    # Train on your annotated dataset
    print("\nStarting training...")
    print("This will take about 5 minutes on CPU, 2 minutes on GPU\n")
    
    results = model.train(
        data=data_yaml_path,
        epochs=epochs,
        imgsz=640,
        batch=16,
        name='mcq_letters',
        patience=10,
        verbose=True
    )
    
    print("\n" + "="*70)
    print("Training Complete!")
    print("="*70)
    print(f"Model saved to: runs/detect/mcq_letters/weights/best.pt")
    print("\nNext steps:")
    print("1. Test the model on a single paper:")
    print("   python yolo_letter_detector.py --model runs/detect/mcq_letters/weights/best.pt --pdf paper.pdf --json paper.json")
    print("\n2. Process all papers:")
    print("   python batch_yolo_fix.py runs/detect/mcq_letters/weights/best.pt")
    print("="*70 + "\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train YOLO on MCQ letters')
    parser.add_argument('data_yaml', type=str,
                       help='Path to data.yaml from Roboflow export')
    parser.add_argument('--epochs', type=int, default=50,
                       help='Number of training epochs (default: 50)')
    
    args = parser.parse_args()
    
    # Check if data.yaml exists
    if not Path(args.data_yaml).exists():
        print(f"ERROR: File not found: {args.data_yaml}")
        print("\nMake sure you:")
        print("1. Annotated images on Roboflow")
        print("2. Exported as YOLOv8 format")
        print("3. Downloaded and extracted the dataset")
        print("4. Provide the correct path to data.yaml")
        sys.exit(1)
    
    train_model(args.data_yaml, args.epochs)

# Made with Bob
