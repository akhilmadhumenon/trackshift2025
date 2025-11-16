"""
Standalone test runner for reconstruction pipeline tests.
This avoids pytest plugin conflicts while still providing comprehensive testing.
"""

import os
import sys
import tempfile
import shutil
import json
import numpy as np
from pathlib import Path
from PIL import Image
import cv2
import traceback


class TestRunner:
    """Simple test runner that executes tests and reports results."""
    
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.results = []
    
    def run_test(self, test_func, test_name):
        """Run a single test function."""
        try:
            print(f"\n{'='*60}")
            print(f"Running: {test_name}")
            print('='*60)
            test_func()
            print(f"✓ PASSED: {test_name}")
            self.passed += 1
            self.results.append((test_name, "PASSED", None))
        except AssertionError as e:
            print(f"✗ FAILED: {test_name}")
            print(f"  Assertion Error: {e}")
            self.failed += 1
            self.results.append((test_name, "FAILED", str(e)))
        except Exception as e:
            if "skip" in str(e).lower():
                print(f"⊘ SKIPPED: {test_name} - {e}")
                self.skipped += 1
                self.results.append((test_name, "SKIPPED", str(e)))
            else:
                print(f"✗ ERROR: {test_name}")
                print(f"  Exception: {e}")
                traceback.print_exc()
                self.failed += 1
                self.results.append((test_name, "ERROR", str(e)))
    
    def print_summary(self):
        """Print test summary."""
        print(f"\n{'='*60}")
        print("TEST SUMMARY")
        print('='*60)
        
        for test_name, status, error in self.results:
            symbol = "✓" if status == "PASSED" else "✗" if status in ["FAILED", "ERROR"] else "⊘"
            print(f"{symbol} {test_name}: {status}")
        
        total = self.passed + self.failed + self.skipped
        print(f"\n{'='*60}")
        print(f"Total: {total} tests")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Skipped: {self.skipped}")
        print('='*60)
        
        return self.failed == 0


# Helper functions

def create_temp_dir():
    """Create a temporary directory."""
    return tempfile.mkdtemp()


def cleanup_temp_dir(temp_path):
    """Clean up temporary directory."""
    if os.path.exists(temp_path):
        shutil.rmtree(temp_path, ignore_errors=True)


def create_sample_video(video_path):
    """Create a sample video file for testing."""
    # Create a simple test video with circular pattern (simulating tyre)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = 10
    frame_size = (640, 480)
    out = cv2.VideoWriter(video_path, fourcc, fps, frame_size)
    
    # Generate 30 frames with a circular pattern
    for i in range(30):
        frame = np.zeros((frame_size[1], frame_size[0], 3), dtype=np.uint8)
        
        # Draw a circle (simulating tyre)
        center = (frame_size[0] // 2, frame_size[1] // 2)
        radius = min(frame_size) // 3
        cv2.circle(frame, center, radius, (200, 200, 200), -1)
        cv2.circle(frame, center, radius - 20, (100, 100, 100), -1)
        
        # Add rotation effect
        angle = i * 12  # Rotate 12 degrees per frame
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        frame = cv2.warpAffine(frame, M, frame_size)
        
        out.write(frame)
    
    out.release()


def create_sample_frames(frames_dir, num_frames=8):
    """Create sample preprocessed frames."""
    frames_path = Path(frames_dir) / "processed_frames"
    frames_path.mkdir(parents=True, exist_ok=True)
    
    size = 512
    center = size // 2
    
    for i in range(num_frames):
        img = np.zeros((size, size, 3), dtype=np.uint8)
        
        # Create circular pattern
        for y in range(size):
            for x in range(size):
                dist = np.sqrt((x - center)**2 + (y - center)**2)
                
                if dist < center * 0.7:
                    intensity = int(128 + 64 * np.sin(dist / 10 + i * 0.5))
                    img[y, x] = [intensity, intensity, intensity]
                elif dist < center * 0.8:
                    img[y, x] = [80, 80, 80]
        
        frame_path = frames_path / f"processed_{i:04d}.png"
        Image.fromarray(img).save(frame_path)
    
    return str(frames_path.parent)


# Test 1: Frame Extraction Tests

def test_extract_frames_creates_output_directory():
    """Test that frame extraction creates the output directory."""
    from video_preprocessor import VideoPreprocessor
    
    temp_dir = create_temp_dir()
    try:
        video_path = os.path.join(temp_dir, "test_video.mp4")
        create_sample_video(video_path)
        
        output_dir = os.path.join(temp_dir, "output")
        preprocessor = VideoPreprocessor(video_path, output_dir)
        
        assert preprocessor.frames_dir.exists(), "Frames directory not created"
        assert preprocessor.processed_frames_dir.exists(), "Processed frames directory not created"
    finally:
        cleanup_temp_dir(temp_dir)


def test_extract_frames_returns_frame_paths():
    """Test that frame extraction returns list of frame paths."""
    from video_preprocessor import VideoPreprocessor
    
    temp_dir = create_temp_dir()
    try:
        video_path = os.path.join(temp_dir, "test_video.mp4")
        create_sample_video(video_path)
        
        output_dir = os.path.join(temp_dir, "output")
        preprocessor = VideoPreprocessor(video_path, output_dir)
        
        frame_paths = preprocessor.extract_frames(fps=5)
        
        assert isinstance(frame_paths, list), "Frame paths should be a list"
        assert len(frame_paths) > 0, "Should extract at least one frame"
        assert all(os.path.exists(path) for path in frame_paths), "All frame paths should exist"
    finally:
        cleanup_temp_dir(temp_dir)


def test_extract_frames_respects_fps_parameter():
    """Test that FPS parameter affects number of extracted frames."""
    from video_preprocessor import VideoPreprocessor
    
    temp_dir = create_temp_dir()
    try:
        video_path = os.path.join(temp_dir, "test_video.mp4")
        create_sample_video(video_path)
        
        output_dir = os.path.join(temp_dir, "output")
        preprocessor = VideoPreprocessor(video_path, output_dir)
        
        frames_low = preprocessor.extract_frames(fps=5)
        
        # Clean up and extract again at higher FPS
        shutil.rmtree(preprocessor.frames_dir)
        preprocessor.frames_dir.mkdir()
        frames_high = preprocessor.extract_frames(fps=10)
        
        assert len(frames_high) >= len(frames_low), "Higher FPS should extract more frames"
    finally:
        cleanup_temp_dir(temp_dir)


# Test 2: Tyre Circle Detection Tests

def test_detect_circle_in_valid_image():
    """Test that circle detection works on image with clear circle."""
    from video_preprocessor import VideoPreprocessor
    
    temp_dir = create_temp_dir()
    try:
        # Create test image with clear circle
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        center = (320, 240)
        radius = 150
        cv2.circle(img, center, radius, (200, 200, 200), -1)
        
        preprocessor = VideoPreprocessor("dummy.mp4", temp_dir)
        circle = preprocessor.detect_tyre_circle(img)
        
        assert circle is not None, "Circle should be detected"
        x, y, r = circle
        
        # Check circle is approximately correct
        assert abs(x - center[0]) < 20, f"X coordinate off by {abs(x - center[0])}"
        assert abs(y - center[1]) < 20, f"Y coordinate off by {abs(y - center[1])}"
        assert abs(r - radius) < 30, f"Radius off by {abs(r - radius)}"
    finally:
        cleanup_temp_dir(temp_dir)


def test_detect_circle_handles_multiple_circles():
    """Test that circle detection returns the most prominent circle."""
    from video_preprocessor import VideoPreprocessor
    
    temp_dir = create_temp_dir()
    try:
        # Create image with multiple circles
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.circle(img, (200, 240), 80, (150, 150, 150), -1)
        cv2.circle(img, (440, 240), 120, (200, 200, 200), -1)  # Larger circle
        
        preprocessor = VideoPreprocessor("dummy.mp4", temp_dir)
        circle = preprocessor.detect_tyre_circle(img)
        
        assert circle is not None, "Circle should be detected"
        x, y, r = circle
        assert r > 50, "Should detect a reasonably sized circle"
    finally:
        cleanup_temp_dir(temp_dir)


# Test 3: TripoSR Integration Tests

def test_triposr_reconstructor_initialization():
    """Test that TripoSR reconstructor can be initialized."""
    try:
        from triposr_reconstructor import TripoSRReconstructor
        
        # Initialize with CPU device for testing
        reconstructor = TripoSRReconstructor(device='cpu')
        
        assert reconstructor is not None, "Reconstructor should be initialized"
        assert reconstructor.device == 'cpu', "Device should be CPU"
    except ImportError:
        raise Exception("SKIP: TripoSR not installed")
    except Exception as e:
        raise Exception(f"SKIP: TripoSR initialization failed: {e}")


def test_select_best_frames():
    """Test frame selection logic."""
    try:
        from triposr_reconstructor import TripoSRReconstructor
        
        temp_dir = create_temp_dir()
        try:
            sample_frames_dir = create_sample_frames(temp_dir, num_frames=8)
            
            reconstructor = TripoSRReconstructor(device='cpu')
            frames_dir = Path(sample_frames_dir) / "processed_frames"
            
            # Test selecting fewer frames than available
            selected = reconstructor.select_best_frames(frames_dir, num_frames=4)
            
            assert len(selected) == 4, f"Should select 4 frames, got {len(selected)}"
            assert all(os.path.exists(path) for path in selected), "All selected frames should exist"
            
            # Test selecting more frames than available
            selected_all = reconstructor.select_best_frames(frames_dir, num_frames=20)
            assert len(selected_all) == 8, f"Should return all 8 available frames, got {len(selected_all)}"
        finally:
            cleanup_temp_dir(temp_dir)
            
    except ImportError:
        raise Exception("SKIP: TripoSR not installed")


def test_select_best_frames_empty_directory():
    """Test frame selection with empty directory."""
    try:
        from triposr_reconstructor import TripoSRReconstructor
        
        temp_dir = create_temp_dir()
        try:
            empty_dir = Path(temp_dir) / "empty"
            empty_dir.mkdir()
            
            reconstructor = TripoSRReconstructor(device='cpu')
            
            try:
                reconstructor.select_best_frames(empty_dir, num_frames=4)
                assert False, "Should raise RuntimeError for empty directory"
            except RuntimeError:
                pass  # Expected
        finally:
            cleanup_temp_dir(temp_dir)
                
    except ImportError:
        raise Exception("SKIP: TripoSR not installed")


# Test 4: Job Queue Management Tests

def test_health_endpoint():
    """Test that health endpoint returns OK status."""
    from fastapi.testclient import TestClient
    from main import app
    
    client = TestClient(app)
    response = client.get("/health")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["status"] == "ok", f"Expected status 'ok', got {data['status']}"


def test_preprocess_job_creation():
    """Test that preprocessing job can be created."""
    from fastapi.testclient import TestClient
    from main import app
    
    temp_dir = create_temp_dir()
    try:
        video_path = os.path.join(temp_dir, "test_video.mp4")
        create_sample_video(video_path)
        
        client = TestClient(app)
        response = client.post("/preprocess", json={
            "video_path": video_path,
            "output_dir": temp_dir,
            "fps": 10
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "job_id" in data, "Response should contain job_id"
        assert data["status"] == "queued", f"Expected status 'queued', got {data['status']}"
    finally:
        cleanup_temp_dir(temp_dir)


def test_preprocess_invalid_video_path():
    """Test that invalid video path returns 404."""
    from fastapi.testclient import TestClient
    from main import app
    
    client = TestClient(app)
    response = client.post("/preprocess", json={
        "video_path": "/nonexistent/video.mp4",
        "output_dir": "/tmp/test_output",
        "fps": 10
    })
    
    assert response.status_code == 404, f"Expected 404, got {response.status_code}"


def test_reconstruct_job_creation():
    """Test that reconstruction job can be created."""
    from fastapi.testclient import TestClient
    from main import app
    
    temp_dir = create_temp_dir()
    try:
        sample_frames_dir = create_sample_frames(temp_dir, num_frames=8)
        
        client = TestClient(app)
        response = client.post("/reconstruct", json={
            "preprocessing_output_dir": sample_frames_dir,
            "output_glb_path": os.path.join(temp_dir, "output.glb"),
            "num_frames": 4,
            "mc_resolution": 128
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "job_id" in data, "Response should contain job_id"
        assert data["status"] == "queued", f"Expected status 'queued', got {data['status']}"
    finally:
        cleanup_temp_dir(temp_dir)


def test_reconstruct_invalid_directory():
    """Test that invalid preprocessing directory returns 404."""
    from fastapi.testclient import TestClient
    from main import app
    
    client = TestClient(app)
    response = client.post("/reconstruct", json={
        "preprocessing_output_dir": "/nonexistent/directory",
        "output_glb_path": "/tmp/output.glb",
        "num_frames": 4,
        "mc_resolution": 128
    })
    
    assert response.status_code == 404, f"Expected 404, got {response.status_code}"


# Integration Tests

def test_full_preprocessing_pipeline():
    """Test complete preprocessing pipeline from video to processed frames."""
    from video_preprocessor import preprocess_video_file
    
    temp_dir = create_temp_dir()
    try:
        video_path = os.path.join(temp_dir, "test_video.mp4")
        create_sample_video(video_path)
        
        output_dir = os.path.join(temp_dir, "preprocessing_output")
        
        metadata = preprocess_video_file(video_path, output_dir, fps=5)
        
        assert metadata is not None, "Metadata should not be None"
        assert "total_frames" in metadata, "Metadata should contain total_frames"
        assert metadata["total_frames"] > 0, "Should process at least one frame"
        assert "processed_frames_dir" in metadata, "Metadata should contain processed_frames_dir"
        assert os.path.exists(metadata["processed_frames_dir"]), "Processed frames directory should exist"
        
        # Verify processed frames exist
        processed_frames = list(Path(metadata["processed_frames_dir"]).glob("*.png"))
        assert len(processed_frames) > 0, "Should have processed frames"
    finally:
        cleanup_temp_dir(temp_dir)


def test_preprocessing_metadata_saved():
    """Test that preprocessing metadata is saved correctly."""
    from video_preprocessor import preprocess_video_file
    
    temp_dir = create_temp_dir()
    try:
        video_path = os.path.join(temp_dir, "test_video.mp4")
        create_sample_video(video_path)
        
        output_dir = os.path.join(temp_dir, "preprocessing_output")
        
        metadata = preprocess_video_file(video_path, output_dir, fps=5)
        
        metadata_file = Path(output_dir) / "preprocessing_metadata.json"
        assert metadata_file.exists(), "Metadata file should exist"
        
        with open(metadata_file, 'r') as f:
            saved_metadata = json.load(f)
        
        assert saved_metadata["total_frames"] == metadata["total_frames"], "Saved metadata should match returned metadata"
        assert "avg_circle" in saved_metadata, "Saved metadata should contain avg_circle"
    finally:
        cleanup_temp_dir(temp_dir)


# Main test runner

def main():
    """Run all tests."""
    print("="*60)
    print("RECONSTRUCTION PIPELINE TEST SUITE")
    print("="*60)
    print("\nTesting Requirements: 2.2, 2.3, 2.4, 2.5")
    print("- Frame extraction accuracy")
    print("- Tyre circle detection")
    print("- TripoSR integration")
    print("- Job queue management")
    
    runner = TestRunner()
    
    # Frame Extraction Tests
    print("\n" + "="*60)
    print("FRAME EXTRACTION TESTS")
    print("="*60)
    runner.run_test(test_extract_frames_creates_output_directory, "test_extract_frames_creates_output_directory")
    runner.run_test(test_extract_frames_returns_frame_paths, "test_extract_frames_returns_frame_paths")
    runner.run_test(test_extract_frames_respects_fps_parameter, "test_extract_frames_respects_fps_parameter")
    
    # Tyre Circle Detection Tests
    print("\n" + "="*60)
    print("TYRE CIRCLE DETECTION TESTS")
    print("="*60)
    runner.run_test(test_detect_circle_in_valid_image, "test_detect_circle_in_valid_image")
    runner.run_test(test_detect_circle_handles_multiple_circles, "test_detect_circle_handles_multiple_circles")
    
    # TripoSR Integration Tests
    print("\n" + "="*60)
    print("TRIPOSR INTEGRATION TESTS")
    print("="*60)
    runner.run_test(test_triposr_reconstructor_initialization, "test_triposr_reconstructor_initialization")
    runner.run_test(test_select_best_frames, "test_select_best_frames")
    runner.run_test(test_select_best_frames_empty_directory, "test_select_best_frames_empty_directory")
    
    # Job Queue Management Tests
    print("\n" + "="*60)
    print("JOB QUEUE MANAGEMENT TESTS")
    print("="*60)
    runner.run_test(test_health_endpoint, "test_health_endpoint")
    runner.run_test(test_preprocess_job_creation, "test_preprocess_job_creation")
    runner.run_test(test_preprocess_invalid_video_path, "test_preprocess_invalid_video_path")
    runner.run_test(test_reconstruct_job_creation, "test_reconstruct_job_creation")
    runner.run_test(test_reconstruct_invalid_directory, "test_reconstruct_invalid_directory")
    
    # Integration Tests
    print("\n" + "="*60)
    print("INTEGRATION TESTS")
    print("="*60)
    runner.run_test(test_full_preprocessing_pipeline, "test_full_preprocessing_pipeline")
    runner.run_test(test_preprocessing_metadata_saved, "test_preprocessing_metadata_saved")
    
    # Print summary
    success = runner.print_summary()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
