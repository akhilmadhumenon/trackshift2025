import cv2
import numpy as np
import json
from datetime import datetime
from pathlib import Path
import logging

class TireDamageAnalyzer:
    def __init__(self, video_path, output_dir="output"):
        """
        Initialize the tire damage analyzer
        
        Args:
            video_path: Path to input video
            output_dir: Directory for output files
        """
        self.video_path = video_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.output_dir / 'analysis.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Analysis results
        self.damages = []
        self.frame_count = 0
        
    def enhance_frame(self, frame):
        """Enhance frame quality for better crack detection"""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(enhanced, h=10)
        
        # Sharpen
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        return sharpened
    
    def detect_cracks(self, frame, frame_idx):
        """
        Detect cracks and damages using multiple techniques
        
        Returns:
            crack_mask: Binary mask of detected cracks
            damage_info: Dictionary with damage details
        """
        enhanced = self.enhance_frame(frame)
        h, w = enhanced.shape[:2]
        
        # Method 1: Edge detection
        edges = cv2.Canny(enhanced, 50, 150)
        
        # Method 2: Morphological operations to find thin structures
        kernel_line = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 5))
        morph = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel_line)
        
        # Method 3: Adaptive thresholding for local variations
        adaptive = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Combine methods
        combined = cv2.bitwise_or(morph, adaptive)
        
        # Remove noise - only keep significant contours
        kernel_clean = np.ones((2,2), np.uint8)
        cleaned = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel_clean)
        
        # Find contours (potential cracks)
        contours, _ = cv2.findContours(
            cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        # Filter contours based on aspect ratio and size
        crack_mask = np.zeros_like(cleaned)
        damage_info = {
            'frame': frame_idx,
            'timestamp': frame_idx / 30.0,  # assuming 30fps
            'damages': []
        }
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 20:  # Ignore very small contours
                continue
                
            # Get bounding rectangle
            x, y, w_box, h_box = cv2.boundingRect(cnt)
            aspect_ratio = max(w_box, h_box) / (min(w_box, h_box) + 1e-6)
            
            # Cracks are typically elongated
            if aspect_ratio > 2 and area > 30:
                cv2.drawContours(crack_mask, [cnt], -1, 255, -1)
                
                # Estimate severity based on area and length
                perimeter = cv2.arcLength(cnt, True)
                severity = "Low"
                if area > 200:
                    severity = "High"
                elif area > 100:
                    severity = "Medium"
                
                damage_info['damages'].append({
                    'type': 'crack',
                    'location': (int(x + w_box/2), int(y + h_box/2)),
                    'area': float(area),
                    'length': float(perimeter),
                    'severity': severity,
                    'bbox': [int(x), int(y), int(w_box), int(h_box)]
                })
        
        return crack_mask, damage_info
    
    def estimate_depth(self, frame, crack_mask):
        """
        Estimate relative depth of cracks using shadows and intensity
        Note: Without stereo vision, this is approximate
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Create depth map based on intensity (darker = deeper)
        depth_map = np.zeros_like(gray, dtype=np.float32)
        
        # Where cracks exist, estimate depth from local intensity variation
        crack_regions = crack_mask > 0
        if np.any(crack_regions):
            # Apply Gaussian to get local context
            local_mean = cv2.GaussianBlur(gray.astype(np.float32), (15, 15), 0)
            
            # Depth is inversely proportional to intensity
            depth_estimate = 255 - gray
            depth_map[crack_regions] = depth_estimate[crack_regions]
            
            # Normalize
            if depth_map.max() > 0:
                depth_map = (depth_map / depth_map.max() * 255).astype(np.uint8)
        
        return depth_map
    
    def create_visualization(self, frame, crack_mask, depth_map, damage_info):
        """Create annotated frame with detected damages highlighted"""
        vis_frame = frame.copy()
        
        # Create colored overlay for cracks (red)
        overlay = np.zeros_like(frame)
        overlay[crack_mask > 0] = [0, 0, 255]  # Red for cracks
        
        # Blend with original
        vis_frame = cv2.addWeighted(vis_frame, 0.7, overlay, 0.3, 0)
        
        # Add depth visualization (blue gradient)
        depth_colored = cv2.applyColorMap(depth_map, cv2.COLORMAP_JET)
        depth_overlay = np.zeros_like(frame)
        depth_overlay[crack_mask > 0] = depth_colored[crack_mask > 0]
        vis_frame = cv2.addWeighted(vis_frame, 0.8, depth_overlay, 0.2, 0)
        
        # Draw bounding boxes and labels
        for damage in damage_info['damages']:
            x, y, w, h = damage['bbox']
            color = (0, 255, 0) if damage['severity'] == 'Low' else \
                    (0, 255, 255) if damage['severity'] == 'Medium' else (0, 0, 255)
            
            cv2.rectangle(vis_frame, (x, y), (x+w, y+h), color, 2)
            
            # Add label
            label = f"{damage['severity']} - {damage['area']:.0f}px"
            cv2.putText(vis_frame, label, (x, y-5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
        
        # Add summary text
        summary = f"Frame: {damage_info['frame']} | Damages: {len(damage_info['damages'])}"
        cv2.putText(vis_frame, summary, (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        return vis_frame
    
    def process_video(self):
        """Main processing pipeline"""
        self.logger.info(f"Starting analysis of {self.video_path}")
        
        # Open video
        cap = cv2.VideoCapture(str(self.video_path))
        if not cap.isOpened():
            self.logger.error("Failed to open video")
            return
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        self.logger.info(f"Video: {width}x{height} @ {fps}fps, {total_frames} frames")
        
        # Setup output video
        output_path = self.output_dir / 'annotated_video.mp4'
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
        
        frame_idx = 0
        total_damages = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Detect damages
                crack_mask, damage_info = self.detect_cracks(frame, frame_idx)
                
                # Estimate depth
                depth_map = self.estimate_depth(frame, crack_mask)
                
                # Create visualization
                vis_frame = self.create_visualization(
                    frame, crack_mask, depth_map, damage_info
                )
                
                # Write to output
                out.write(vis_frame)
                
                # Store damage info if any detected
                if damage_info['damages']:
                    self.damages.append(damage_info)
                    total_damages += len(damage_info['damages'])
                    self.logger.info(
                        f"Frame {frame_idx}: {len(damage_info['damages'])} damages detected"
                    )
                
                frame_idx += 1
                
                # Progress update
                if frame_idx % 30 == 0:
                    progress = (frame_idx / total_frames) * 100
                    self.logger.info(f"Progress: {progress:.1f}%")
                    
        finally:
            cap.release()
            out.release()
            
        self.logger.info(f"Processing complete. Total damages: {total_damages}")
        self.logger.info(f"Annotated video saved to: {output_path}")
        
        # Generate reports
        self.generate_reports()
    
    def generate_reports(self):
        """Generate JSON and text reports"""
        # JSON report
        json_path = self.output_dir / 'damage_report.json'
        report = {
            'analysis_date': datetime.now().isoformat(),
            'video_path': str(self.video_path),
            'total_frames_analyzed': self.frame_count,
            'frames_with_damage': len(self.damages),
            'total_damages': sum(len(d['damages']) for d in self.damages),
            'damage_details': self.damages
        }
        
        with open(json_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.logger.info(f"JSON report saved to: {json_path}")
        
        # Text summary report
        txt_path = self.output_dir / 'damage_summary.txt'
        with open(txt_path, 'w') as f:
            f.write("F1 TIRE DAMAGE ANALYSIS REPORT\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Video: {self.video_path}\n")
            f.write(f"Total Damages Detected: {report['total_damages']}\n\n")
            
            # Severity breakdown
            severity_counts = {'Low': 0, 'Medium': 0, 'High': 0}
            for damage_frame in self.damages:
                for damage in damage_frame['damages']:
                    severity_counts[damage['severity']] += 1
            
            f.write("SEVERITY BREAKDOWN:\n")
            f.write(f"  High Severity:   {severity_counts['High']}\n")
            f.write(f"  Medium Severity: {severity_counts['Medium']}\n")
            f.write(f"  Low Severity:    {severity_counts['Low']}\n\n")
            
            f.write("DETAILED DAMAGE LOG:\n")
            f.write("-" * 50 + "\n")
            for damage_frame in self.damages:
                f.write(f"\nFrame {damage_frame['frame']} "
                       f"(Time: {damage_frame['timestamp']:.2f}s)\n")
                for i, damage in enumerate(damage_frame['damages'], 1):
                    f.write(f"  Damage {i}:\n")
                    f.write(f"    Type: {damage['type']}\n")
                    f.write(f"    Severity: {damage['severity']}\n")
                    f.write(f"    Area: {damage['area']:.1f} pixels\n")
                    f.write(f"    Length: {damage['length']:.1f} pixels\n")
                    f.write(f"    Location: {damage['location']}\n")
        
        self.logger.info(f"Text report saved to: {txt_path}")


# Usage example
if __name__ == "__main__":
    # Initialize analyzer
    analyzer = TireDamageAnalyzer(
        video_path="Sample_Worn.mp4",  # Replace with your video path
        output_dir="Mapped_Tyre_Damage_Video"
    )
    
    # Process the video
    analyzer.process_video()
    
    print("\n" + "="*50)
    print("Analysis Complete!")
    print("="*50)
    print("\nOutput files:")
    print("1. annotated_video.mp4 - Video with highlighted damages")
    print("2. damage_report.json - Detailed JSON report")
    print("3. damage_summary.txt - Human-readable summary")
    print("4. analysis.log - Processing logs")




