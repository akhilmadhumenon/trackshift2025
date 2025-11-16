"""
Simple test script for crack detection module.
"""

import cv2
import numpy as np
import tempfile
import shutil
from pathlib import Path
from crack_detector import CrackDetector, detect_tyre_cracks


def create_sample_image():
    """Create a sample tyre image."""
    img = np.zeros((512, 512, 3), dtype=np.uint8)
    cv2.circle(img, (256, 256), 200, (128, 128, 128), -1)
    return img


def create_cracked_image():
    """Create a sample image with simulated cracks."""
    img = create_sample_image()
    
    # Add some crack-like lines
    cv2.line(img, (200, 200), (300, 250), (50, 50, 50), 2)
    cv2.line(img, (250, 180), (280, 280), (50, 50, 50), 2)
    cv2.line(img, (300, 220), (320, 300), (50, 50, 50), 2)
    
    return img


def test_canny_edge_detection():
    """Test Canny edge detection."""
    print("Testing Canny edge detection...")
    
    temp_dir = tempfile.mkdtemp()
    ref_dir = Path(temp_dir) / "reference"
    dam_dir = Path(temp_dir) / "damaged"
    out_dir = Path(temp_dir) / "output"
    
    ref_dir.mkdir()
    dam_dir.mkdir()
    out_dir.mkdir()
    
    try:
        detector = CrackDetector(str(ref_dir), str(dam_dir), str(out_dir))
        sample_image = create_sample_image()
        
        edges = detector.apply_canny_edge_detection(sample_image)
        
        assert edges is not None, "Edges should not be None"
        assert edges.shape == (512, 512), f"Expected shape (512, 512), got {edges.shape}"
        assert edges.dtype == np.uint8, f"Expected dtype uint8, got {edges.dtype}"
        assert np.any(edges > 0), "Should have some edges detected"
        
        print("✓ Canny edge detection test passed")
        return True
    finally:
        shutil.rmtree(temp_dir)


def test_crack_counting():
    """Test crack counting."""
    print("Testing crack counting...")
    
    temp_dir = tempfile.mkdtemp()
    ref_dir = Path(temp_dir) / "reference"
    dam_dir = Path(temp_dir) / "damaged"
    out_dir = Path(temp_dir) / "output"
    
    ref_dir.mkdir()
    dam_dir.mkdir()
    out_dir.mkdir()
    
    try:
        detector = CrackDetector(str(ref_dir), str(dam_dir), str(out_dir))
        
        # Create a binary map with distinct crack regions
        crack_binary = np.zeros((512, 512), dtype=np.uint8)
        
        # Add 3 distinct crack regions
        cv2.rectangle(crack_binary, (100, 100), (120, 150), 255, -1)
        cv2.rectangle(crack_binary, (200, 200), (220, 250), 255, -1)
        cv2.rectangle(crack_binary, (300, 300), (320, 350), 255, -1)
        
        count = detector.count_cracks(crack_binary, min_crack_area=20)
        
        assert count == 3, f"Expected 3 cracks, got {count}"
        
        print("✓ Crack counting test passed")
        return True
    finally:
        shutil.rmtree(temp_dir)


def test_crack_detection():
    """Test crack detection."""
    print("Testing crack detection...")
    
    temp_dir = tempfile.mkdtemp()
    ref_dir = Path(temp_dir) / "reference"
    dam_dir = Path(temp_dir) / "damaged"
    out_dir = Path(temp_dir) / "output"
    
    ref_dir.mkdir()
    dam_dir.mkdir()
    out_dir.mkdir()
    
    try:
        detector = CrackDetector(str(ref_dir), str(dam_dir), str(out_dir))
        cracked_image = create_cracked_image()
        
        crack_binary, crack_viz = detector.detect_cracks(cracked_image)
        
        assert crack_binary is not None, "Crack binary should not be None"
        assert crack_viz is not None, "Crack visualization should not be None"
        assert crack_binary.shape == (512, 512), f"Expected shape (512, 512), got {crack_binary.shape}"
        assert crack_viz.shape == (512, 512, 3), f"Expected shape (512, 512, 3), got {crack_viz.shape}"
        assert np.any(crack_binary > 0), "Should detect some cracks"
        
        print("✓ Crack detection test passed")
        return True
    finally:
        shutil.rmtree(temp_dir)


def test_full_analysis():
    """Test full video crack analysis."""
    print("Testing full video crack analysis...")
    
    temp_dir = tempfile.mkdtemp()
    ref_dir = Path(temp_dir) / "reference"
    dam_dir = Path(temp_dir) / "damaged"
    out_dir = Path(temp_dir) / "output"
    
    ref_dir.mkdir()
    dam_dir.mkdir()
    out_dir.mkdir()
    
    try:
        # Create sample frames
        sample_image = create_sample_image()
        cracked_image = create_cracked_image()
        
        cv2.imwrite(str(ref_dir / "frame_0000.png"), sample_image)
        cv2.imwrite(str(ref_dir / "frame_0001.png"), sample_image)
        cv2.imwrite(str(dam_dir / "frame_0000.png"), cracked_image)
        cv2.imwrite(str(dam_dir / "frame_0001.png"), cracked_image)
        
        results = detect_tyre_cracks(str(ref_dir), str(dam_dir), str(out_dir))
        
        assert results is not None, "Results should not be None"
        assert 'total_frames_analyzed' in results, "Should have total_frames_analyzed"
        assert 'total_crack_count' in results, "Should have total_crack_count"
        assert 'average_crack_count_per_frame' in results, "Should have average_crack_count_per_frame"
        assert 'composite_crack_map_path' in results, "Should have composite_crack_map_path"
        
        assert results['total_frames_analyzed'] == 2, f"Expected 2 frames, got {results['total_frames_analyzed']}"
        assert results['total_crack_count'] >= 0, "Crack count should be non-negative"
        
        # Check composite crack map was created
        assert Path(results['composite_crack_map_path']).exists(), "Composite crack map should exist"
        
        print("✓ Full analysis test passed")
        print(f"  - Frames analyzed: {results['total_frames_analyzed']}")
        print(f"  - Total cracks: {results['total_crack_count']}")
        print(f"  - Average crack density: {results['average_crack_density']:.2f}%")
        return True
    finally:
        shutil.rmtree(temp_dir)


if __name__ == "__main__":
    print("Running crack detection tests...\n")
    
    tests = [
        test_canny_edge_detection,
        test_crack_counting,
        test_crack_detection,
        test_full_analysis
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"✗ {test.__name__} failed: {e}")
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Tests passed: {passed}/{len(tests)}")
    print(f"Tests failed: {failed}/{len(tests)}")
    
    if failed == 0:
        print("All tests passed! ✓")
    else:
        print("Some tests failed.")
