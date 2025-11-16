"""
Test script for depth estimation functionality.
"""

import cv2
import numpy as np
from pathlib import Path
import tempfile
import shutil
from depth_estimator import DepthEstimator, estimate_tyre_depth


def create_test_images():
    """Create synthetic test images for depth estimation testing."""
    # Create a reference image (pristine tyre)
    reference = np.zeros((512, 512, 3), dtype=np.uint8)
    reference[:] = (100, 100, 100)  # Gray background
    
    # Draw a circle to represent tyre
    cv2.circle(reference, (256, 256), 200, (120, 120, 120), -1)
    
    # Add some texture
    for i in range(50):
        x = np.random.randint(56, 456)
        y = np.random.randint(56, 456)
        cv2.circle(reference, (x, y), 2, (110, 110, 110), -1)
    
    # Create a damaged image with depth variations
    damaged = reference.copy()
    
    # Add some darker areas to simulate depth (cracks/damage)
    # Crack 1: vertical line
    cv2.line(damaged, (200, 150), (210, 350), (80, 80, 80), 3)
    
    # Crack 2: horizontal line
    cv2.line(damaged, (150, 250), (350, 260), (75, 75, 75), 3)
    
    # Crack 3: diagonal
    cv2.line(damaged, (280, 180), (320, 320), (70, 70, 70), 2)
    
    # Add some wear patches (lighter areas)
    cv2.circle(damaged, (180, 180), 30, (130, 130, 130), -1)
    cv2.circle(damaged, (330, 300), 25, (135, 135, 135), -1)
    
    return reference, damaged


def test_depth_estimator():
    """Test the DepthEstimator class."""
    print("Testing DepthEstimator...")
    
    # Create temporary directories
    temp_dir = Path(tempfile.mkdtemp())
    ref_dir = temp_dir / "reference"
    dam_dir = temp_dir / "damaged"
    out_dir = temp_dir / "output"
    
    ref_dir.mkdir()
    dam_dir.mkdir()
    out_dir.mkdir()
    
    try:
        # Create test images
        print("Creating test images...")
        reference, damaged = create_test_images()
        
        # Save test images
        cv2.imwrite(str(ref_dir / "frame_0000.png"), reference)
        cv2.imwrite(str(dam_dir / "frame_0000.png"), damaged)
        
        # Create a few more frames with slight variations
        for i in range(1, 3):
            ref_var = reference.copy()
            dam_var = damaged.copy()
            
            # Add slight noise
            noise = np.random.randint(-5, 5, ref_var.shape, dtype=np.int16)
            ref_var = np.clip(ref_var.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            dam_var = np.clip(dam_var.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            
            cv2.imwrite(str(ref_dir / f"frame_{i:04d}.png"), ref_var)
            cv2.imwrite(str(dam_dir / f"frame_{i:04d}.png"), dam_var)
        
        # Initialize depth estimator
        print("Initializing DepthEstimator...")
        estimator = DepthEstimator(
            reference_frames_dir=str(ref_dir),
            damaged_frames_dir=str(dam_dir),
            output_dir=str(out_dir)
        )
        
        # Test pixel difference computation
        print("Testing pixel difference computation...")
        diff = estimator.compute_pixel_difference(reference, damaged)
        assert diff.shape == (512, 512), "Pixel difference shape mismatch"
        assert diff.dtype == np.uint8, "Pixel difference dtype mismatch"
        print(f"  ✓ Pixel difference computed: shape={diff.shape}, max_diff={np.max(diff)}")
        
        # Test stereo depth estimation
        print("Testing stereo depth estimation...")
        stereo_depth = estimator.estimate_depth_from_stereo(reference, damaged)
        assert stereo_depth.shape == (512, 512), "Stereo depth shape mismatch"
        assert stereo_depth.dtype == np.float32, "Stereo depth dtype mismatch"
        print(f"  ✓ Stereo depth estimated: shape={stereo_depth.shape}, max={np.max(stereo_depth):.3f}")
        
        # Test depth calculation
        print("Testing depth difference calculation...")
        depth_map, max_depth_mm = estimator.calculate_depth_differences(reference, damaged)
        assert depth_map.shape == (512, 512), "Depth map shape mismatch"
        assert max_depth_mm > 0, "Max depth should be positive"
        print(f"  ✓ Depth calculated: max_depth={max_depth_mm:.2f} mm")
        
        # Test color map generation
        print("Testing depth color map generation...")
        colored_depth = estimator.generate_depth_color_map(depth_map)
        assert colored_depth.shape == (512, 512, 3), "Colored depth shape mismatch"
        print(f"  ✓ Color map generated: shape={colored_depth.shape}")
        
        # Test full video analysis
        print("Testing full video depth analysis...")
        results = estimator.analyze_video_depth()
        
        assert results['total_frames_analyzed'] == 3, "Should analyze 3 frames"
        assert results['max_depth_estimate_mm'] > 0, "Max depth should be positive"
        assert len(results['frame_results']) == 3, "Should have 3 frame results"
        
        print(f"  ✓ Video analysis complete:")
        print(f"    - Frames analyzed: {results['total_frames_analyzed']}")
        print(f"    - Max depth: {results['max_depth_estimate_mm']:.2f} mm")
        print(f"    - Avg max depth: {results['average_max_depth_mm']:.2f} mm")
        
        # Verify output files exist
        assert (out_dir / "depth_maps").exists(), "Depth maps directory should exist"
        assert (out_dir / "composite_depth_map.png").exists(), "Composite depth map should exist"
        assert (out_dir / "depth_analysis_results.json").exists(), "Results JSON should exist"
        
        print(f"  ✓ Output files created in {out_dir}")
        
        print("\n✅ All depth estimator tests passed!")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir)
        print(f"Cleaned up temporary directory: {temp_dir}")


def test_convenience_function():
    """Test the convenience function."""
    print("\nTesting convenience function estimate_tyre_depth()...")
    
    # Create temporary directories
    temp_dir = Path(tempfile.mkdtemp())
    ref_dir = temp_dir / "reference"
    dam_dir = temp_dir / "damaged"
    out_dir = temp_dir / "output"
    
    ref_dir.mkdir()
    dam_dir.mkdir()
    
    try:
        # Create test images
        reference, damaged = create_test_images()
        cv2.imwrite(str(ref_dir / "frame_0000.png"), reference)
        cv2.imwrite(str(dam_dir / "frame_0000.png"), damaged)
        
        # Run convenience function
        results = estimate_tyre_depth(
            reference_frames_dir=str(ref_dir),
            damaged_frames_dir=str(dam_dir),
            output_dir=str(out_dir)
        )
        
        assert results['total_frames_analyzed'] == 1, "Should analyze 1 frame"
        assert results['max_depth_estimate_mm'] > 0, "Max depth should be positive"
        
        print(f"  ✓ Convenience function works:")
        print(f"    - Max depth: {results['max_depth_estimate_mm']:.2f} mm")
        
        print("\n✅ Convenience function test passed!")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir)


if __name__ == "__main__":
    test_depth_estimator()
    test_convenience_function()
    print("\n🎉 All tests completed successfully!")
