/**
 * Video angle validation utilities for F1 Tyre Visual Difference Engine
 * Validates that uploaded videos are captured at 90° top-down angle
 */

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  message: string;
  angle?: number;
}

/**
 * Validates if a video is captured at approximately 90° top-down angle
 * Uses frame analysis to detect circular tyre shape and perspective
 * 
 * @param file - Video file to validate
 * @returns Promise with validation result
 */
export async function validateVideoAngle(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve({
        isValid: false,
        confidence: 0,
        message: 'Unable to initialize video analysis',
      });
      return;
    }

    video.preload = 'metadata';
    video.muted = true;
    
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    // Capture frame at 25% of video duration for analysis
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = video.duration * 0.25;
    });

    video.addEventListener('seeked', () => {
      try {
        // Set canvas to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Analyze the frame
        const result = analyzeFrameForTopDownAngle(imageData, canvas.width, canvas.height);

        // Cleanup
        URL.revokeObjectURL(objectUrl);
        video.remove();
        canvas.remove();

        resolve(result);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        video.remove();
        canvas.remove();
        
        resolve({
          isValid: false,
          confidence: 0,
          message: 'Error analyzing video frame',
        });
      }
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
      canvas.remove();
      
      resolve({
        isValid: false,
        confidence: 0,
        message: 'Unable to load video for analysis',
      });
    });
  });
}

/**
 * Analyzes a video frame to determine if it shows a top-down view
 * Looks for circular shapes (tyre from above) and checks aspect ratio
 * 
 * @param imageData - Frame image data
 * @param width - Frame width
 * @param height - Frame height
 * @returns Validation result
 */
function analyzeFrameForTopDownAngle(
  imageData: ImageData,
  width: number,
  height: number
): ValidationResult {
  // Convert to grayscale and detect edges
  const edges = detectEdges(imageData);
  
  // Detect circular shapes (tyres appear circular from top-down view)
  const circles = detectCircles(edges, width, height);
  
  // Calculate circularity score
  const circularityScore = calculateCircularityScore(circles, width, height);
  
  // Check for perspective distortion
  const perspectiveScore = checkPerspectiveDistortion(imageData, width, height);
  
  // Combined confidence score
  const confidence = (circularityScore * 0.7 + perspectiveScore * 0.3);
  
  // Threshold for valid top-down angle (70% confidence)
  const isValid = confidence >= 0.70;
  
  // Estimate angle deviation from perfect 90°
  const estimatedAngle = 90 - ((1 - confidence) * 30); // Max 30° deviation
  
  if (isValid) {
    return {
      isValid: true,
      confidence,
      angle: estimatedAngle,
      message: `Valid top-down angle detected (${Math.round(confidence * 100)}% confidence)`,
    };
  } else {
    return {
      isValid: false,
      confidence,
      angle: estimatedAngle,
      message: `Invalid camera angle. Please ensure video is captured at 90° top-down view (Current confidence: ${Math.round(confidence * 100)}%)`,
    };
  }
}

/**
 * Simple edge detection using Sobel-like operator
 */
function detectEdges(imageData: ImageData): Uint8ClampedArray {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const edges = new Uint8ClampedArray(width * height);
  
  // Convert to grayscale and detect edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Grayscale conversion
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      // Simple gradient calculation
      const idx_right = ((y) * width + (x + 1)) * 4;
      const idx_down = ((y + 1) * width + (x)) * 4;
      
      const gray_right = (data[idx_right] + data[idx_right + 1] + data[idx_right + 2]) / 3;
      const gray_down = (data[idx_down] + data[idx_down + 1] + data[idx_down + 2]) / 3;
      
      const gx = Math.abs(gray_right - gray);
      const gy = Math.abs(gray_down - gray);
      const gradient = Math.sqrt(gx * gx + gy * gy);
      
      edges[y * width + x] = gradient > 30 ? 255 : 0;
    }
  }
  
  return edges;
}

/**
 * Detect circular shapes in edge-detected image
 * Uses simplified Hough Circle Transform approach
 */
function detectCircles(edges: Uint8ClampedArray, width: number, height: number): Array<{x: number, y: number, radius: number, votes: number}> {
  const circles: Array<{x: number, y: number, radius: number, votes: number}> = [];
  const minRadius = Math.min(width, height) * 0.2;
  const maxRadius = Math.min(width, height) * 0.45;
  
  // Sample potential circle centers
  const sampleStep = 20;
  const radiusStep = 10;
  
  for (let cy = minRadius; cy < height - minRadius; cy += sampleStep) {
    for (let cx = minRadius; cx < width - minRadius; cx += sampleStep) {
      for (let r = minRadius; r < maxRadius; r += radiusStep) {
        let votes = 0;
        const samples = 16; // Sample points around circle
        
        for (let i = 0; i < samples; i++) {
          const angle = (i / samples) * 2 * Math.PI;
          const x = Math.round(cx + r * Math.cos(angle));
          const y = Math.round(cy + r * Math.sin(angle));
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            if (edges[y * width + x] > 128) {
              votes++;
            }
          }
        }
        
        // If enough edge points align with circle, it's a candidate
        if (votes > samples * 0.5) {
          circles.push({ x: cx, y: cy, radius: r, votes });
        }
      }
    }
  }
  
  return circles;
}

/**
 * Calculate circularity score based on detected circles
 * Higher score indicates more circular shapes (typical of top-down tyre view)
 */
function calculateCircularityScore(
  circles: Array<{x: number, y: number, radius: number, votes: number}>,
  width: number,
  height: number
): number {
  if (circles.length === 0) {
    return 0.3; // Low score if no circles detected
  }
  
  // Find the best circle (highest votes)
  const bestCircle = circles.reduce((best, circle) => 
    circle.votes > best.votes ? circle : best
  , circles[0]);
  
  // Check if circle is reasonably centered
  const centerX = width / 2;
  const centerY = height / 2;
  const distanceFromCenter = Math.sqrt(
    Math.pow(bestCircle.x - centerX, 2) + 
    Math.pow(bestCircle.y - centerY, 2)
  );
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
  const centeringScore = 1 - (distanceFromCenter / maxDistance);
  
  // Check if circle size is appropriate (should be significant portion of frame)
  const expectedRadius = Math.min(width, height) * 0.35;
  const radiusScore = 1 - Math.abs(bestCircle.radius - expectedRadius) / expectedRadius;
  
  // Normalize votes to 0-1 range
  const voteScore = Math.min(bestCircle.votes / 16, 1);
  
  // Combined score
  return (voteScore * 0.5 + centeringScore * 0.3 + radiusScore * 0.2);
}

/**
 * Check for perspective distortion
 * Top-down view should have minimal perspective distortion
 */
function checkPerspectiveDistortion(
  imageData: ImageData,
  width: number,
  height: number
): number {
  const data = imageData.data;
  
  // Analyze brightness distribution across quadrants
  // Top-down view should have relatively uniform lighting
  const quadrants = [
    { x: 0, y: 0, w: width / 2, h: height / 2 },
    { x: width / 2, y: 0, w: width / 2, h: height / 2 },
    { x: 0, y: height / 2, w: width / 2, h: height / 2 },
    { x: width / 2, y: height / 2, w: width / 2, h: height / 2 },
  ];
  
  const avgBrightness = quadrants.map(quad => {
    let sum = 0;
    let count = 0;
    
    for (let y = quad.y; y < quad.y + quad.h; y += 5) {
      for (let x = quad.x; x < quad.x + quad.w; x += 5) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += brightness;
        count++;
      }
    }
    
    return sum / count;
  });
  
  // Calculate variance in brightness across quadrants
  const mean = avgBrightness.reduce((a, b) => a + b, 0) / avgBrightness.length;
  const variance = avgBrightness.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgBrightness.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower standard deviation = more uniform = better top-down view
  // Normalize to 0-1 score (assuming max stdDev of 50)
  const uniformityScore = Math.max(0, 1 - (stdDev / 50));
  
  return uniformityScore;
}
