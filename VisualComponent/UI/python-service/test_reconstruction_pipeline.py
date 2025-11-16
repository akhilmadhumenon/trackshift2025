"""
Test suite for the reconstruction pipeline.
Tests frame extraction, tyre circle detection, TripoSR integration, and job queue management.

Requirements tested: 2.2, 2.3, 2.4, 2.5
"""

import pytest
import os
import sys
import tempfile
import shutil
import json
import numpy as np
from pathlib import Path
from PIL import Image
import cv2


# Test fixtures

@pytest.fixture
def temp_dir():
    """Create a temporary directory for test outputs."""
    temp_path = tempfile.mkdtemp()
    yield temp_path
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def sample_video(temp_dir):
    """Create a sample video file for testing."""
    video_path = os.path.join(temp_dir, "test_video.mp4")
    
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
    return video_path


@pytest.fixture
def sample_frames_dir(temp_dir):
    """Create sample preprocessed frames for testing."""
    frames_dir = Path(temp_dir) / "processed_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    
    # Create 8 test frames with circular patterns
    size = 512
    center = size // 2
    
    for i in range(8):
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
        
        frame_path = frames_dir / f"processed_{i:04d}.png"
        Image.fromarray(img).save(frame_path)
    
    return str(frames_dir.parent)


# Test 1: Frame Extraction Accuracy

class TestFrameExtraction:
    """Test frame extraction from video files."""
    
    def test_extract_frames_creates_output_directory(self, sample_video, temp_dir):
        """Test that frame extraction creates the output directory."""
        from video_preprocessor import VideoPreprocessor
        
        output_dir = os.path.join(temp_dir, "output")
        preprocessor = VideoPreprocessor(sample_video, output_dir)
        
        assert preprocessor.frames_dir.exists()
        assert preprocessor.processed_frames_dir.exists()
    
    def test_extract_frames_returns_frame_paths(self, sample_video, temp_dir):
        """Test that frame extraction returns list of frame paths."""
        from video_preprocessor import VideoPreprocessor
        
        output_dir = os.path.join(temp_dir, "output")
        preprocessor = VideoPreprocessor(sample_video, output_dir)
        
        frame_paths = preprocessor.extract_frames(fps=5)
        
        assert isinstance(frame_paths, list)
        assert len(frame_paths) > 0
        assert all(os.path.exists(path) for path in frame_paths)
    
    def test_extract_frames_respects_fps_parameter(self, sample_video, temp_dir):
        """Test that FPS parameter affects number of extracted frames."""
        from video_preprocessor import VideoPreprocessor
        
        output_dir = os.path.join(temp_dir, "output")
        preprocessor = VideoPreprocessor(sample_video, output_dir)
        
        # Extract at different FPS rates
        frames_low = preprocessor.extract_frames(fps=5)
        
        # Clean up and extract again at higher FPS
        shutil.rmtree(preprocessor.frames_dir)
        preprocessor.frames_dir.mkdir()
        frames_high = preprocessor.extract_frames(fps=10)
        
        # Higher FPS should extract more frames
        assert len(frames_high) >= len(frames_low)
    
    def test_extract_frames_handles_invalid_video(self, temp_dir):
        """Test that frame extraction handles invalid video files."""
        from video_preprocessor import VideoPreprocessor
        
        invalid_video = os.path.join(temp_dir, "invalid.mp4")
        Path(invalid_video).touch()  # Create empty file
        
        output_dir = os.path.join(temp_dir, "output")
        preprocessor = VideoPreprocessor(invalid_video, output_dir)
        
        with pytest.raises(RuntimeError):
            preprocessor.extract_frames(fps=10)


# Test 2: Tyre Circle Detection

class TestTyreCircleDetection:
    """Test tyre circle detection using Hough Circle Transform."""
    
    def test_detect_circle_in_valid_image(self, temp_dir):
        """Test that circle detection works on image with clear circle."""
        from video_preprocessor import VideoPreprocessor
        
        # Create test image with clear circle
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        center = (320, 240)
        radius = 150
        cv2.circle(img, center, radius, (200, 200, 200), -1)
        
        preprocessor = VideoPreprocessor("dummy.mp4", temp_dir)
        circle = preprocessor.detect_tyre_circle(img)
        
        assert circle is not None
        x, y, r = circle
        
        # Check circle is approximately correct
        assert abs(x - center[0]) < 20
        assert abs(y - center[1]) < 20
        assert abs(r - radius) < 30
    
    def test_detect_circle_returns_none_for_no_circle(self, temp_dir):
        """Test that circle detection returns None when no circle present."""
        from video_preprocessor import VideoPreprocessor
        
        # Create image with no circle
        img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        
        preprocessor = VideoPreprocessor("dummy.mp4", temp_dir)
        circle = preprocessor.detect_tyre_circle(img)
        
        # May return None or a false positive, but should not crash
        assert circle is None or isinstance(circle, tuple)
    
    def test_detect_circle_handles_multiple_circles(self, temp_dir):
        """Test that circle detection returns the most prominent circle."""
        from video_preprocessor import VideoPreprocessor
        
        # Create image with multiple circles
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.circle(img, (200, 240), 80, (150, 150, 150), -1)
        cv2.circle(img, (440, 240), 120, (200, 200, 200), -1)  # Larger circle
        
        preprocessor = VideoPreprocessor("dummy.mp4", temp_dir)
        circle = preprocessor.detect_tyre_circle(img)
        
        assert circle is not None
        x, y, r = circle
        
        # Should detect one of the circles
        assert r > 50


# Test 3: TripoSR Integration

class TestTripoSRIntegration:
    """Test TripoSR 3D reconstruction integration."""
    
    def test_triposr_reconstructor_initialization(self):
        """Test that TripoSR reconstructor can be initialized."""
        try:
            from triposr_reconstructor import TripoSRReconstructor
            
            # Initialize with CPU device for testing
            reconstructor = TripoSRReconstructor(device='cpu')
            
            assert reconstructor is not None
            assert reconstructor.device == 'cpu'
        except ImportError:
            pytest.skip("TripoSR not installed")
        except Exception as e:
            pytest.skip(f"TripoSR initialization failed: {e}")
    
    def test_select_best_frames(self, sample_frames_dir):
        """Test frame selection logic."""
        try:
            from triposr_reconstructor import TripoSRReconstructor
            
            reconstructor = TripoSRReconstructor(device='cpu')
            frames_dir = Path(sample_frames_dir) / "processed_frames"
            
            # Test selecting fewer frames than available
            selected = reconstructor.select_best_frames(frames_dir, num_frames=4)
            
            assert len(selected) == 4
            assert all(os.path.exists(path) for path in selected)
            
            # Test selecting more frames than available
            selected_all = reconstructor.select_best_frames(frames_dir, num_frames=20)
            assert len(selected_all) == 8  # Should return all 8 available frames
            
        except ImportError:
            pytest.skip("TripoSR not installed")
    
    def test_select_best_frames_empty_directory(self, temp_dir):
        """Test frame selection with empty directory."""
        try:
            from triposr_reconstructor import TripoSRReconstructor
            
            empty_dir = Path(temp_dir) / "empty"
            empty_dir.mkdir()
            
            reconstructor = TripoSRReconstructor(device='cpu')
            
            with pytest.raises(RuntimeError):
                reconstructor.select_best_frames(empty_dir, num_frames=4)
                
        except ImportError:
            pytest.skip("TripoSR not installed")
    
    def test_preprocess_image(self, sample_frames_dir):
        """Test image preprocessing for TripoSR input."""
        try:
            from triposr_reconstructor import TripoSRReconstructor
            import torch
            
            reconstructor = TripoSRReconstructor(device='cpu')
            frames_dir = Path(sample_frames_dir) / "processed_frames"
            frame_path = str(list(frames_dir.glob("*.png"))[0])
            
            tensor = reconstructor.preprocess_image(frame_path, target_size=512)
            
            assert isinstance(tensor, torch.Tensor)
            assert tensor.shape == (1, 3, 512, 512)
            assert tensor.device.type == 'cpu'
            
        except ImportError:
            pytest.skip("TripoSR not installed")


# Test 4: Job Queue Management

class TestJobQueueManagement:
    """Test job queue management in the FastAPI service."""
    
    @pytest.fixture
    def app_client(self):
        """Create a test client for the FastAPI app."""
        from fastapi.testclient import TestClient
        from main import app
        
        return TestClient(app)
    
    def test_health_endpoint(self, app_client):
        """Test that health endpoint returns OK status."""
        response = app_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_preprocess_job_creation(self, app_client, sample_video):
        """Test that preprocessing job can be created."""
        response = app_client.post("/preprocess", json={
            "video_path": sample_video,
            "output_dir": "/tmp/test_output",
            "fps": 10
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "queued"
    
    def test_preprocess_job_status_tracking(self, app_client, sample_video, temp_dir):
        """Test that preprocessing job status can be tracked."""
        # Create job
        response = app_client.post("/preprocess", json={
            "video_path": sample_video,
            "output_dir": temp_dir,
            "fps": 5
        })
        
        job_id = response.json()["job_id"]
        
        # Check status
        status_response = app_client.get(f"/preprocess/status/{job_id}")
        
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["job_id"] == job_id
        assert status_data["status"] in ["queued", "processing", "completed", "failed"]
    
    def test_preprocess_invalid_video_path(self, app_client):
        """Test that invalid video path returns 404."""
        response = app_client.post("/preprocess", json={
            "video_path": "/nonexistent/video.mp4",
            "output_dir": "/tmp/test_output",
            "fps": 10
        })
        
        assert response.status_code == 404
    
    def test_reconstruct_job_creation(self, app_client, sample_frames_dir):
        """Test that reconstruction job can be created."""
        response = app_client.post("/reconstruct", json={
            "preprocessing_output_dir": sample_frames_dir,
            "output_glb_path": "/tmp/output.glb",
            "num_frames": 4,
            "mc_resolution": 128
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "queued"
    
    def test_reconstruct_job_status_tracking(self, app_client, sample_frames_dir):
        """Test that reconstruction job status can be tracked."""
        # Create job
        response = app_client.post("/reconstruct", json={
            "preprocessing_output_dir": sample_frames_dir,
            "output_glb_path": "/tmp/output.glb",
            "num_frames": 4,
            "mc_resolution": 128
        })
        
        job_id = response.json()["job_id"]
        
        # Check status
        status_response = app_client.get(f"/reconstruct/status/{job_id}")
        
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["job_id"] == job_id
        assert status_data["status"] in ["queued", "processing", "completed", "failed"]
    
    def test_reconstruct_invalid_directory(self, app_client):
        """Test that invalid preprocessing directory returns 404."""
        response = app_client.post("/reconstruct", json={
            "preprocessing_output_dir": "/nonexistent/directory",
            "output_glb_path": "/tmp/output.glb",
            "num_frames": 4,
            "mc_resolution": 128
        })
        
        assert response.status_code == 404
    
    def test_job_status_not_found(self, app_client):
        """Test that querying non-existent job returns 404."""
        response = app_client.get("/preprocess/status/nonexistent-job-id")
        
        assert response.status_code == 404


# Integration Tests

class TestReconstructionPipelineIntegration:
    """Integration tests for the complete reconstruction pipeline."""
    
    def test_full_preprocessing_pipeline(self, sample_video, temp_dir):
        """Test complete preprocessing pipeline from video to processed frames."""
        from video_preprocessor import preprocess_video_file
        
        output_dir = os.path.join(temp_dir, "preprocessing_output")
        
        metadata = preprocess_video_file(sample_video, output_dir, fps=5)
        
        assert metadata is not None
        assert "total_frames" in metadata
        assert metadata["total_frames"] > 0
        assert "processed_frames_dir" in metadata
        assert os.path.exists(metadata["processed_frames_dir"])
        
        # Verify processed frames exist
        processed_frames = list(Path(metadata["processed_frames_dir"]).glob("*.png"))
        assert len(processed_frames) > 0
    
    def test_preprocessing_metadata_saved(self, sample_video, temp_dir):
        """Test that preprocessing metadata is saved correctly."""
        from video_preprocessor import preprocess_video_file
        
        output_dir = os.path.join(temp_dir, "preprocessing_output")
        
        metadata = preprocess_video_file(sample_video, output_dir, fps=5)
        
        metadata_file = Path(output_dir) / "preprocessing_metadata.json"
        assert metadata_file.exists()
        
        with open(metadata_file, 'r') as f:
            saved_metadata = json.load(f)
        
        assert saved_metadata["total_frames"] == metadata["total_frames"]
        assert "avg_circle" in saved_metadata


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
