import { describe, it, expect } from 'vitest'
import { applyRotation, roundToNearest90 } from '../CompositionEngine.js'

describe('roundToNearest90', () => {
  it('returns 0 for 0', () => {
    expect(roundToNearest90(0)).toBe(0)
  })

  it('returns 90 for 90', () => {
    expect(roundToNearest90(90)).toBe(90)
  })

  it('returns 180 for 180', () => {
    expect(roundToNearest90(180)).toBe(180)
  })

  it('returns 270 for 270', () => {
    expect(roundToNearest90(270)).toBe(270)
  })

  it('rounds midpoint 45 up to 90', () => {
    expect(roundToNearest90(45)).toBe(90)
  })

  it('rounds midpoint 135 up to 180', () => {
    expect(roundToNearest90(135)).toBe(180)
  })

  it('rounds midpoint 225 up to 270', () => {
    expect(roundToNearest90(225)).toBe(270)
  })

  it('rounds midpoint 315 up to 360 → 0', () => {
    expect(roundToNearest90(315)).toBe(0)
  })

  it('rounds 44 down to 0', () => {
    expect(roundToNearest90(44)).toBe(0)
  })

  it('rounds 46 up to 90', () => {
    expect(roundToNearest90(46)).toBe(90)
  })

  it('rounds 89 down to 90', () => {
    expect(roundToNearest90(89)).toBe(90)
  })

  it('handles negative angles by normalizing', () => {
    expect(roundToNearest90(-90)).toBe(270)
    expect(roundToNearest90(-45)).toBe(0)
  })

  it('handles angles > 360 by normalizing', () => {
    expect(roundToNearest90(450)).toBe(90)
    expect(roundToNearest90(720)).toBe(0)
  })
})

describe('applyRotation', () => {
  const baseConfig = { gridTileSize: 18 }

  it('returns primitives unchanged when rotationEnabled is false', () => {
    const primitives = [
      { position: [2, 3, 4], size: [3, 4, 5] },
    ]
    const result = applyRotation(primitives, { ...baseConfig, rotationEnabled: false })
    expect(result[0].position).toEqual([2, 3, 4])
    expect(result[0].size).toEqual([3, 4, 5])
  })

  it('returns primitives unchanged when rotationEnabled is not provided', () => {
    const primitives = [
      { position: [2, 3, 4], size: [3, 4, 5] },
    ]
    const result = applyRotation(primitives, baseConfig)
    expect(result[0].position).toEqual([2, 3, 4])
    expect(result[0].size).toEqual([3, 4, 5])
  })

  it('returns primitives unchanged when angle is 0', () => {
    const primitives = [
      { position: [2, 3, 4], size: [3, 4, 5] },
    ]
    const result = applyRotation(primitives, {
      ...baseConfig,
      rotationEnabled: true,
      rotationAxis: 'Y',
      rotationAmount: 0,
    })
    expect(result[0].position).toEqual([2, 3, 4])
    expect(result[0].size).toEqual([3, 4, 5])
  })

  describe('Y-axis rotation', () => {
    it('90°: swaps X and Z components', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Y',
        rotationAmount: 90,
      })
      // X↔Z swap: position [4, 3, 2], size [7, 6, 5]
      // Clamp: position[0] ∈ [0, 18-7=11], position[2] ∈ [0, 18-5=13]
      expect(primitives[0].size).toEqual([7, 6, 5])
      expect(primitives[0].position).toEqual([4, 3, 2])
    })

    it('180°: negates X and Z positions', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Y',
        rotationAmount: 180,
      })
      // Negate X and Z: position [-2, 3, -4]
      // Clamp: position[0] = max(0, min(-2, 18-5=13)) = 0
      //        position[2] = max(0, min(-4, 18-7=11)) = 0
      expect(primitives[0].size).toEqual([5, 6, 7])
      expect(primitives[0].position).toEqual([0, 3, 0])
    })

    it('270°: swaps X and Z, negates new X', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Y',
        rotationAmount: 270,
      })
      // Swap X↔Z: pos [4, 3, 2], size [7, 6, 5]
      // Negate new X: pos [-4, 3, 2]
      // Clamp: position[0] = max(0, min(-4, 18-7=11)) = 0
      expect(primitives[0].size).toEqual([7, 6, 5])
      expect(primitives[0].position).toEqual([0, 3, 2])
    })
  })

  describe('X-axis rotation', () => {
    it('90°: swaps Y and Z components', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'X',
        rotationAmount: 90,
      })
      // Y↔Z swap: position [2, 4, 3], size [5, 7, 6]
      expect(primitives[0].size).toEqual([5, 7, 6])
      expect(primitives[0].position).toEqual([2, 4, 3])
    })

    it('180°: negates Y and Z positions', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'X',
        rotationAmount: 180,
      })
      // Negate Y and Z: position [2, -3, -4]
      // Clamp: position[1] = max(0, min(-3, 18-6=12)) = 0
      //        position[2] = max(0, min(-4, 18-7=11)) = 0
      expect(primitives[0].size).toEqual([5, 6, 7])
      expect(primitives[0].position).toEqual([2, 0, 0])
    })

    it('270°: swaps Y and Z, negates new Y', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'X',
        rotationAmount: 270,
      })
      // Swap Y↔Z: pos [2, 4, 3], size [5, 7, 6]
      // Negate new Y: pos [2, -4, 3]
      // Clamp: position[1] = max(0, min(-4, 18-7=11)) = 0
      expect(primitives[0].size).toEqual([5, 7, 6])
      expect(primitives[0].position).toEqual([2, 0, 3])
    })
  })

  describe('Z-axis rotation', () => {
    it('90°: swaps X and Y components', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Z',
        rotationAmount: 90,
      })
      // X↔Y swap: position [3, 2, 4], size [6, 5, 7]
      expect(primitives[0].size).toEqual([6, 5, 7])
      expect(primitives[0].position).toEqual([3, 2, 4])
    })

    it('180°: negates X and Y positions', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Z',
        rotationAmount: 180,
      })
      // Negate X and Y: position [-2, -3, 4]
      // Clamp: position[0] = max(0, min(-2, 18-5=13)) = 0
      //        position[1] = max(0, min(-3, 18-6=12)) = 0
      expect(primitives[0].size).toEqual([5, 6, 7])
      expect(primitives[0].position).toEqual([0, 0, 4])
    })

    it('270°: swaps X and Y, negates new X', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Z',
        rotationAmount: 270,
      })
      // Swap X↔Y: pos [3, 2, 4], size [6, 5, 7]
      // Negate new X: pos [-3, 2, 4]
      // Clamp: position[0] = max(0, min(-3, 18-6=12)) = 0
      expect(primitives[0].size).toEqual([6, 5, 7])
      expect(primitives[0].position).toEqual([0, 2, 4])
    })
  })

  describe('clamping', () => {
    it('clamps positions to [0, gridTileSize - size]', () => {
      const primitives = [
        { position: [16, 16, 16], size: [5, 5, 5] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Y',
        rotationAmount: 90,
      })
      // After swap: pos [16, 16, 16], size [5, 5, 5]
      // Clamp: each position[i] ∈ [0, 18-5=13]
      expect(primitives[0].position[0]).toBeLessThanOrEqual(13)
      expect(primitives[0].position[1]).toBeLessThanOrEqual(13)
      expect(primitives[0].position[2]).toBeLessThanOrEqual(13)
      expect(primitives[0].position[0]).toBeGreaterThanOrEqual(0)
      expect(primitives[0].position[1]).toBeGreaterThanOrEqual(0)
      expect(primitives[0].position[2]).toBeGreaterThanOrEqual(0)
    })

    it('clamps negative positions to 0', () => {
      // After 180° Y rotation, positions become negative
      const primitives = [
        { position: [10, 5, 10], size: [3, 3, 3] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Y',
        rotationAmount: 180,
      })
      // Negate X and Z: [-10, 5, -10]
      // Clamp: [0, 5, 0]
      expect(primitives[0].position).toEqual([0, 5, 0])
    })
  })

  describe('angle rounding', () => {
    it('rounds 45° to 90° and applies rotation', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Y',
        rotationAmount: 45,
      })
      // 45 rounds to 90 → Y-axis 90° → swap X and Z
      expect(primitives[0].size).toEqual([7, 6, 5])
      expect(primitives[0].position).toEqual([4, 3, 2])
    })

    it('rounds 44° to 0° (no-op)', () => {
      const primitives = [
        { position: [2, 3, 4], size: [5, 6, 7] },
      ]
      applyRotation(primitives, {
        ...baseConfig,
        rotationEnabled: true,
        rotationAxis: 'Y',
        rotationAmount: 44,
      })
      // 44 rounds to 0 → no rotation
      expect(primitives[0].position).toEqual([2, 3, 4])
      expect(primitives[0].size).toEqual([5, 6, 7])
    })
  })

  it('skips primitives without position or size', () => {
    const primitives = [
      { position: [2, 3, 4], size: [5, 6, 7] },
      { type: 'removeBox', style: null },
      { position: [1, 1, 1], size: [2, 2, 2] },
    ]
    applyRotation(primitives, {
      ...baseConfig,
      rotationEnabled: true,
      rotationAxis: 'Y',
      rotationAmount: 90,
    })
    // First and third should be rotated, second skipped
    expect(primitives[0].size).toEqual([7, 6, 5])
    expect(primitives[1]).toEqual({ type: 'removeBox', style: null })
    expect(primitives[2].size).toEqual([2, 2, 2])
  })

  it('handles multiple primitives', () => {
    const primitives = [
      { position: [1, 2, 3], size: [2, 2, 2] },
      { position: [5, 6, 7], size: [3, 3, 3] },
    ]
    applyRotation(primitives, {
      ...baseConfig,
      rotationEnabled: true,
      rotationAxis: 'Y',
      rotationAmount: 90,
    })
    // Both should have X↔Z swapped
    expect(primitives[0].position).toEqual([3, 2, 1])
    expect(primitives[0].size).toEqual([2, 2, 2])
    expect(primitives[1].position).toEqual([7, 6, 5])
    expect(primitives[1].size).toEqual([3, 3, 3])
  })
})
