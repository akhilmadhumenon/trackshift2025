"""
Test suite for crack detection module.
"""

import cv2
import numpy as np
import pytest
import tempfile
import shutil
from pathlib import Path
from crack_detector import CrackDetector, detect_tyre_cracks


class TestCrackDetector:
    """Test cases for CrackDetector class."""
    
    @pytest.fixture
    def temp_dirs(self):
        """Create temporary directories for testing."""
        temp_dir = tempfile.mkdtemp()
        ref_dir = Path(temp_dir) / "reference"
        dam_dir = Path(temp_dir) / "damaged"
        out_dir = Path(temp_dir) / "output"
        
        ref_dir.mkdir()
        dam_dir.mkdir()
        out_dir.mkdir()
        
        yield str(ref_dir), str(dam_dir), str(out_dir)
        
        # Cleanup
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def sample_image(self):
        """Create a sample tyre image."""
        # Create a 512x512 grayscale image with a circle (tyre)
        img = np.zeros((512, 512, 3), dtype=np.uint8)
        cv2.circle(img, (256, 256), 200, (128, 128, 128), -1)
        return img
    
    @pytest.fixture
    def cracked_image(self, sample_image):
        """Create a sample image with simulated cracks."""
        img = sample_image.copy()
        
        # Add some crack-like lines
        cv2.line(img, (200, 200), (300, 250), (50, 50, 50), 2)
        cv2.line(img, (250, 180), (280, 280), (50, 50, 50), 2)
        cv2.line(img, (300, 220), (320, 300), (50, 50, 50), 2)
        
        return img
    
    def test_canny_edge_detection(self, temp_dirs, sample_image):
        """Test Canny edge detection."""
        ref_dir, dam_dir, out_dir = temp_dirs
        detector = CrackDetector(ref_dir, dam_dir, out_dir)
        
        edges = detector.apply_canny_edge_detection(sample_image)
        
        # Check that edges are detected
        assert edges is not None
        assert edges.shape == (512, 512)
        assert edges.dtype == np.uint8
        assert np.any(edges > 0)  # Should have some edges
    
    def test_morphological_operations(self, temp_dirs):
        """Test morphological operations on edge map."""
        ref_dir, dam_dir, out_dir = temp_dirs
        detector = CrackDetector(ref_dir, dam_dir, out_dir)
        
        # Create a simple edge map
        edges = np.zeros((512, 512), dtype=np.uint8)
        cv2.line(edges, (100, 100), (200, 200), 255, 1)
        
        processed = detector.apply_morphological_operations(edges)
        
        assert processed is not None
        assert processed.shape == edges.shape
        assert np.any(processed > 0)
    
    def test_compute_difference_map(self, temp_dirs, sample_image, cracked_image):
        """Test difference map computation."""
        ref_dir, dam_dir, out_dir = temp_dirs
        detector = CrackDetector(ref_dir, dam_dir, out_dir)
        
        diff_map = detector.compute_difference_map(sample_image, cracked_image)
        
        assert diff_map is not None
        assert diff_map.shape == (512, 512)
        assert np.any(diff_map > 0)  # Should detect differences
    
    def test_detect_cracks(self, temp_dirs, cracked_image):
        """Test crack detection."""
        ref_dir, dam_dir, out_dir = temp_dirs
        detector = CrackDetector(ref_dir, dam_dir, out_dir)
        
        crack_binary, crack_viz = detector.detect_cracks(cracked_image)
        
        assert crack_binary is not None
        assert crack_viz is not None
        assert crack_binary.shape == (512, 512)
        assert crack_viz.shape == (512, 512, 3)
        assert np.any(crack_binary > 0)  # Should detect some cracks
    
    def test_count_cracks(self, temp_dirs):
        """Test crack counting."""
        ref_dir, dam_dir, out_dir = temp_dirs
        detector = CrackDetector(ref_dir, dam_dir, out_dir)
        
        # Create a binary map with distinct crack regions
        crack_binary = np.zeros((512, 512), dtype=np.uint8)
        
        # Add 3 distinct crack regions
        cv2.rectangle(crack_binary, (100, 100), (120, 150), 255, -1)
        cv2.rectangle(crack_binary, (200, 200), (220, 250), 255, -1)
        cv2.rectangle(crack_binary, (300, 300), (320, 350), 255, -1)
        
        count = detector.count_cracks(crack_binary, min_crack_area=20)
        
        assert count == 3
    
    def test_generate_crack_map(self, temp_dirs, sample_image, cracked_image):
        """Test crack map generation."""
        ref_dir, dam_dir, out_dir = temp_dirs
        detector = CrackDetector(ref_dir, dam_dir, out_dir)
        
        result = detector.generate_crack_map(0, cracked_image, sample_image)
        
        assert result is not None
        assert 'frame_index' in result
        assert 'crack_count' in result
        assert 'crack_density' in result
        assert 'crack_map_path' in result
        assert 'crack_binary_path' in result
        assert result['frame_index'] == 0
        assert result['crack_count'] >= 0
        assert result['crack_density'] >= 0
        
        # Check that files were created
        assert Path(result['crack_map_path']).exists()
        assert Path(result['crack_binary_path']).exists()
    
    def test_analyze_video_cracks(self, temp_dirs, sample_image, cracked_image):
        """Test full video crack analysis."""
        ref_dir, dam_dir, out_dir = temp_dirs
        
        # Create sample frames
        cv2.imwrite(str(Path(ref_dir) / "frame_0000.png"), sample_image)
        cv2.imwrite(str(Path(ref_dir) / "frame_0001.png"), sample_image)
        cv2.imwrite(str(Path(dam_dir) / "frame_0000.png"), cracked_image)
        cv2.imwrite(str(Path(dam_dir) / "frame_0001.png"), cracked_image)
        
        detector = CrackDetector(ref_dir, dam_dir, out_dir)
        results = detector.analyze_video_cracks()
        
        assert results is not None
        assert 'total_frames_analyzed' in results
        assert 'total_crack_count' in results
        assert 'average_crack_count_per_frame' in results
        assert 'average_crack_density' in results
        assert 'composite_crack_map_path' in results
        assert 'frame_results' in results
        
        assert results['total_frames_analyzed'] == 2
        assert results['total_crack_count'] >= 0
        assert len(results['frame_results']) == 2
        
        # Check composite crack map was created
        assert Path(results['composite_crack_map_path']).exists()
    
    def test_convenience_function(self, temp_dirs, sample_image, cracked_image):
        """Test the convenience function."""
        ref_dir, dam_dir, out_dir = temp_dirs
        
        # Create sample frames
        cv2.imwrite(str(Path(ref_dir) / "frame_0000.png"), sample_image)
        cv2.imwrite(str(Path(dam_dir) / "frame_0000.png"), cracked_image)
        
        results = detect_tyre_cracks(ref_dir, dam_dir, out_dir)
        
        assert results is not None
        assert results['total_frames_analyzed'] == 1
        assert results['total_crack_count'] >= 0


if __name__ == "__main__":
    # Run tests without pytest.main to avoid environment issues
    import sys
    
    test_instance = TestCrackDetector()
    
    print("Running Crack Detector Tests...")
    print("=" * 60)
    
    try:
        # Create fixtures
        temp_dirs = None
        sample_image = None
        cracked_image = None
        
        for fixture_name, fixture_method in [
            ('temp_dirs', test_instance.temp_dirs),
            ('sample_image', test_instance.sample_image),
            ('cracked_image', test_instance.cracked_image)
        ]:
            pass
        
        # Get fixtures
        temp_dirs_gen = test_instance.temp_dirs()
        temp_dirs = next(temp_dirs_gen)
        
        sample_image_gen = test_instance.sample_image()
        sample_image = next(sample_image_gen)
        
        cracked_image_gen = test_instance.cracked_image(sample_image)
        cracked_image = next(cracked_image_gen)
        
        # Run tests
        tests = [
            ('test_canny_edge_detection', lambda: test_instance.test_canny_edge_detection(temp_dirs, sample_image)),
            ('test_morphological_operations', lambda: test_instance.test_morphological_operations(temp_dirs)),
            ('test_compute_difference_map', lambda: test_instance.test_compute_difference_map(temp_dirs, sample_image, cracked_image)),
            ('test_detect_cracks', lambda: test_instance.test_detect_cracks(temp_dirs, cracked_image)),
            ('test_count_cracks', lambda: test_instance.test_count_cracks(temp_dirs)),
            ('test_generate_crack_map', lambda: test_instance.test_generate_crack_map(temp_dirs, sample_image, cracked_image)),
            ('test_analyze_video_cracks', lambda: test_instance.test_analyze_video_cracks(temp_dirs, sample_image, cracked_image)),
            ('test_convenience_function', lambda: test_instance.test_convenience_function(temp_dirs, sample_image, cracked_image)),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                print(f"Running {test_name}...", end=" ")
                test_func()
                print("✓ PASSED")
                passed += 1
            except Exception as e:
                print(f"✗ FAILED: {e}")
                failed += 1
        
        # Cleanup
        try:
            next(temp_dirs_gen)
        except StopIteration:
            pass
        
        print("=" * 60)
        print(f"Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 All tests completed successfully!")
            sys.exit(0)
        else:
            sys.exit(1)
            
    except Exception as e:
        print(f"Error running tests: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
