import { describe, it, expect } from 'vitest';
import {
  calculateRotationFromTimestamp,
  RotationLookupTable,
  radiansToDegrees,
  degreesToRadians,
  normalizeAngle,
  calculateShortestRotation,
  type RotationPoint
} from './rotationCalculation';

describe('rotationCalculation', () => {
  describe('calculateRotationFromTimestamp', () => {
    it('should return 0 for timestamp 0', () => {
      const rotation = calculateRotationFromTimestamp(0, 10);
      expect(rotation).toBe(0);
    });

    it('should return 2π for timestamp equal to duration', () => {
      const rotation = calculateRotationFromTimestamp(10, 10);
      expect(rotation).toBeCloseTo(Math.PI * 2);
    });

    it('should return π for timestamp at half duration', () => {
      const rotation = calculateRotationFromTimestamp(5, 10);
      expect(rotation).toBeCloseTo(Math.PI);
    });

    it('should return 0 when duration is 0', () => {
      const rotation = calculateRotationFromTimestamp(5, 0);
      expect(rotation).toBe(0);
    });

    it('should handle fractional timestamps', () => {
      const rotation = calculateRotationFromTimestamp(2.5, 10);
      expect(rotation).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('RotationLookupTable', () => {
    it('should create a lookup table with linear rotation', () => {
      const table = new RotationLookupTable(10);
      expect(table.getDuration()).toBe(10);
      expect(table.getPoints().length).toBeGreaterThan(0);
    });

    it('should return 0 rotation at timestamp 0', () => {
      const table = new RotationLookupTable(10);
      const rotation = table.getRotationAtTimestamp(0);
      expect(rotation).toBeCloseTo(0);
    });

    it('should return 2π rotation at end of duration', () => {
      const table = new RotationLookupTable(10);
      const rotation = table.getRotationAtTimestamp(10);
      expect(rotation).toBeCloseTo(Math.PI * 2);
    });

    it('should interpolate between points', () => {
      const table = new RotationLookupTable(10);
      const rotation = table.getRotationAtTimestamp(5);
      expect(rotation).toBeCloseTo(Math.PI);
    });

    it('should handle custom rotation points', () => {
      const customPoints: RotationPoint[] = [
        { timestamp: 0, angle: 0 },
        { timestamp: 5, angle: Math.PI },
        { timestamp: 10, angle: Math.PI * 2 }
      ];
      const table = new RotationLookupTable(10, customPoints);
      
      expect(table.getRotationAtTimestamp(0)).toBeCloseTo(0);
      expect(table.getRotationAtTimestamp(5)).toBeCloseTo(Math.PI);
      expect(table.getRotationAtTimestamp(10)).toBeCloseTo(Math.PI * 2);
    });

    it('should clamp timestamps to valid range', () => {
      const table = new RotationLookupTable(10);
      
      const beforeStart = table.getRotationAtTimestamp(-5);
      expect(beforeStart).toBeCloseTo(0);
      
      const afterEnd = table.getRotationAtTimestamp(15);
      expect(afterEnd).toBeCloseTo(Math.PI * 2);
    });

    it('should update points dynamically', () => {
      const table = new RotationLookupTable(10);
      
      const newPoints: RotationPoint[] = [
        { timestamp: 0, angle: 0 },
        { timestamp: 10, angle: Math.PI * 4 } // Two rotations
      ];
      
      table.updatePoints(newPoints);
      const rotation = table.getRotationAtTimestamp(10);
      expect(rotation).toBeCloseTo(Math.PI * 4);
    });
  });

  describe('radiansToDegrees', () => {
    it('should convert 0 radians to 0 degrees', () => {
      expect(radiansToDegrees(0)).toBe(0);
    });

    it('should convert π radians to 180 degrees', () => {
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
    });

    it('should convert 2π radians to 360 degrees', () => {
      expect(radiansToDegrees(Math.PI * 2)).toBeCloseTo(360);
    });
  });

  describe('degreesToRadians', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(degreesToRadians(0)).toBe(0);
    });

    it('should convert 180 degrees to π radians', () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    });

    it('should convert 360 degrees to 2π radians', () => {
      expect(degreesToRadians(360)).toBeCloseTo(Math.PI * 2);
    });
  });

  describe('normalizeAngle', () => {
    it('should keep angles in 0-2π range unchanged', () => {
      expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(0)).toBeCloseTo(0);
      expect(normalizeAngle(Math.PI * 2)).toBeCloseTo(0);
    });

    it('should normalize negative angles', () => {
      expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(Math.PI * 1.5);
    });

    it('should normalize angles greater than 2π', () => {
      expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(Math.PI * 4)).toBeCloseTo(0);
    });
  });

  describe('calculateShortestRotation', () => {
    it('should return 0 for same angles', () => {
      expect(calculateShortestRotation(Math.PI, Math.PI)).toBeCloseTo(0);
    });

    it('should return positive difference for clockwise rotation', () => {
      const diff = calculateShortestRotation(0, Math.PI / 2);
      expect(diff).toBeCloseTo(Math.PI / 2);
    });

    it('should return negative difference for counter-clockwise rotation', () => {
      const diff = calculateShortestRotation(Math.PI / 2, 0);
      expect(diff).toBeCloseTo(-Math.PI / 2);
    });

    it('should choose shortest path across 0/2π boundary', () => {
      // From 350° to 10° should go clockwise (positive)
      const from = degreesToRadians(350);
      const to = degreesToRadians(10);
      const diff = calculateShortestRotation(from, to);
      
      expect(diff).toBeGreaterThan(0);
      expect(Math.abs(diff)).toBeLessThan(Math.PI / 2);
    });

    it('should handle wrapping in both directions', () => {
      // From 10° to 350° should go counter-clockwise (negative)
      const from = degreesToRadians(10);
      const to = degreesToRadians(350);
      const diff = calculateShortestRotation(from, to);
      
      expect(diff).toBeLessThan(0);
      expect(Math.abs(diff)).toBeLessThan(Math.PI / 2);
    });
  });
});
