"""
Integration test for depth estimation API endpoints.
"""

import cv2
import numpy as np
from pathlib import Path
import tempfile
import shutil
from fastapi.testclient import TestClient
from main import app


def create_test_images():
    """Create synthetic test images."""
    reference = np.zeros((512, 512, 3), dtype=np.uint8)
    reference[:] = (100, 100, 100)
    cv2.circle(reference, (256, 256), 200, (120, 120, 120), -1)
    
    damaged = reference.copy()
    cv2.line(damaged, (200, 150), (210, 350), (80, 80, 80), 3)
    cv2.line(damaged, (150, 250), (350, 260), (75, 75, 75), 3)
    
    return reference, damaged


def test_depth_estimation_api():
    """Test depth estimation API endpoints."""
    print("Testing depth estimation API endpoints...")
    
    client = TestClient(app)
    
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
        reference, damaged = create_test_images()
        cv2.imwrite(str(ref_dir / "frame_0000.png"), reference)
        cv2.imwrite(str(dam_dir / "frame_0000.png"), damaged)
        
        # Test POST /depth-estimation
        print("Testing POST /depth-estimation...")
        response = client.post(
            "/depth-estimation",
            json={
                "reference_frames_dir": str(ref_dir),
                "damaged_frames_dir": str(dam_dir),
                "output_dir": str(out_dir)
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "job_id" in data, "Response should contain job_id"
        assert data["status"] == "queued", "Initial status should be queued"
        
        job_id = data["job_id"]
        print(f"  ✓ Job created: {job_id}")
        
        # Test GET /depth-estimation/status/{job_id}
        print("Testing GET /depth-estimation/status/{job_id}...")
        
        # Wait a bit for processing
        import time
        time.sleep(2)
        
        response = client.get(f"/depth-estimation/status/{job_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        status_data = response.json()
        assert "status" in status_data, "Response should contain status"
        assert status_data["status"] in ["queued", "processing", "completed"], \
            f"Unexpected status: {status_data['status']}"
        
        print(f"  ✓ Status retrieved: {status_data['status']}")
        
        # If completed, check metadata
        if status_data["status"] == "completed":
            assert "metadata" in status_data, "Completed job should have metadata"
            metadata = status_data["metadata"]
            assert "max_depth_estimate_mm" in metadata, "Metadata should contain max_depth_estimate_mm"
            print(f"  ✓ Max depth: {metadata['max_depth_estimate_mm']:.2f} mm")
        
        # Test 404 for non-existent job
        print("Testing 404 for non-existent job...")
        response = client.get("/depth-estimation/status/non-existent-job-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("  ✓ 404 returned for non-existent job")
        
        # Test 404 for missing directories
        print("Testing 404 for missing directories...")
        response = client.post(
            "/depth-estimation",
            json={
                "reference_frames_dir": "/non/existent/path",
                "damaged_frames_dir": str(dam_dir),
                "output_dir": str(out_dir)
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("  ✓ 404 returned for missing reference directory")
        
        print("\n✅ All API tests passed!")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir)
        print(f"Cleaned up temporary directory: {temp_dir}")


if __name__ == "__main__":
    test_depth_estimation_api()
    print("\n🎉 API integration tests completed successfully!")
