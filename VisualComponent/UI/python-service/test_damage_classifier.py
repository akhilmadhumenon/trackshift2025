"""
Test script for damage classification module.
"""

import cv2
import numpy as np
import tempfile
import shutil
from pathlib import Path
from damage_classifier import DamageClassifier, DamageType, classify_tyre_damage


def create_test_images_with_damage():
    """Create synthetic test images with different damage patterns."""
    size = (512, 512)
    
    # Create damaged image with various patterns
    damaged = np.zeros((size[1], size[0], 3), dtype=np.uint8)
    damaged[:] = (80, 80, 80)  # Gray background
    
    # Add circular patterns (blistering) - more pronounced
    cv2.circle(damaged, (100, 100), 20, (120, 120, 120), -1)
    cv2.circle(damaged, (150, 120), 15, (120, 120, 120), -1)
    cv2.circle(damaged, (130, 80), 18, (120, 120, 120), -1)
    cv2.circle(damaged, (180, 100), 22, (120, 120, 120), -1)
    
    # Add linear cracks (cuts) - longer lines
    cv2.line(damaged, (200, 50), (280, 180), (40, 40, 40), 3)
    cv2.line(damaged, (300, 100), (380, 250), (40, 40, 40), 3)
    cv2.line(damaged, (250, 200), (320, 300), (40, 40, 40), 3)
    
    # Add strong texture roughness (grain)
    noise = np.random.randint(-50, 50, (size[1], size[0], 3), dtype=np.int16)
    damaged_noisy = np.clip(damaged.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Create crack binary map
    crack_binary = np.zeros((size[1], size[0]), dtype=np.uint8)
    
    # Add circular crack patterns (blistering) - filled circles
    cv2.circle(crack_binary, (100, 100), 20, 255, -1)
    cv2.circle(crack_binary, (150, 120), 15, 255, -1)
    cv2.circle(crack_binary, (130, 80), 18, 255, -1)
    cv2.circle(crack_binary, (180, 100), 22, 255, -1)
    
    # Add linear cracks (cuts) - longer and thicker
    cv2.line(crack_binary, (200, 50), (280, 180), 255, 3)
    cv2.line(crack_binary, (300, 100), (380, 250), 255, 3)
    cv2.line(crack_binary, (250, 200), (320, 300), 255, 3)
    
    # Add dense fine crack network (micro-cracks)
    for i in range(100):
        x1, y1 = np.random.randint(400, 480), np.random.randint(50, 130)
        x2, y2 = x1 + np.random.randint(-8, 8), y1 + np.random.randint(-8, 8)
        cv2.line(crack_binary, (x1, y1), (x2, y2), 255, 1)
    
    # Add large irregular chunk (chunking)
    pts = np.array([[50, 300], [100, 280], [120, 320], [80, 350], [40, 330]], np.int32)
    cv2.fillPoly(crack_binary, [pts], 255)
    
    return damaged_noisy, crack_binary


def test_damage_classifier():
    """Test the DamageClassifier class."""
    print("Testing DamageClassifier...")
    
    # Create temporary directories
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        damaged_dir = temp_path / "damaged_frames"
        crack_maps_dir = temp_path / "crack_maps"
        output_dir = temp_path / "output"
        
        damaged_dir.mkdir()
        crack_maps_dir.mkdir()
        output_dir.mkdir()
        
        # Create test images
        print("Creating test images with damage patterns...")
        damaged_img, crack_binary = create_test_images_with_damage()
        
        # Save test images
        cv2.imwrite(str(damaged_dir / "frame_0000.png"), damaged_img)
        cv2.imwrite(str(crack_maps_dir / "crack_binary_0000.png"), crack_binary)
        
        # Initialize classifier
        classifier = DamageClassifier(
            str(damaged_dir),
            str(crack_maps_dir),
            str(output_dir)
        )
        
        # Test individual detection methods
        print("\nTesting individual detection methods:")
        
        # Test texture roughness
        roughness = classifier.analyze_texture_roughness(damaged_img)
        print(f"  Texture roughness: {roughness:.3f}")
        assert 0 <= roughness <= 1, "Roughness should be normalized to 0-1"
        
        # Test circular pattern detection
        num_circular, avg_circularity = classifier.detect_circular_patterns(crack_binary)
        print(f"  Circular patterns: {num_circular}, avg circularity: {avg_circularity:.3f}")
        assert num_circular >= 0, "Number of circular patterns should be non-negative"
        
        # Test linear crack detection
        num_linear, linearity = classifier.detect_linear_cracks(crack_binary)
        print(f"  Linear cracks: {num_linear}, linearity: {linearity:.3f}")
        assert num_linear >= 0, "Number of linear cracks should be non-negative"
        
        # Test fine crack network detection
        fine_density = classifier.detect_fine_crack_network(crack_binary)
        print(f"  Fine crack density: {fine_density:.4f}")
        assert 0 <= fine_density <= 1, "Fine crack density should be normalized to 0-1"
        
        # Test large chunk detection
        num_chunks = classifier.detect_large_missing_chunks(crack_binary, damaged_img)
        print(f"  Large chunks: {num_chunks}")
        assert num_chunks >= 0, "Number of chunks should be non-negative"
        
        # Test flat spot detection
        flat_spot_score = classifier.detect_flat_spot_pattern(damaged_img)
        print(f"  Flat spot score: {flat_spot_score:.3f}")
        assert 0 <= flat_spot_score <= 1, "Flat spot score should be normalized to 0-1"
        
        # Test damage classification
        print("\nTesting damage classification:")
        damage_types = classifier.classify_damage(damaged_img, crack_binary)
        print(f"  Detected damage types: {[dt.value for dt in damage_types]}")
        assert isinstance(damage_types, list), "Damage types should be a list"
        
        # Test full video analysis
        print("\nTesting full video analysis:")
        results = classifier.analyze_video_damage_classification()
        
        print(f"  Frames analyzed: {results['total_frames_analyzed']}")
        print(f"  Detected damage types: {results['detected_damage_types']}")
        print(f"  Damage type counts: {results['damage_type_frame_counts']}")
        
        assert results['total_frames_analyzed'] == 1, "Should analyze 1 frame"
        assert 'detected_damage_types' in results, "Results should contain detected damage types"
        assert 'damage_type_frame_counts' in results, "Results should contain damage type counts"
        
        # Verify output files
        results_file = output_dir / "damage_classification_results.json"
        assert results_file.exists(), "Results JSON file should be created"
        
        print("\n✓ All DamageClassifier tests passed!")
        return True
        
    return False


def test_convenience_function():
    """Test the convenience function."""
    print("\nTesting convenience function classify_tyre_damage()...")
    
    # Create temporary directories
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        damaged_dir = temp_path / "damaged_frames"
        crack_maps_dir = temp_path / "crack_maps"
        output_dir = temp_path / "output"
        
        damaged_dir.mkdir()
        crack_maps_dir.mkdir()
        
        # Create test images
        damaged_img, crack_binary = create_test_images_with_damage()
        cv2.imwrite(str(damaged_dir / "frame_0000.png"), damaged_img)
        cv2.imwrite(str(crack_maps_dir / "crack_binary_0000.png"), crack_binary)
        
        # Run convenience function
        results = classify_tyre_damage(
            str(damaged_dir),
            str(crack_maps_dir),
            str(output_dir)
        )
        
        print(f"  Detected damage types: {results['detected_damage_types']}")
        
        assert 'detected_damage_types' in results, "Results should contain detected damage types"
        assert isinstance(results['detected_damage_types'], list), "Damage types should be a list"
        
        print("\n✓ Convenience function test passed!")
        return True
        
    return False


if __name__ == "__main__":
    test_damage_classifier()
    test_convenience_function()
    
    print("\n🎉 All tests completed successfully!")
