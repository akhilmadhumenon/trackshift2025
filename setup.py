import os
import subprocess
import sys

def setup_model():
    """Setup model files on first deployment"""
    if not os.path.exists('tyre_degradation_model.pkl'):
        print("Model not found. Generating...")
        subprocess.run([sys.executable, 'data_collection.py'])
        subprocess.run([sys.executable, 'model_training.py'])
        print("Model generated successfully!")

if __name__ == "__main__":
    setup_model()