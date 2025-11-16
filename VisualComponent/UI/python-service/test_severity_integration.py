"""
Integration test for severity calculation with realistic data flow.
Demonstrates the complete workflow from analysis results to severity score.
"""

import json
import tempfile
from pathlib import Path
from severity_calculator import calculate_severity_score


def create_realistic_crack_results():
    """Create realistic crack detection results for a damaged tyre."""
    return {
        'total_frames_analyzed': 36,
        'total_crack_count': 142,
        'average_crack_count_per_frame': 3.94,
        'average_crack_density': 3.2,
        'composite_crack_map_path': '/path/to/composite_crack_map.png',
        'frame_results': [
            {
                'frame_index': i,
                'crack_count': 3 + (i % 5),
                'crack_density': 2.8 + (i % 8) * 0.3,
                'crack_map_path': f'/path/to/crack_map_{i:04d}.png',
                'crack_binary_path': f'/path/to/crack_binary_{i:04d}.png'
            }
            for i in range(36)
        ]
    }


def create_realistic_depth_results():
    """Create realistic depth estimation results."""
    return {
        'total_frames_analyzed': 36,
        'max_depth_estimate_mm': 4.2,
        'average_max_depth_mm': 3.1,
        'composite_depth_map_path': '/path/to/composite_depth_map.png',
        'frame_results': [
            {
                'frame_index': i,
                'max_depth_mm': 2.8 + (i % 10) * 0.25,
                'mean_depth_mm': 1.5 + (i % 10) * 0.15,
                'std_depth': 0.3 + (i % 5) * 0.05,
                'depth_map_path': f'/path/to/depth_map_{i:04d}.png',
                'depth_raw_path': f'/path/to/depth_raw_{i:04d}.npy'
            }
            for i in range(36)
        ]
    }


def create_realistic_damage_results():
    """Create realistic damage classification results."""
    return {
        'total_frames_analyzed': 36,
        'detected_damage_types': ['micro-cracks', 'grain', 'cuts', 'blistering'],
        'damage_type_frame_counts': {
            'blistering': 8,
            'micro-cracks': 28,
            'grain': 22,
            'cuts': 12,
            'flat-spots': 3,
            'chunking': 1
        },
        'frame_results': [
            {
                'frame_index': i,
                'damage_types': _get_damage_types_for_frame(i),
                'num_damage_types': len(_get_damage_types_for_frame(i))
            }
            for i in range(36)
        ]
    }


def _get_damage_types_for_frame(frame_index):
    """Helper to generate realistic damage types per frame."""
    # Simulate varying damage patterns around the tyre
    damage_types = []
    
    # Most frames have micro-cracks
    if frame_index % 3 != 0:
        damage_types.append('micro-cracks')
    
    # Grain appears in clusters
    if 10 <= frame_index <= 25:
        damage_types.append('grain')
    
    # Cuts appear sporadically
    if frame_index % 5 == 0:
        damage_types.append('cuts')
    
    # Blistering in specific regions
    if 5 <= frame_index <= 12:
        damage_types.append('blistering')
    
    # Rare flat spots
    if frame_index in [15, 28]:
        damage_types.append('flat-spots')
    
    # Very rare chunking
    if frame_index == 20:
        damage_types.append('chunking')
    
    return damage_types


def test_realistic_severity_calculation():
    """Test severity calculation with realistic data."""
    print("=" * 70)
    print("Integration Test: Realistic Severity Calculation")
    print("=" * 70)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create realistic analysis results
        crack_results = create_realistic_crack_results()
        depth_results = create_realistic_depth_results()
        damage_results = create_realistic_damage_results()
        
        print("\nInput Metrics:")
        print(f"  Average Crack Density: {crack_results['average_crack_density']:.2f}%")
        print(f"  Max Depth Estimate: {depth_results['max_depth_estimate_mm']:.2f} mm")
        print(f"  Detected Damage Types: {', '.join(damage_results['detected_damage_types'])}")
        
        # Calculate severity
        print("\nCalculating severity score...")
        analysis = calculate_severity_score(
            crack_results,
            depth_results,
            damage_results,
            temp_dir
        )
        
        # Display results
        print("\n" + "=" * 70)
        print("Severity Analysis Results")
        print("=" * 70)
        
        print(f"\nOverall Severity Score: {analysis['overall_severity_score']:.1f}/100")
        
        print("\nComponent Scores:")
        print(f"  Crack Density Score: {analysis['component_scores']['crack_density_score']:.1f}/100")
        print(f"  Depth Score: {analysis['component_scores']['depth_score']:.1f}/100")
        print(f"  Damage Type Score: {analysis['component_scores']['damage_type_score']:.1f}/100")
        
        print("\nTimeline Statistics:")
        print(f"  Max Severity: {analysis['timeline_statistics']['max_severity']:.1f}/100")
        print(f"  Min Severity: {analysis['timeline_statistics']['min_severity']:.1f}/100")
        print(f"  Average Severity: {analysis['timeline_statistics']['average_severity']:.1f}/100")
        
        print(f"\nTimeline Points: {len(analysis['severity_timeline'])} frames")
        
        # Show sample timeline points
        print("\nSample Timeline Points:")
        for i in [0, 9, 18, 27, 35]:
            point = analysis['severity_timeline'][i]
            print(f"  Frame {i:2d} (Angle {point['rotation_angle']:6.1f}°): "
                  f"Severity {point['severity']:5.1f}/100")
        
        # Verify results file
        results_file = Path(temp_dir) / "severity_analysis_results.json"
        assert results_file.exists(), "Results file should be created"
        
        with open(results_file, 'r') as f:
            saved_data = json.load(f)
            assert saved_data['overall_severity_score'] == analysis['overall_severity_score']
        
        print("\n✓ Results file saved successfully")
        
        # Validate severity score is reasonable
        assert 0 <= analysis['overall_severity_score'] <= 100
        assert analysis['overall_severity_score'] > 50  # Should be moderate-high for this data
        
        print("\n" + "=" * 70)
        print("Integration Test Passed! ✓")
        print("=" * 70)


def test_severity_interpretation():
    """Test severity score interpretation for different scenarios."""
    print("\n" + "=" * 70)
    print("Severity Score Interpretation Test")
    print("=" * 70)
    
    scenarios = [
        {
            'name': 'Minor Damage',
            'crack_density': 1.0,
            'depth_mm': 0.8,
            'damage_types': ['grain'],
            'expected_range': (0, 30)
        },
        {
            'name': 'Moderate Damage',
            'crack_density': 4.0,
            'depth_mm': 2.5,
            'damage_types': ['micro-cracks', 'grain'],
            'expected_range': (40, 70)
        },
        {
            'name': 'Severe Damage',
            'crack_density': 8.0,
            'depth_mm': 4.5,
            'damage_types': ['cuts', 'chunking', 'flat-spots'],
            'expected_range': (70, 100)
        }
    ]
    
    with tempfile.TemporaryDirectory() as temp_dir:
        for scenario in scenarios:
            # Create simple results for this scenario
            crack_results = {
                'average_crack_density': scenario['crack_density'],
                'frame_results': []
            }
            
            depth_results = {
                'max_depth_estimate_mm': scenario['depth_mm'],
                'frame_results': []
            }
            
            damage_results = {
                'detected_damage_types': scenario['damage_types'],
                'frame_results': []
            }
            
            analysis = calculate_severity_score(
                crack_results,
                depth_results,
                damage_results,
                temp_dir
            )
            
            score = analysis['overall_severity_score']
            min_expected, max_expected = scenario['expected_range']
            
            print(f"\n{scenario['name']}:")
            print(f"  Inputs: Crack Density={scenario['crack_density']:.1f}%, "
                  f"Depth={scenario['depth_mm']:.1f}mm, "
                  f"Types={scenario['damage_types']}")
            print(f"  Severity Score: {score:.1f}/100")
            print(f"  Expected Range: {min_expected}-{max_expected}")
            
            # Verify score is in expected range
            assert min_expected <= score <= max_expected, \
                f"Score {score} not in expected range [{min_expected}, {max_expected}]"
            
            print(f"  ✓ Score within expected range")
    
    print("\n" + "=" * 70)
    print("Interpretation Test Passed! ✓")
    print("=" * 70)


if __name__ == "__main__":
    test_realistic_severity_calculation()
    test_severity_interpretation()
    
    print("\n" + "=" * 70)
    print("All Integration Tests Passed! ✓")
    print("=" * 70)
