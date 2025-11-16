"""
Test script for difference video generation.
"""

import cv2
import numpy as np
import os
import tempfile
import shutil
from difference_video_generator import (
    apply_depth_colormap,
    apply_edge_detection,
    overlay_crack_map,
    compute_frame_difference,
    generate_difference_video
)


def create_test_frame(width=640, height=480, color=(100, 100, 100)):
    """Create a test frame with specified color."""
    frame = np.full((height, width, 3), color, dtype=np.uint8)
    return frame


def create_test_frames_with_damage(output_dir, num_frames=5):
    """Create test frames simulating reference and damaged tyres."""
    ref_dir = os.path.join(output_dir, 'reference')
    damaged_dir = os.path.join(output_dir, 'damaged')
    crack_dir = os.path.join(output_dir, 'cracks')
    
    os.makedirs(ref_dir, exist_ok=True)
    os.makedirs(damaged_dir, exist_ok=True)
    os.makedirs(crack_dir, exist_ok=True)
    
    for i in range(num_frames):
        # Create reference frame (clean)
        ref_frame = create_test_frame(color=(120, 120, 120))
        cv2.circle(ref_frame, (320, 240), 150, (100, 100, 100), -1)
        cv2.imwrite(os.path.join(ref_dir, f'frame_{i:04d}.png'), ref_frame)
        
        # Create damaged frame (with some differences)
        damaged_frame = ref_frame.copy()
        # Add some "damage" - darker spots
        cv2.circle(damaged_frame, (280, 220), 20, (50, 50, 50), -1)
        cv2.circle(damaged_frame, (360, 260), 15, (60, 60, 60), -1)
        cv2.imwrite(os.path.join(damaged_dir, f'frame_{i:04d}.png'), damaged_frame)
        
        # Create crack map
        crack_map = np.zeros((480, 640), dtype=np.uint8)
        cv2.circle(crack_map, (280, 220), 20, 255, 2)
        cv2.circle(crack_map, (360, 260), 15, 255, 2)
        cv2.imwrite(os.path.join(crack_dir, f'frame_{i:04d}.png'), crack_map)
    
    return ref_dir, damaged_dir, crack_dir


def test_apply_depth_colormap():
    """Test depth colormap application."""
    print("Testing apply_depth_colormap...")
    
    # Create test depth map
    depth_map = np.zeros((100, 100), dtype=np.uint8)
    depth_map[25:75, 25:75] = 128  # Medium depth
    depth_map[40:60, 40:60] = 255  # Deep
    
    # Apply colormap
    colored = apply_depth_colormap(depth_map)
    
    # Verify output shape
    assert colored.shape == (100, 100, 3), "Output shape mismatch"
    
    # Verify color gradient (blue to red)
    # Shallow areas should be more blue
    assert colored[10, 10, 0] > colored[10, 10, 2], "Shallow area should be blue"
    
    # Deep areas should be more red
    assert colored[50, 50, 2] > colored[50, 50, 0], "Deep area should be red"
    
    print("✓ apply_depth_colormap test passed")


def test_apply_edge_detection():
    """Test edge detection."""
    print("Testing apply_edge_detection...")
    
    # Create test frame with clear edges
    frame = create_test_frame()
    cv2.rectangle(frame, (100, 100), (200, 200), (255, 255, 255), -1)
    
    # Apply edge detection
    edges = apply_edge_detection(frame)
    
    # Verify output
    assert edges.shape == (480, 640), "Edge map shape mismatch"
    assert edges.dtype == np.uint8, "Edge map dtype mismatch"
    assert np.max(edges) > 0, "No edges detected"
    
    print("✓ apply_edge_detection test passed")


def test_overlay_crack_map():
    """Test crack map overlay."""
    print("Testing overlay_crack_map...")
    
    # Create test frame and crack map
    frame = create_test_frame()
    crack_map = np.zeros((480, 640), dtype=np.uint8)
    # Draw filled circle to ensure we have crack pixels
    cv2.circle(crack_map, (320, 240), 50, 255, -1)
    
    # Apply overlay
    result = overlay_crack_map(frame, crack_map, alpha=0.5)
    
    # Verify output
    assert result.shape == frame.shape, "Output shape mismatch"
    
    # Check that crack areas have more red than original (center of circle)
    original_pixel = frame[240, 320]
    result_pixel = result[240, 320]
    assert result_pixel[2] > original_pixel[2], "Crack overlay should increase red channel"
    
    # Check that non-crack areas remain unchanged
    non_crack_original = frame[50, 50]
    non_crack_result = result[50, 50]
    assert np.array_equal(non_crack_original, non_crack_result), "Non-crack areas should be unchanged"
    
    print("✓ overlay_crack_map test passed")


def test_compute_frame_difference():
    """Test frame difference computation."""
    print("Testing compute_frame_difference...")
    
    # Create reference and damaged frames
    ref_frame = create_test_frame(color=(100, 100, 100))
    damaged_frame = create_test_frame(color=(100, 100, 100))
    
    # Add damage to damaged frame
    cv2.circle(damaged_frame, (320, 240), 50, (50, 50, 50), -1)
    
    # Compute difference
    diff_map, depth_map = compute_frame_difference(ref_frame, damaged_frame)
    
    # Verify outputs
    assert diff_map.shape == (480, 640), "Difference map shape mismatch"
    assert depth_map.shape == (480, 640), "Depth map shape mismatch"
    
    # Check that damaged area has higher difference
    center_diff = diff_map[240, 320]
    corner_diff = diff_map[50, 50]
    assert center_diff > corner_diff, "Damaged area should have higher difference"
    
    print("✓ compute_frame_difference test passed")


def test_generate_difference_video():
    """Test full difference video generation."""
    print("Testing generate_difference_video...")
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Create test frames
        ref_dir, damaged_dir, crack_dir = create_test_frames_with_damage(temp_dir, num_frames=5)
        
        # Generate difference video
        output_video = os.path.join(temp_dir, 'difference.mp4')
        metadata = generate_difference_video(
            reference_frames_dir=ref_dir,
            damaged_frames_dir=damaged_dir,
            crack_maps_dir=crack_dir,
            depth_maps_dir=None,
            output_video_path=output_video,
            fps=10,
            apply_edges=True,
            apply_crack_overlay=True,
            apply_depth_colors=True
        )
        
        # Verify output
        assert os.path.exists(output_video), "Output video not created"
        assert metadata['num_frames'] == 5, "Frame count mismatch"
        assert metadata['fps'] == 10, "FPS mismatch"
        
        # Verify video can be opened
        cap = cv2.VideoCapture(output_video)
        assert cap.isOpened(), "Cannot open generated video"
        
        frame_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
        
        cap.release()
        
        assert frame_count == 5, f"Expected 5 frames, got {frame_count}"
        
        print("✓ generate_difference_video test passed")
        
    finally:
        # Clean up
        shutil.rmtree(temp_dir)


def run_all_tests():
    """Run all tests."""
    print("\n" + "="*60)
    print("Running Difference Video Generator Tests")
    print("="*60 + "\n")
    
    try:
        test_apply_depth_colormap()
        test_apply_edge_detection()
        test_overlay_crack_map()
        test_compute_frame_difference()
        test_generate_difference_video()
        
        print("\n" + "="*60)
        print("All tests passed! ✓")
        print("="*60 + "\n")
        
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}\n")
        raise
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}\n")
        raise


if __name__ == "__main__":
    run_all_tests()
