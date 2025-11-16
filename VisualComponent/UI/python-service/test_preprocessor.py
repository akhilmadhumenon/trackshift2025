"""
Simple test script for video preprocessing pipeline.
"""

import sys
import os
from pathlib import Path
from video_preprocessor import VideoPreprocessor

def test_preprocessing():
    """Test the video preprocessing pipeline with a sample video."""
    
    # Check if video path is provided
    if len(sys.argv) < 2:
        print("Usage: python test_preprocessor.py <video_path>")
        print("Example: python test_preprocessor.py ../backend/uploads/test_video.mp4")
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    # Validate video exists
    if not os.path.exists(video_path):
        print(f"Error: Video file not found: {video_path}")
        sys.exit(1)
    
    print(f"Testing video preprocessing pipeline...")
    print(f"Input video: {video_path}")
    
    # Create output directory
    output_dir = "./test_output"
    Path(output_dir).mkdir(exist_ok=True)
    
    try:
        # Initialize preprocessor
        preprocessor = VideoPreprocessor(video_path, output_dir)
        
        # Run full pipeline
        metadata = preprocessor.process_video(fps=10)  # Use lower FPS for testing
        
        print("\n" + "="*50)
        print("PREPROCESSING COMPLETED SUCCESSFULLY")
        print("="*50)
        print(f"\nMetadata:")
        print(f"  Total frames processed: {metadata['total_frames']}")
        print(f"  FPS: {metadata['fps']}")
        print(f"  Average circle detected:")
        print(f"    - X: {metadata['avg_circle']['x']}")
        print(f"    - Y: {metadata['avg_circle']['y']}")
        print(f"    - Radius: {metadata['avg_circle']['radius']}")
        print(f"\nProcessed frames saved to: {metadata['processed_frames_dir']}")
        print(f"Metadata saved to: {output_dir}/preprocessing_metadata.json")
        
    except Exception as e:
        print(f"\nError during preprocessing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_preprocessing()
