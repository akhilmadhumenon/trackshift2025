/**
 * Rotation Calculation Utilities
 * 
 * Provides functions to calculate tyre rotation angle from video timestamp.
 * Supports both simple linear interpolation and lookup table approaches.
 */

/**
 * Represents a point in the rotation timeline
 */
export interface RotationPoint {
  timestamp: number; // Time in seconds
  angle: number; // Rotation angle in radians (0 to 2π)
}

/**
 * Lookup table for mapping timestamps to rotation angles
 * Can be populated from frame analysis or generated linearly
 */
export class RotationLookupTable {
  private points: RotationPoint[];
  private duration: number;

  constructor(duration: number, points?: RotationPoint[]) {
    this.duration = duration;
    
    if (points && points.length > 0) {
      // Use provided points (from frame analysis)
      this.points = [...points].sort((a, b) => a.timestamp - b.timestamp);
    } else {
      // Generate default linear rotation (one full rotation over video duration)
      this.points = this.generateLinearRotation(duration);
    }
  }

  /**
   * Generate a linear rotation lookup table
   * Assumes one complete rotation (2π radians) over the entire video duration
   */
  private generateLinearRotation(duration: number): RotationPoint[] {
    const numPoints = 360; // One point per degree for smooth interpolation
    const points: RotationPoint[] = [];
    
    for (let i = 0; i <= numPoints; i++) {
      const timestamp = (i / numPoints) * duration;
      const angle = (i / numPoints) * Math.PI * 2;
      points.push({ timestamp, angle });
    }
    
    return points;
  }

  /**
   * Get rotation angle for a given timestamp using linear interpolation
   * 
   * @param timestamp - Current video timestamp in seconds
   * @returns Rotation angle in radians (0 to 2π)
   */
  getRotationAtTimestamp(timestamp: number): number {
    // Clamp timestamp to valid range
    const clampedTime = Math.max(0, Math.min(timestamp, this.duration));
    
    // Handle edge cases
    if (this.points.length === 0) return 0;
    if (this.points.length === 1) return this.points[0].angle;
    if (clampedTime <= this.points[0].timestamp) return this.points[0].angle;
    if (clampedTime >= this.points[this.points.length - 1].timestamp) {
      return this.points[this.points.length - 1].angle;
    }
    
    // Find the two points to interpolate between
    let lowerIndex = 0;
    let upperIndex = this.points.length - 1;
    
    // Binary search for efficiency
    while (upperIndex - lowerIndex > 1) {
      const midIndex = Math.floor((lowerIndex + upperIndex) / 2);
      if (this.points[midIndex].timestamp <= clampedTime) {
        lowerIndex = midIndex;
      } else {
        upperIndex = midIndex;
      }
    }
    
    const lowerPoint = this.points[lowerIndex];
    const upperPoint = this.points[upperIndex];
    
    // Linear interpolation between the two points
    const timeDiff = upperPoint.timestamp - lowerPoint.timestamp;
    const angleDiff = upperPoint.angle - lowerPoint.angle;
    const progress = (clampedTime - lowerPoint.timestamp) / timeDiff;
    
    return lowerPoint.angle + angleDiff * progress;
  }

  /**
   * Update the lookup table with new rotation points
   * Useful when frame analysis provides actual rotation data
   */
  updatePoints(points: RotationPoint[]): void {
    this.points = [...points].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all rotation points in the lookup table
   */
  getPoints(): RotationPoint[] {
    return [...this.points];
  }

  /**
   * Get the video duration
   */
  getDuration(): number {
    return this.duration;
  }
}

/**
 * Simple function to calculate rotation from timestamp
 * Assumes one full rotation (2π radians) over the entire video duration
 * 
 * @param timestamp - Current video timestamp in seconds
 * @param duration - Total video duration in seconds
 * @returns Rotation angle in radians (0 to 2π)
 */
export function calculateRotationFromTimestamp(
  timestamp: number,
  duration: number
): number {
  if (duration === 0) return 0;
  
  // Calculate rotation as a fraction of the video duration
  // One full rotation (2π radians) over the entire video
  const progress = Math.max(0, Math.min(timestamp / duration, 1));
  const rotationRadians = progress * Math.PI * 2;
  
  return rotationRadians;
}

/**
 * Convert radians to degrees
 * 
 * @param radians - Angle in radians
 * @returns Angle in degrees (0-360)
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Convert degrees to radians
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Normalize angle to 0-2π range
 * 
 * @param angle - Angle in radians
 * @returns Normalized angle in radians (0 to 2π)
 */
export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let normalized = angle % twoPi;
  
  if (normalized < 0) {
    normalized += twoPi;
  }
  
  return normalized;
}

/**
 * Calculate the shortest rotation path between two angles
 * Handles 2π wrapping to find the most efficient rotation direction
 * 
 * @param currentAngle - Current angle in radians
 * @param targetAngle - Target angle in radians
 * @returns Rotation difference in radians (can be negative for counter-clockwise)
 */
export function calculateShortestRotation(
  currentAngle: number,
  targetAngle: number
): number {
  let diff = targetAngle - currentAngle;
  
  // Normalize to [-π, π] range for shortest path
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  
  return diff;
}

/**
 * Analyze video frames to detect tyre rotation
 * This is a placeholder for future frame analysis implementation
 * 
 * @param videoUrl - URL of the video to analyze
 * @returns Promise resolving to array of rotation points
 */
export async function analyzeVideoRotation(
  videoUrl: string
): Promise<RotationPoint[]> {
  // TODO: Implement frame-by-frame analysis using computer vision
  // This would involve:
  // 1. Extract frames from video
  // 2. Detect tyre features (tread patterns, markings)
  // 3. Track feature positions across frames
  // 4. Calculate rotation angle from feature movement
  // 5. Build lookup table of timestamp -> angle mappings
  
  // For now, return empty array to use default linear rotation
  console.warn('Frame analysis not yet implemented, using linear rotation');
  return [];
}
