import { describe, it, expect } from 'vitest'
import { applyPerShapeGap } from '../CompositionEngine.js'
import { SeededPRNG } from '../SeededPRNG.js'

describe('applyPerShapeGap', () => {
  it('returns primitives unchanged when perShapeGapEnabled is false', () => {
    const prng = new SeededPRNG(42)
    const primitives = [
      { position: [1, 2, 3], size: [4, 5, 6], style: {} },
      { position: [7, 8, 9], size: [2, 2, 2], style: {} },
    ]
    const result = applyPerShapeGap(primitives, prng, { perShapeGapEnabled: false })
    expect(result[0].gap).toBeUndefined()
    expect(result[1].gap).toBeUndefined()
  })

  it('returns primitives unchanged when perShapeGapEnabled is not provided', () => {
    const prng = new SeededPRNG(42)
    const primitives = [
      { position: [1, 2, 3], size: [4, 5, 6], style: {} },
    ]
    const result = applyPerShapeGap(primitives, prng, {})
    expect(result[0].gap).toBeUndefined()
  })

  it('does not consume PRNG values when disabled', () => {
    const prng1 = new SeededPRNG(42)
    const prng2 = new SeededPRNG(42)
    const primitives = [
      { position: [1, 2, 3], size: [4, 5, 6], style: {} },
      { position: [7, 8, 9], size: [2, 2, 2], style: {} },
    ]
    applyPerShapeGap(primitives, prng1, { perShapeGapEnabled: false })
    // prng1 should not have been advanced — next value should match prng2
    expect(prng1.next()).toBe(prng2.next())
  })

  it('assigns gap property to each primitive when enabled', () => {
    const prng = new SeededPRNG(42)
    const primitives = [
      { position: [1, 2, 3], size: [4, 5, 6], style: {} },
      { position: [7, 8, 9], size: [2, 2, 2], style: {} },
      { position: [0, 0, 0], size: [1, 1, 1], style: {} },
    ]
    applyPerShapeGap(primitives, prng, {
      perShapeGapEnabled: true,
      gapMin: 0,
      gapMax: 0.2,
    })
    for (const prim of primitives) {
      expect(prim.gap).toBeDefined()
      expect(typeof prim.gap).toBe('number')
    }
  })

  it('generates gap values within [gapMin, gapMax]', () => {
    const prng = new SeededPRNG(123)
    const primitives = Array.from({ length: 20 }, (_, i) => ({
      position: [i, i, i],
      size: [1, 1, 1],
      style: {},
    }))
    applyPerShapeGap(primitives, prng, {
      perShapeGapEnabled: true,
      gapMin: 0.05,
      gapMax: 0.15,
    })
    for (const prim of primitives) {
      expect(prim.gap).toBeGreaterThanOrEqual(0.05)
      expect(prim.gap).toBeLessThanOrEqual(0.15)
    }
  })

  it('clamps gap values to [0, 0.2]', () => {
    const prng = new SeededPRNG(99)
    const primitives = [
      { position: [1, 2, 3], size: [4, 5, 6], style: {} },
    ]
    applyPerShapeGap(primitives, prng, {
      perShapeGapEnabled: true,
      gapMin: 0,
      gapMax: 0.2,
    })
    expect(primitives[0].gap).toBeGreaterThanOrEqual(0)
    expect(primitives[0].gap).toBeLessThanOrEqual(0.2)
  })

  it('swaps gapMin and gapMax when min > max', () => {
    const prng = new SeededPRNG(55)
    const primitives = Array.from({ length: 10 }, (_, i) => ({
      position: [i, i, i],
      size: [1, 1, 1],
      style: {},
    }))
    applyPerShapeGap(primitives, prng, {
      perShapeGapEnabled: true,
      gapMin: 0.15,
      gapMax: 0.05,
    })
    // After swap, effective range is [0.05, 0.15]
    for (const prim of primitives) {
      expect(prim.gap).toBeGreaterThanOrEqual(0.05)
      expect(prim.gap).toBeLessThanOrEqual(0.15)
    }
  })

  it('defaults gapMin to 0 and gapMax to 0.2 when not provided', () => {
    const prng = new SeededPRNG(77)
    const primitives = Array.from({ length: 10 }, (_, i) => ({
      position: [i, i, i],
      size: [1, 1, 1],
      style: {},
    }))
    applyPerShapeGap(primitives, prng, {
      perShapeGapEnabled: true,
    })
    for (const prim of primitives) {
      expect(prim.gap).toBeGreaterThanOrEqual(0)
      expect(prim.gap).toBeLessThanOrEqual(0.2)
    }
  })

  it('produces deterministic gap values for the same seed', () => {
    const primitives1 = Array.from({ length: 5 }, (_, i) => ({
      position: [i, i, i],
      size: [1, 1, 1],
      style: {},
    }))
    const primitives2 = Array.from({ length: 5 }, (_, i) => ({
      position: [i, i, i],
      size: [1, 1, 1],
      style: {},
    }))
    const config = { perShapeGapEnabled: true, gapMin: 0.02, gapMax: 0.18 }

    applyPerShapeGap(primitives1, new SeededPRNG(42), config)
    applyPerShapeGap(primitives2, new SeededPRNG(42), config)

    for (let i = 0; i < 5; i++) {
      expect(primitives1[i].gap).toBe(primitives2[i].gap)
    }
  })

  it('consumes exactly one PRNG value per primitive when enabled', () => {
    const prng1 = new SeededPRNG(42)
    const prng2 = new SeededPRNG(42)
    const primitives = Array.from({ length: 3 }, (_, i) => ({
      position: [i, i, i],
      size: [1, 1, 1],
      style: {},
    }))

    applyPerShapeGap(primitives, prng1, {
      perShapeGapEnabled: true,
      gapMin: 0,
      gapMax: 0.2,
    })

    // Advance prng2 by 3 calls (one floatRange per primitive, which calls next() once)
    prng2.floatRange(0, 0.2)
    prng2.floatRange(0, 0.2)
    prng2.floatRange(0, 0.2)

    // Both PRNGs should now be at the same state
    expect(prng1.next()).toBe(prng2.next())
  })

  it('handles empty primitives array', () => {
    const prng = new SeededPRNG(42)
    const primitives = []
    const result = applyPerShapeGap(primitives, prng, {
      perShapeGapEnabled: true,
      gapMin: 0,
      gapMax: 0.2,
    })
    expect(result).toEqual([])
  })

  it('handles gapMin equal to gapMax (uniform gap)', () => {
    const prng = new SeededPRNG(42)
    const primitives = Array.from({ length: 5 }, (_, i) => ({
      position: [i, i, i],
      size: [1, 1, 1],
      style: {},
    }))
    applyPerShapeGap(primitives, prng, {
      perShapeGapEnabled: true,
      gapMin: 0.1,
      gapMax: 0.1,
    })
    // When min === max, floatRange returns min (since range is 0)
    for (const prim of primitives) {
      expect(prim.gap).toBeCloseTo(0.1, 5)
    }
  })

  it('returns the same array reference (mutates in place)', () => {
    const prng = new SeededPRNG(42)
    const primitives = [{ position: [1, 2, 3], size: [4, 5, 6], style: {} }]
    const result = applyPerShapeGap(primitives, prng, {
      perShapeGapEnabled: true,
      gapMin: 0,
      gapMax: 0.2,
    })
    expect(result).toBe(primitives)
  })
})
