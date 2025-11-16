"""
Integration test for CV engine modules.
Tests crack detection, depth estimation, damage classification, and severity calculation together.
"""

import cv2
import numpy as np
import tempfile
import shutil
from pathlib import Path
from crack_detector import detect_tyre_cracks
from depth_estimator import estimate_tyre_depth
from damage_classifier import classify_tyre_damage
from severity_calculator import calculate_severity_score


def create_test_frames():
    """Create synthetic test frames for integration testing."""
    # Create reference frame (pristine tyre)
    reference = np.zeros((512, 512, 3), dtype=np.uint8)
    reference[:] = (100, 100, 100)
    cv2.circle(reference, (256, 256), 200, (120, 120, 120), -1)
    
    # Create damaged frame with various damage patterns
    damaged = reference.copy()
    
    # Add cracks
    cv2.line(damaged, (200, 150), (210, 350), (80, 80, 80), 3)
    cv2.line(damaged, (150, 250), (350, 260), (75, 75, 75), 3)
    cv2.line(damaged, (280, 180), (320, 320), (70, 70, 70), 2)
    
    # Add circular patterns (blistering)
    cv2.circle(damaged, (180, 180), 15, (90, 90, 90), -1)
    cv2.circle(damaged, (330, 300), 12, (85, 85, 85), -1)
    
    # Add texture noise (grain)
    noise = np.random.randint(-30, 30, damaged.shape, dtype=np.int16)
    damaged = np.clip(damaged.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    return reference, damaged


def test_cv_engine_integration():
    """Test the complete CV engine pipeline."""
    print("=" * 70)
    print("CV Engine Integration Test")
    print("=" * 70)
    
    # Create temporary directories
    temp_dir = Path(tempfile.mkdtemp())
    ref_dir = temp_dir / "reference"
    dam_dir = temp_dir / "damaged"
    crack_out = temp_dir / "crack_output"
    depth_out = temp_dir / "depth_output"
    damage_out = temp_dir / "damage_output"
    severity_out = temp_dir / "severity_output"
    
    ref_dir.mkdir()
    dam_dir.mkdir()
    
    try:
        # Create test frames
        print("\n1. Creating test frames...")
        reference, damaged = create_test_frames()
        
        # Save multiple frames
        for i in range(3):
            cv2.imwrite(str(ref_dir / f"frame_{i:04d}.png"), reference)
            cv2.imwrite(str(dam_dir / f"frame_{i:04d}.png"), damaged)
        
        print("   ✓ Created 3 reference and 3 damaged frames")
        
        # Test crack detection
        print("\n2. Testing crack detection...")
        crack_results = detect_tyre_cracks(
            str(ref_dir),
            str(dam_dir),
            str(crack_out)
        )
        
        assert crack_results['total_frames_analyzed'] == 3
        assert crack_results['total_crack_count'] >= 0
        assert 'average_crack_density' in crack_results
        print(f"   ✓ Detected {crack_results['total_crack_count']} total cracks")
        print(f"   ✓ Average crack density: {crack_results['average_crack_density']:.2f}%")
        
        # Test depth estimation
        print("\n3. Testing depth estimation...")
        depth_results = estimate_tyre_depth(
            str(ref_dir),
            str(dam_dir),
            str(depth_out)
        )
        
        assert depth_results['total_frames_analyzed'] == 3
        assert depth_results['max_depth_estimate_mm'] > 0
        print(f"   ✓ Max depth estimate: {depth_results['max_depth_estimate_mm']:.2f} mm")
        print(f"   ✓ Average max depth: {depth_results['average_max_depth_mm']:.2f} mm")
        
        # Test damage classification
        print("\n4. Testing damage classification...")
        damage_results = classify_tyre_damage(
            str(dam_dir),
            str(crack_out / "crack_maps"),
            str(damage_out)
        )
        
        assert damage_results['total_frames_analyzed'] == 3
        assert 'detected_damage_types' in damage_results
        print(f"   ✓ Detected damage types: {damage_results['detected_damage_types']}")
        
        # Test severity calculation
        print("\n5. Testing severity calculation...")
        severity_results = calculate_severity_score(
            crack_results,
            depth_results,
            damage_results,
            str(severity_out)
        )
        
        assert 'overall_severity_score' in severity_results
        assert 'recommended_action' in severity_results
        assert 'severity_timeline' in severity_results
        assert len(severity_results['severity_timeline']) == 3
        
        print(f"   ✓ Overall severity score: {severity_results['overall_severity_score']:.1f}/100")
        print(f"   ✓ Recommended action: {severity_results['recommended_action']}")
        print(f"   ✓ Timeline points: {len(severity_results['severity_timeline'])}")
        
        # Verify component scores
        print("\n6. Verifying component scores...")
        components = severity_results['component_scores']
        assert 'crack_density_score' in components
        assert 'depth_score' in components
        assert 'damage_type_score' in components
        
        print(f"   ✓ Crack density score: {components['crack_density_score']:.1f}/100")
        print(f"   ✓ Depth score: {components['depth_score']:.1f}/100")
        print(f"   ✓ Damage type score: {components['damage_type_score']:.1f}/100")
        
        # Verify output files
        print("\n7. Verifying output files...")
        assert (crack_out / "crack_analysis_results.json").exists()
        assert (crack_out / "composite_crack_map.png").exists()
        assert (depth_out / "depth_analysis_results.json").exists()
        assert (depth_out / "composite_depth_map.png").exists()
        assert (damage_out / "damage_classification_results.json").exists()
        assert (severity_out / "severity_analysis_results.json").exists()
        
        print("   ✓ All output files created successfully")
        
        # Test severity score ranges
        print("\n8. Testing severity score logic...")
        score = severity_results['overall_severity_score']
        action = severity_results['recommended_action']
        
        if score > 80:
            assert action == 'replace-immediately'
        elif score >= 50:
            assert action == 'monitor-next-stint'
        else:
            assert action == 'safe-qualifying-only'
        
        print(f"   ✓ Severity score {score:.1f} correctly maps to '{action}'")
        
        print("\n" + "=" * 70)
        print("✅ All CV engine integration tests passed!")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir)
        print(f"\nCleaned up temporary directory: {temp_dir}")


if __name__ == "__main__":
    import sys
    success = test_cv_engine_integration()
    sys.exit(0 if success else 1)
