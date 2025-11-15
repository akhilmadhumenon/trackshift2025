import cv2
import numpy as np
from pathlib import Path

class CrackDetector:
    def __init__(self, video_path):
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        
        # Get video properties
        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"Video loaded: {self.width}x{self.height} @ {self.fps}fps, {self.total_frames} frames")
    
    def preprocess_frame(self, frame, blur_size=5):
        """Convert to grayscale and apply preprocessing"""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE for contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Gaussian blur to reduce noise
        if blur_size % 2 == 0:
            blur_size += 1  # Must be odd
        blurred = cv2.GaussianBlur(enhanced, (blur_size, blur_size), 0)
        
        return blurred
    
    def canny_edge_detection(self, gray_frame, threshold1=50, threshold2=150):
        """Apply Canny edge detection"""
        edges = cv2.Canny(gray_frame, threshold1, threshold2)
        return edges
    
    def sobel_edge_detection(self, gray_frame):
        """Apply Sobel edge detection"""
        sobelx = cv2.Sobel(gray_frame, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray_frame, cv2.CV_64F, 0, 1, ksize=3)
        
        # Compute magnitude
        magnitude = np.sqrt(sobelx**2 + sobely**2)
        magnitude = np.uint8(magnitude / magnitude.max() * 255)
        
        # Threshold
        _, edges = cv2.threshold(magnitude, 50, 255, cv2.THRESH_BINARY)
        return edges
    
    def laplacian_edge_detection(self, gray_frame):
        """Apply Laplacian edge detection"""
        laplacian = cv2.Laplacian(gray_frame, cv2.CV_64F)
        laplacian = np.uint8(np.absolute(laplacian))
        
        # Threshold
        _, edges = cv2.threshold(laplacian, 30, 255, cv2.THRESH_BINARY)
        return edges
    
    def detect_edges(self, gray_frame, method='canny', **kwargs):
        """Unified edge detection interface"""
        if method == 'canny':
            return self.canny_edge_detection(gray_frame, **kwargs)
        elif method == 'sobel':
            return self.sobel_edge_detection(gray_frame)
        elif method == 'laplacian':
            return self.laplacian_edge_detection(gray_frame)
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def post_process_edges(self, edges, min_area=100):
        """Post-process edges to identify crack-like structures"""
        # Morphological closing to connect broken edges
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        # Find contours
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by area and aspect ratio
        crack_contours = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area:
                continue
            
            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = max(w, h) / (min(w, h) + 1e-5)
            
            # Cracks are typically elongated (high aspect ratio)
            if aspect_ratio > 2:
                crack_contours.append(contour)
        
        return crack_contours
    
    def draw_detections(self, frame, contours):
        """Draw detected cracks on the frame"""
        result = frame.copy()
        
        # Draw contours
        cv2.drawContours(result, contours, -1, (0, 255, 0), 2)
        
        # Draw bounding boxes and labels
        for i, contour in enumerate(contours):
            x, y, w, h = cv2.boundingRect(contour)
            cv2.rectangle(result, (x, y), (x + w, y + h), (0, 0, 255), 2)
            cv2.putText(result, f"Crack {i+1}", (x, y - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        return result
    
    def process_video(self, output_path='output_crack_detection.mp4', 
                     method='canny', blur_size=5, min_area=100, 
                     display=True, save_frames=False):
        """Process entire video and detect cracks"""
        
        # Setup video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, self.fps, (self.width * 3, self.height))
        
        frame_num = 0
        total_cracks_detected = 0
        
        if save_frames:
            Path('frames').mkdir(exist_ok=True)
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                break
            
            frame_num += 1
            
            # Preprocess
            preprocessed = self.preprocess_frame(frame, blur_size)
            
            # Detect edges
            edges = self.detect_edges(preprocessed, method=method)
            
            # Post-process and find cracks
            crack_contours = self.post_process_edges(edges, min_area)
            
            # Draw results
            result = self.draw_detections(frame, crack_contours)
            
            # Create visualization
            edges_colored = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
            combined = np.hstack([frame, edges_colored, result])
            
            # Add info overlay
            info_text = f"Frame: {frame_num}/{self.total_frames} | Cracks: {len(crack_contours)} | Method: {method.upper()}"
            cv2.putText(combined, info_text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Write to output
            out.write(combined)
            
            # Display
            if display:
                cv2.imshow('Crack Detection', cv2.resize(combined, (1920, 640)))
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            
            # Save frames periodically
            if save_frames and frame_num % 30 == 0:
                cv2.imwrite(f'frames/frame_{frame_num:04d}.jpg', combined)
            
            total_cracks_detected += len(crack_contours)
            
            # Progress update
            if frame_num % 30 == 0:
                print(f"Processed {frame_num}/{self.total_frames} frames, "
                      f"Average cracks: {total_cracks_detected/frame_num:.2f}")
        
        # Cleanup
        self.cap.release()
        out.release()
        cv2.destroyAllWindows()
        
        print(f"\nProcessing complete!")
        print(f"Total frames: {frame_num}")
        print(f"Total cracks detected: {total_cracks_detected}")
        print(f"Average cracks per frame: {total_cracks_detected/frame_num:.2f}")
        print(f"Output saved to: {output_path}")
    
    def process_single_frame(self, frame_index=0, method='canny'):
        """Process and display a single frame"""
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ret, frame = self.cap.read()
        
        if not ret:
            print("Failed to read frame")
            return
        
        # Process
        preprocessed = self.preprocess_frame(frame)
        edges = self.detect_edges(preprocessed, method=method)
        crack_contours = self.post_process_edges(edges)
        result = self.draw_detections(frame, crack_contours)
        
        # Display
        edges_colored = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        combined = np.hstack([frame, edges_colored, result])
        
        cv2.imshow('Single Frame Analysis', combined)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
        print(f"Cracks detected in frame {frame_index}: {len(crack_contours)}")


# Usage Example
if __name__ == "__main__":
    # Initialize detector
    detector = CrackDetector('Sample_Worn.mp4')
    
    # Method 1: Process entire video with Canny edge detection
    detector.process_video(
        output_path='output_canny.mp4',
        method='canny',
        blur_size=5,
        min_area=100,
        display=True,
        save_frames=False
    )
    
    # Method 2: Try different edge detection methods
    detector.process_video(output_path='output_sobel.mp4', method='sobel',blur_size=5,
        min_area=100,
        display=True,
        save_frames=False)
    detector.process_video(output_path='output_laplacian.mp4', method='laplacian',blur_size=5,
        min_area=100,
        display=True,
        save_frames=False)

    
    # Method 3: Analyze single frame
    # detector.process_single_frame(frame_index=100, method='canny')