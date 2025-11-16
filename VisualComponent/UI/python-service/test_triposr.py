"""
Test script for TripoSR 3D reconstruction integration.
This script validates the TripoSR reconstructor without requiring actual video preprocessing.
"""

import os
import sys
from pathlib import Path
import numpy as np
from PIL import Image


def create_test_frames(output_dir: str, num_frames: int = 8):
    """
    Create synthetic test frames for testing TripoSR integration.
    
    Args:
        output_dir: Directory to save test frames
        num_frames: Number of frames to create
    """
    output_path = Path(output_dir) / "processed_frames"
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Creating {num_frames} test frames in {output_path}")
    
    # Create simple circular gradient images (simulating tyre top-down view)
    size = 512
    center = size // 2
    
    for i in range(num_frames):
        # Create image with circular gradient
        img = np.zeros((size, size, 3), dtype=np.uint8)
        
        for y in range(size):
            for x in range(size):
                # Calculate distance from center
                dist = np.sqrt((x - center)**2 + (y - center)**2)
                
                # Create circular pattern
                if dist < center * 0.8:
                    # Inner circle (tyre tread)
                    intensity = int(128 + 64 * np.sin(dist / 10 + i * 0.5))
                    img[y, x] = [intensity, intensity, intensity]
                elif dist < center * 0.9:
                    # Middle ring
                    img[y, x] = [80, 80, 80]
                else:
                    # Outer area
                    img[y, x] = [40, 40, 40]
        
        # Add some noise for realism
        noise = np.random.randint(-10, 10, (size, size, 3), dtype=np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        
        # Save frame
        frame_path = output_path / f"processed_{i:04d}.png"
        Image.fromarray(img).save(frame_path)
        print(f"  Created frame: {frame_path}")
    
    return str(output_path.parent)


def test_triposr_import():
    """Test if TripoSR can be imported."""
    print("\n=== Testing TripoSR Import ===")
    try:
        from triposr_reconstructor import TripoSRReconstructor
        print("✓ TripoSR reconstructor module imported successfully")
        return True
    except ImportError as e:
        print(f"✗ Failed to import TripoSR reconstructor: {e}")
        return False


def test_triposr_model_loading():
    """Test if TripoSR model can be loaded."""
    print("\n=== Testing TripoSR Model Loading ===")
    try:
        from triposr_reconstructor import TripoSRReconstructor
        
        print("Initializing TripoSR reconstructor...")
        reconstructor = TripoSRReconstructor(device='cpu')  # Use CPU for testing
        print("✓ TripoSR model loaded successfully")
        return True
    except Exception as e:
        print(f"✗ Failed to load TripoSR model: {e}")
        print("\nNote: This is expected if TripoSR is not installed.")
        print("Run: ./setup_triposr.sh to install TripoSR")
        return False


def test_frame_selection():
    """Test frame selection logic."""
    print("\n=== Testing Frame Selection ===")
    try:
        from triposr_reconstructor import TripoSRReconstructor
        
        # Create test frames
        test_dir = "/tmp/test_triposr"
        preprocessing_dir = create_test_frames(test_dir, num_frames=16)
        
        reconstructor = TripoSRReconstructor(device='cpu')
        frames_dir = Path(preprocessing_dir) / "processed_frames"
        
        # Test frame selection
        selected = reconstructor.select_best_frames(frames_dir, num_frames=8)
        print(f"✓ Selected {len(selected)} frames from {len(list(frames_dir.glob('*.png')))} total")
        
        # Cleanup
        import shutil
        shutil.rmtree(test_dir)
        
        return True
    except Exception as e:
        print(f"✗ Frame selection test failed: {e}")
        return False


def test_full_reconstruction():
    """Test full reconstruction pipeline (if TripoSR is available)."""
    print("\n=== Testing Full Reconstruction Pipeline ===")
    try:
        from triposr_reconstructor import reconstruct_tyre_3d
        
        # Create test frames
        test_dir = "/tmp/test_triposr_full"
        preprocessing_dir = create_test_frames(test_dir, num_frames=8)
        output_glb = f"{test_dir}/output.glb"
        
        print("Running 3D reconstruction (this may take a while)...")
        metadata = reconstruct_tyre_3d(
            preprocessing_output_dir=preprocessing_dir,
            output_glb_path=output_glb,
            device='cpu',
            num_frames=4,  # Use fewer frames for faster testing
            mc_resolution=128  # Lower resolution for faster testing
        )
        
        print(f"✓ Reconstruction completed successfully")
        print(f"  Output: {metadata['output_path']}")
        print(f"  Vertices: {metadata['num_vertices']}")
        print(f"  Faces: {metadata['num_faces']}")
        
        # Verify output file exists
        if os.path.exists(output_glb):
            file_size = os.path.getsize(output_glb) / 1024  # KB
            print(f"  File size: {file_size:.2f} KB")
        
        # Cleanup
        import shutil
        shutil.rmtree(test_dir)
        
        return True
    except Exception as e:
        print(f"✗ Full reconstruction test failed: {e}")
        print("\nNote: This test requires TripoSR to be fully installed and functional.")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("TripoSR Integration Test Suite")
    print("=" * 60)
    
    results = []
    
    # Test 1: Import
    results.append(("Import Test", test_triposr_import()))
    
    # Test 2: Model Loading (skip if import failed)
    if results[0][1]:
        results.append(("Model Loading Test", test_triposr_model_loading()))
        
        # Test 3: Frame Selection (skip if model loading failed)
        if results[1][1]:
            results.append(("Frame Selection Test", test_frame_selection()))
            
            # Test 4: Full Reconstruction (optional, can be slow)
            if "--full" in sys.argv:
                results.append(("Full Reconstruction Test", test_full_reconstruction()))
    
    # Print summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    total_passed = sum(1 for _, passed in results if passed)
    total_tests = len(results)
    
    print(f"\nTotal: {total_passed}/{total_tests} tests passed")
    
    if total_passed == total_tests:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. See output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
