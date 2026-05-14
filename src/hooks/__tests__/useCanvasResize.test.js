// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeScale } from '../useCanvasResize.js'

describe('computeScale', () => {
  describe('scales down when canvas is larger than viewport', () => {
    it('scales down horizontally constrained canvas', () => {
      // Canvas 1584x396, viewport 800x600
      // availableWidth = 800 - 32 = 768, availableHeight = 600 - 32 = 568
      // scaleX = 768/1584 ≈ 0.485, scaleY = 568/396 ≈ 1.434
      // scale = min(1, 0.485, 1.434) = 0.485
      const result = computeScale(1584, 396, 800, 600)
      expect(result.scale).toBeCloseTo(768 / 1584, 5)
      expect(result.displayWidth).toBeLessThanOrEqual(768)
      expect(result.displayHeight).toBeLessThanOrEqual(568)
    })

    it('scales down vertically constrained canvas', () => {
      // Canvas 500x1000, viewport 800x600
      // availableWidth = 768, availableHeight = 568
      // scaleX = 768/500 = 1.536, scaleY = 568/1000 = 0.568
      // scale = min(1, 1.536, 0.568) = 0.568
      const result = computeScale(500, 1000, 800, 600)
      expect(result.scale).toBeCloseTo(568 / 1000, 5)
      expect(result.displayWidth).toBeLessThanOrEqual(768)
      expect(result.displayHeight).toBeLessThanOrEqual(568)
    })

    it('scales down when both dimensions exceed viewport', () => {
      // Canvas 2000x1500, viewport 1000x800
      // availableWidth = 968, availableHeight = 768
      // scaleX = 968/2000 = 0.484, scaleY = 768/1500 = 0.512
      // scale = min(1, 0.484, 0.512) = 0.484
      const result = computeScale(2000, 1500, 1000, 800)
      expect(result.scale).toBeCloseTo(968 / 2000, 5)
      expect(result.displayWidth).toBeLessThanOrEqual(968)
      expect(result.displayHeight).toBeLessThanOrEqual(768)
    })
  })

  describe('does not upscale when canvas is smaller than viewport', () => {
    it('returns scale 1 when canvas fits within viewport', () => {
      // Canvas 400x300, viewport 1920x1080
      // availableWidth = 1888, availableHeight = 1048
      // scaleX = 1888/400 = 4.72, scaleY = 1048/300 = 3.49
      // scale = min(1, 4.72, 3.49) = 1
      const result = computeScale(400, 300, 1920, 1080)
      expect(result.scale).toBe(1)
      expect(result.displayWidth).toBe(400)
      expect(result.displayHeight).toBe(300)
    })

    it('returns scale 1 when canvas exactly matches available space', () => {
      // Canvas 768x568, viewport 800x600 (available = 768x568)
      const result = computeScale(768, 568, 800, 600)
      expect(result.scale).toBe(1)
      expect(result.displayWidth).toBe(768)
      expect(result.displayHeight).toBe(568)
    })
  })

  describe('maintains aspect ratio', () => {
    it('preserves aspect ratio for wide canvas', () => {
      const result = computeScale(1584, 396, 800, 600)
      const originalRatio = 1584 / 396
      const displayRatio = result.displayWidth / result.displayHeight
      // Allow small rounding error from Math.round
      expect(displayRatio).toBeCloseTo(originalRatio, 1)
    })

    it('preserves aspect ratio for tall canvas', () => {
      const result = computeScale(500, 1000, 800, 600)
      const originalRatio = 500 / 1000
      const displayRatio = result.displayWidth / result.displayHeight
      expect(displayRatio).toBeCloseTo(originalRatio, 1)
    })

    it('preserves aspect ratio for square canvas', () => {
      const result = computeScale(1000, 1000, 800, 600)
      const originalRatio = 1
      const displayRatio = result.displayWidth / result.displayHeight
      expect(displayRatio).toBeCloseTo(originalRatio, 1)
    })
  })

  describe('fits within viewport minus padding', () => {
    it('display dimensions never exceed available space', () => {
      const result = computeScale(1584, 396, 800, 600)
      expect(result.displayWidth).toBeLessThanOrEqual(800 - 32)
      expect(result.displayHeight).toBeLessThanOrEqual(600 - 32)
    })

    it('uses 32px total padding (16px each side)', () => {
      // Canvas exactly fills available width
      const result = computeScale(768, 200, 800, 600)
      // availableWidth = 768, scaleX = 768/768 = 1, scaleY = 568/200 = 2.84
      // scale = min(1, 1, 2.84) = 1
      expect(result.scale).toBe(1)
      expect(result.displayWidth).toBe(768)
    })
  })

  describe('edge cases', () => {
    it('handles zero canvas width gracefully', () => {
      const result = computeScale(0, 500, 800, 600)
      expect(result.scale).toBe(1)
      expect(result.displayWidth).toBe(0)
    })

    it('handles zero canvas height gracefully', () => {
      const result = computeScale(500, 0, 800, 600)
      expect(result.scale).toBe(1)
      expect(result.displayHeight).toBe(0)
    })

    it('handles zero viewport width gracefully', () => {
      const result = computeScale(500, 500, 0, 600)
      expect(result.scale).toBe(1)
    })

    it('handles zero viewport height gracefully', () => {
      const result = computeScale(500, 500, 800, 0)
      expect(result.scale).toBe(1)
    })

    it('handles very small viewport (smaller than padding)', () => {
      // viewport 20x20, available = max(0, 20-32) = 0
      const result = computeScale(500, 500, 20, 20)
      expect(result.scale).toBe(0)
      expect(result.displayWidth).toBe(0)
      expect(result.displayHeight).toBe(0)
    })

    it('handles LinkedIn dimensions in typical viewport', () => {
      // LinkedIn 1584x396 in 1920x1080 viewport
      const result = computeScale(1584, 396, 1920, 1080)
      // availableWidth = 1888, availableHeight = 1048
      // scaleX = 1888/1584 ≈ 1.19, scaleY = 1048/396 ≈ 2.65
      // scale = min(1, 1.19, 2.65) = 1
      expect(result.scale).toBe(1)
      expect(result.displayWidth).toBe(1584)
      expect(result.displayHeight).toBe(396)
    })

    it('handles LinkedIn dimensions in small viewport', () => {
      // LinkedIn 1584x396 in 1024x768 viewport
      const result = computeScale(1584, 396, 1024, 768)
      // availableWidth = 992, availableHeight = 736
      // scaleX = 992/1584 ≈ 0.626, scaleY = 736/396 ≈ 1.858
      // scale = min(1, 0.626, 1.858) = 0.626
      expect(result.scale).toBeCloseTo(992 / 1584, 5)
      expect(result.displayWidth).toBeLessThanOrEqual(992)
      expect(result.displayHeight).toBeLessThanOrEqual(736)
    })
  })
})
