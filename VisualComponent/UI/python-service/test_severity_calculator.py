"""
Test script for severity calculator module.
"""

import json
import tempfile
from pathlib import Path
from severity_calculator import SeverityCalculator, calculate_severity_score


def create_mock_crack_results():
    """Create mock crack detection results."""
    return {
        'total_frames_analyzed': 10,
        'total_crack_count': 50,
        'average_crack_count_per_frame': 5.0,
        'average_crack_density': 2.5,
        'frame_results': [
            {
                'frame_index': i,
                'crack_count': 5 + i,
                'crack_density': 2.0 + (i * 0.3)
            }
            for i in range(10)
        ]
    }


def create_mock_depth_results():
    """Create mock depth estimation results."""
    return {
        'total_frames_analyzed': 10,
        'max_depth_estimate_mm': 3.5,
        'average_max_depth_mm': 2.8,
        'frame_results': [
            {
                'frame_index': i,
                'max_depth_mm': 2.5 + (i * 0.2),
                'mean_depth_mm': 1.5 + (i * 0.1)
            }
            for i in range(10)
        ]
    }


def create_mock_damage_results():
    """Create mock damage classification results."""
    return {
        'total_frames_analyzed': 10,
        'detected_damage_types': ['micro-cracks', 'grain', 'cuts'],
        'damage_type_frame_counts': {
            'blistering': 2,
            'micro-cracks': 8,
            'grain': 7,
            'cuts': 5,
            'flat-spots': 1,
            'chunking': 0
        },
        'frame_results': [
            {
                'frame_index': i,
                'damage_types': ['micro-cracks', 'grain'] if i % 2 == 0 else ['cuts'],
                'num_damage_types': 2 if i % 2 == 0 else 1
            }
            for i in range(10)
        ]
    }


def test_severity_calculator_initialization():
    """Test SeverityCalculator initialization."""
    print("Testing SeverityCalculator initialization...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        assert calculator.output_dir.exists()
        assert calculator.CRACK_DENSITY_WEIGHT == 0.40
        assert calculator.DEPTH_WEIGHT == 0.30
        assert calculator.DAMAGE_TYPE_WEIGHT == 0.30
        
    print("✓ Initialization test passed")


def test_normalize_crack_density():
    """Test crack density normalization."""
    print("Testing crack density normalization...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        # Test normal values
        assert calculator.normalize_crack_density(0.0) == 0.0
        assert calculator.normalize_crack_density(5.0) == 0.5
        assert calculator.normalize_crack_density(10.0) == 1.0
        
        # Test clamping
        assert calculator.normalize_crack_density(15.0) == 1.0
        
    print("✓ Crack density normalization test passed")


def test_normalize_depth():
    """Test depth normalization."""
    print("Testing depth normalization...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        # Test normal values
        assert calculator.normalize_depth(0.0) == 0.0
        assert calculator.normalize_depth(2.5) == 0.5
        assert calculator.normalize_depth(5.0) == 1.0
        
        # Test clamping
        assert calculator.normalize_depth(10.0) == 1.0
        
    print("✓ Depth normalization test passed")


def test_calculate_damage_type_severity():
    """Test damage type severity calculation."""
    print("Testing damage type severity calculation...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        # Test empty list
        assert calculator.calculate_damage_type_severity([]) == 0.0
        
        # Test single damage type
        assert calculator.calculate_damage_type_severity(['grain']) == 0.4
        assert calculator.calculate_damage_type_severity(['chunking']) == 1.0
        
        # Test multiple damage types (should return max)
        severity = calculator.calculate_damage_type_severity(['grain', 'cuts', 'micro-cracks'])
        assert severity == 0.8  # 'cuts' has highest severity
        
    print("✓ Damage type severity calculation test passed")


def test_calculate_severity_score():
    """Test overall severity score calculation."""
    print("Testing overall severity score calculation...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        # Test low severity
        score = calculator.calculate_severity_score(
            crack_density=1.0,
            depth_mm=0.5,
            damage_types=['grain']
        )
        assert 0 <= score <= 100
        assert score < 30  # Should be low severity
        
        # Test high severity
        score = calculator.calculate_severity_score(
            crack_density=8.0,
            depth_mm=4.5,
            damage_types=['chunking', 'cuts']
        )
        assert 0 <= score <= 100
        assert score > 70  # Should be high severity
        
        # Test medium severity
        score = calculator.calculate_severity_score(
            crack_density=3.0,
            depth_mm=2.0,
            damage_types=['micro-cracks']
        )
        assert 0 <= score <= 100
        assert 30 <= score <= 70  # Should be medium severity
        
    print("✓ Severity score calculation test passed")


def test_calculate_frame_severity():
    """Test frame severity calculation."""
    print("Testing frame severity calculation...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        result = calculator.calculate_frame_severity(
            crack_density=3.0,
            depth_mm=2.5,
            damage_types=['cuts', 'micro-cracks']
        )
        
        assert 'severity_score' in result
        assert 'crack_density_score' in result
        assert 'depth_score' in result
        assert 'damage_type_score' in result
        
        assert 0 <= result['severity_score'] <= 100
        assert 0 <= result['crack_density_score'] <= 100
        assert 0 <= result['depth_score'] <= 100
        assert 0 <= result['damage_type_score'] <= 100
        
    print("✓ Frame severity calculation test passed")


def test_generate_severity_timeline():
    """Test severity timeline generation."""
    print("Testing severity timeline generation...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        crack_results = create_mock_crack_results()
        depth_results = create_mock_depth_results()
        damage_results = create_mock_damage_results()
        
        timeline = calculator.generate_severity_timeline(
            crack_results,
            depth_results,
            damage_results
        )
        
        assert len(timeline) == 10
        
        for i, point in enumerate(timeline):
            assert 'rotation_angle' in point
            assert 'severity' in point
            assert 'crack_density_score' in point
            assert 'depth_score' in point
            assert 'damage_type_score' in point
            
            # Check rotation angle is correct
            expected_angle = (i / 10) * 360.0
            assert abs(point['rotation_angle'] - expected_angle) < 0.01
            
            # Check severity is in valid range
            assert 0 <= point['severity'] <= 100
        
    print("✓ Severity timeline generation test passed")


def test_calculate_overall_severity():
    """Test overall severity calculation with full results."""
    print("Testing overall severity calculation...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        crack_results = create_mock_crack_results()
        depth_results = create_mock_depth_results()
        damage_results = create_mock_damage_results()
        
        analysis = calculator.calculate_overall_severity(
            crack_results,
            depth_results,
            damage_results
        )
        
        # Check structure
        assert 'overall_severity_score' in analysis
        assert 'component_scores' in analysis
        assert 'severity_timeline' in analysis
        assert 'timeline_statistics' in analysis
        assert 'input_metrics' in analysis
        
        # Check component scores
        assert 'crack_density_score' in analysis['component_scores']
        assert 'depth_score' in analysis['component_scores']
        assert 'damage_type_score' in analysis['component_scores']
        
        # Check timeline
        assert len(analysis['severity_timeline']) == 10
        
        # Check timeline statistics
        stats = analysis['timeline_statistics']
        assert 'max_severity' in stats
        assert 'min_severity' in stats
        assert 'average_severity' in stats
        
        # Check input metrics
        inputs = analysis['input_metrics']
        assert inputs['average_crack_density'] == 2.5
        assert inputs['max_depth_mm'] == 3.5
        assert 'micro-cracks' in inputs['damage_types']
        
        # Check results file was created
        results_file = Path(temp_dir) / "severity_analysis_results.json"
        assert results_file.exists()
        
        # Verify file contents
        with open(results_file, 'r') as f:
            saved_analysis = json.load(f)
            assert saved_analysis['overall_severity_score'] == analysis['overall_severity_score']
        
    print("✓ Overall severity calculation test passed")


def test_convenience_function():
    """Test the convenience function."""
    print("Testing convenience function...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        crack_results = create_mock_crack_results()
        depth_results = create_mock_depth_results()
        damage_results = create_mock_damage_results()
        
        analysis = calculate_severity_score(
            crack_results,
            depth_results,
            damage_results,
            temp_dir
        )
        
        assert 'overall_severity_score' in analysis
        assert 'severity_timeline' in analysis
        assert len(analysis['severity_timeline']) == 10
        
    print("✓ Convenience function test passed")


def test_severity_weights_sum_to_one():
    """Test that severity weights sum to 1.0."""
    print("Testing severity weights...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        total_weight = (
            calculator.CRACK_DENSITY_WEIGHT +
            calculator.DEPTH_WEIGHT +
            calculator.DAMAGE_TYPE_WEIGHT
        )
        
        assert abs(total_weight - 1.0) < 0.001
        
    print("✓ Severity weights test passed")


def test_get_recommended_action():
    """Test recommended action generation based on severity score."""
    print("Testing recommended action generation...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        # Test low severity (< 50) - safe for qualifying
        action = calculator.get_recommended_action(30.0)
        assert action == 'safe-qualifying-only'
        
        action = calculator.get_recommended_action(49.9)
        assert action == 'safe-qualifying-only'
        
        # Test medium severity (50-80) - monitor
        action = calculator.get_recommended_action(50.0)
        assert action == 'monitor-next-stint'
        
        action = calculator.get_recommended_action(65.0)
        assert action == 'monitor-next-stint'
        
        action = calculator.get_recommended_action(80.0)
        assert action == 'monitor-next-stint'
        
        # Test high severity (> 80) - replace immediately
        action = calculator.get_recommended_action(80.1)
        assert action == 'replace-immediately'
        
        action = calculator.get_recommended_action(95.0)
        assert action == 'replace-immediately'
        
        action = calculator.get_recommended_action(100.0)
        assert action == 'replace-immediately'
        
    print("✓ Recommended action generation test passed")


def test_recommended_action_in_overall_severity():
    """Test that recommended action is included in overall severity calculation."""
    print("Testing recommended action in overall severity...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        calculator = SeverityCalculator(temp_dir)
        
        crack_results = create_mock_crack_results()
        depth_results = create_mock_depth_results()
        damage_results = create_mock_damage_results()
        
        analysis = calculator.calculate_overall_severity(
            crack_results,
            depth_results,
            damage_results
        )
        
        # Check that recommended_action is present
        assert 'recommended_action' in analysis
        
        # Check that it's one of the valid actions
        valid_actions = ['replace-immediately', 'monitor-next-stint', 'safe-qualifying-only']
        assert analysis['recommended_action'] in valid_actions
        
        # Verify it matches the severity score
        severity = analysis['overall_severity_score']
        expected_action = calculator.get_recommended_action(severity)
        assert analysis['recommended_action'] == expected_action
        
    print("✓ Recommended action in overall severity test passed")


def run_all_tests():
    """Run all tests."""
    print("=" * 60)
    print("Running Severity Calculator Tests")
    print("=" * 60)
    
    test_severity_calculator_initialization()
    test_normalize_crack_density()
    test_normalize_depth()
    test_calculate_damage_type_severity()
    test_calculate_severity_score()
    test_calculate_frame_severity()
    test_generate_severity_timeline()
    test_calculate_overall_severity()
    test_convenience_function()
    test_severity_weights_sum_to_one()
    test_get_recommended_action()
    test_recommended_action_in_overall_severity()
    
    print("=" * 60)
    print("All tests passed! ✓")
    print("=" * 60)


if __name__ == "__main__":
    run_all_tests()
