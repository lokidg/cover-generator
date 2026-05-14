// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { GestaltConstraints } from '../GestaltConstraints.js'

describe('GestaltConstraints', () => {
  it('is frozen and cannot be mutated', () => {
    expect(Object.isFrozen(GestaltConstraints)).toBe(true)
  })

  it('has correct cluster opacity ranges', () => {
    expect(GestaltConstraints.BACKGROUND_OPACITY_RANGE).toEqual([0.05, 0.15])
    expect(GestaltConstraints.FOREGROUND_OPACITY_RANGE).toEqual([0.10, 0.25])
  })

  it('has correct call limit', () => {
    expect(GestaltConstraints.MAX_TOTAL_CALLS).toBe(30)
  })

  it('has correct primitive count range', () => {
    expect(GestaltConstraints.PRIMITIVE_COUNT_RANGE).toEqual([8, 20])
  })

  it('has correct closure box range', () => {
    expect(GestaltConstraints.CLOSURE_BOX_RANGE).toEqual([3, 5])
  })

  it('has correct distinct types range', () => {
    expect(GestaltConstraints.DISTINCT_TYPES_RANGE).toEqual([2, 3])
  })

  it('has correct accent count range', () => {
    expect(GestaltConstraints.ACCENT_COUNT_RANGE).toEqual([1, 2])
  })

  it('has correct max perceptual groups', () => {
    expect(GestaltConstraints.MAX_PERCEPTUAL_GROUPS).toBe(5)
  })

  it('has frozen nested arrays', () => {
    expect(Object.isFrozen(GestaltConstraints.CLOSURE_BOX_RANGE)).toBe(true)
    expect(Object.isFrozen(GestaltConstraints.BACKGROUND_OPACITY_RANGE)).toBe(true)
    expect(Object.isFrozen(GestaltConstraints.FOREGROUND_OPACITY_RANGE)).toBe(true)
    expect(Object.isFrozen(GestaltConstraints.PRIMITIVE_COUNT_RANGE)).toBe(true)
    expect(Object.isFrozen(GestaltConstraints.DISTINCT_TYPES_RANGE)).toBe(true)
    expect(Object.isFrozen(GestaltConstraints.ACCENT_COUNT_RANGE)).toBe(true)
  })

  it('has correct Gestalt principle ratios', () => {
    expect(GestaltConstraints.INTRA_CLUSTER_MAX_RATIO).toBe(0.3)
    expect(GestaltConstraints.DOMINANT_TYPE_MIN_RATIO).toBe(0.6)
  })
})
