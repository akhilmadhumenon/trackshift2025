"""
TripoSR 3D reconstruction module for F1 Tyre Visual Difference Engine.
Handles 3D mesh generation from preprocessed video frames.
"""

import torch
import numpy as np
from pathlib import Path
from typing import Dict, Optional, List
import trimesh
from PIL import Image
import os


class TripoSRReconstructor:
    """Handles 3D reconstruction using TripoSR."""
    
    def __init__(self, device: Optional[str] = None):
        """
        Initialize the TripoSR reconstructor.
        
        Args:
            device: Device to run inference on ('cuda', 'mps', or 'cpu')
        """
        # Determine device
        if device is None:
            if torch.cuda.is_available():
                self.device = 'cuda'
            elif torch.backends.mps.is_available():
                self.device = 'mps'
            else:
                self.device = 'cpu'
        else:
            self.device = device
        
        print(f"Initializing TripoSR on device: {self.device}")
        
        # Load TripoSR model
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the TripoSR model."""
        try:
            from tsr.system import TSR
            
            # Load model from HuggingFace
            self.model = TSR.from_pretrained(
                "stabilityai/TripoSR",
                config_name="config.yaml",
                weight_name="model.ckpt",
            )
            
            # Move model to device
            self.model.to(self.device)
            self.model.eval()
            
            print("TripoSR model loaded successfully")
            
        except ImportError:
            raise RuntimeError(
                "TripoSR not installed. Please install with: "
                "pip install git+https://github.com/VAST-AI-Research/TripoSR.git"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to load TripoSR model: {e}")
    
    def preprocess_image(self, image_path: str, target_size: int = 512) -> torch.Tensor:
        """
        Preprocess image for TripoSR input.
        
        Args:
            image_path: Path to input image
            target_size: Target image size (default: 512)
            
        Returns:
            Preprocessed image tensor
        """
        # Load image
        image = Image.open(image_path).convert('RGB')
        
        # Resize to target size
        image = image.resize((target_size, target_size), Image.Resampling.LANCZOS)
        
        # Convert to tensor and normalize
        image_array = np.array(image).astype(np.float32) / 255.0
        image_tensor = torch.from_numpy(image_array).permute(2, 0, 1).unsqueeze(0)
        
        # Move to device
        image_tensor = image_tensor.to(self.device)
        
        return image_tensor
    
    def select_best_frames(self, frames_dir: Path, num_frames: int = 8) -> List[str]:
        """
        Select best frames for reconstruction from preprocessed frames.
        Selects evenly distributed frames across the video.
        
        Args:
            frames_dir: Directory containing preprocessed frames
            num_frames: Number of frames to select (default: 8)
            
        Returns:
            List of selected frame paths
        """
        frame_files = sorted(frames_dir.glob("processed_*.png"))
        
        if len(frame_files) == 0:
            raise RuntimeError(f"No processed frames found in {frames_dir}")
        
        # Select evenly distributed frames
        if len(frame_files) <= num_frames:
            selected = frame_files
        else:
            indices = np.linspace(0, len(frame_files) - 1, num_frames, dtype=int)
            selected = [frame_files[i] for i in indices]
        
        return [str(f) for f in selected]
    
    def reconstruct_from_frames(
        self, 
        frames_dir: Path, 
        output_path: str,
        num_frames: int = 8,
        mc_resolution: int = 256
    ) -> Dict[str, any]:
        """
        Reconstruct 3D mesh from preprocessed frames.
        
        Args:
            frames_dir: Directory containing preprocessed frames
            output_path: Path to save output GLB file
            num_frames: Number of frames to use for reconstruction
            mc_resolution: Marching cubes resolution for mesh extraction
            
        Returns:
            Dictionary containing reconstruction metadata
        """
        if self.model is None:
            raise RuntimeError("TripoSR model not loaded")
        
        print(f"Starting 3D reconstruction from {frames_dir}")
        
        # Select best frames
        selected_frames = self.select_best_frames(frames_dir, num_frames)
        print(f"Selected {len(selected_frames)} frames for reconstruction")
        
        # Process each frame and accumulate results
        all_meshes = []
        
        with torch.no_grad():
            for i, frame_path in enumerate(selected_frames):
                print(f"Processing frame {i+1}/{len(selected_frames)}: {frame_path}")
                
                # Preprocess image
                image_tensor = self.preprocess_image(frame_path)
                
                # Run TripoSR inference
                try:
                    # Generate 3D representation
                    scene_codes = self.model([image_tensor], device=self.device)
                    
                    # Extract mesh using marching cubes
                    meshes = self.model.extract_mesh(
                        scene_codes,
                        resolution=mc_resolution
                    )
                    
                    if len(meshes) > 0:
                        all_meshes.append(meshes[0])
                    
                except Exception as e:
                    print(f"Warning: Failed to process frame {frame_path}: {e}")
                    continue
        
        if len(all_meshes) == 0:
            raise RuntimeError("Failed to generate any meshes from frames")
        
        print(f"Generated {len(all_meshes)} meshes, merging...")
        
        # Merge meshes (simple approach: use the first mesh or average)
        # For tyre reconstruction, we'll use the mesh with most vertices
        final_mesh = max(all_meshes, key=lambda m: len(m.vertices))
        
        # Optionally: Average vertex positions if multiple meshes
        if len(all_meshes) > 1:
            final_mesh = self._merge_meshes(all_meshes)
        
        # Save as GLB
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        final_mesh.export(str(output_path), file_type='glb')
        print(f"Saved mesh to {output_path}")
        
        # Calculate mesh statistics
        metadata = {
            'output_path': str(output_path),
            'num_frames_used': len(selected_frames),
            'num_vertices': len(final_mesh.vertices),
            'num_faces': len(final_mesh.faces),
            'bounds': final_mesh.bounds.tolist(),
            'center': final_mesh.centroid.tolist()
        }
        
        return metadata
    
    def _merge_meshes(self, meshes: List[trimesh.Trimesh]) -> trimesh.Trimesh:
        """
        Merge multiple meshes by averaging vertex positions.
        
        Args:
            meshes: List of trimesh objects
            
        Returns:
            Merged trimesh object
        """
        # Use the first mesh as base
        base_mesh = meshes[0]
        
        # If meshes have same topology, average vertices
        if all(len(m.vertices) == len(base_mesh.vertices) for m in meshes):
            avg_vertices = np.mean([m.vertices for m in meshes], axis=0)
            merged = trimesh.Trimesh(
                vertices=avg_vertices,
                faces=base_mesh.faces,
                process=True
            )
        else:
            # Otherwise, concatenate all meshes
            merged = trimesh.util.concatenate(meshes)
        
        return merged
    
    def reconstruct_from_video_preprocessing(
        self,
        preprocessing_output_dir: str,
        output_glb_path: str,
        num_frames: int = 8,
        mc_resolution: int = 256
    ) -> Dict[str, any]:
        """
        Convenience method to reconstruct from video preprocessing output.
        
        Args:
            preprocessing_output_dir: Directory containing preprocessing results
            output_glb_path: Path to save output GLB file
            num_frames: Number of frames to use
            mc_resolution: Marching cubes resolution
            
        Returns:
            Reconstruction metadata
        """
        preprocessing_dir = Path(preprocessing_output_dir)
        processed_frames_dir = preprocessing_dir / "processed_frames"
        
        if not processed_frames_dir.exists():
            raise RuntimeError(
                f"Processed frames directory not found: {processed_frames_dir}"
            )
        
        return self.reconstruct_from_frames(
            processed_frames_dir,
            output_glb_path,
            num_frames=num_frames,
            mc_resolution=mc_resolution
        )


def reconstruct_tyre_3d(
    preprocessing_output_dir: str,
    output_glb_path: str,
    device: Optional[str] = None,
    num_frames: int = 8,
    mc_resolution: int = 256
) -> Dict[str, any]:
    """
    Convenience function to reconstruct 3D tyre mesh from preprocessing output.
    
    Args:
        preprocessing_output_dir: Directory containing preprocessing results
        output_glb_path: Path to save output GLB file
        device: Device to run on ('cuda', 'mps', or 'cpu')
        num_frames: Number of frames to use for reconstruction
        mc_resolution: Marching cubes resolution
        
    Returns:
        Reconstruction metadata dictionary
    """
    reconstructor = TripoSRReconstructor(device=device)
    return reconstructor.reconstruct_from_video_preprocessing(
        preprocessing_output_dir,
        output_glb_path,
        num_frames=num_frames,
        mc_resolution=mc_resolution
    )
