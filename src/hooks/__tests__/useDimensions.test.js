// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  validateDimension,
  useDimensions,
  DIMENSION_PROFILES,
  DEFAULT_PROFILE,
} from '../useDimensions.js'

describe('validateDimension', () => {
  describe('accepts valid integers in [100, 4096]', () => {
    it('accepts 100 (lower bound)', () => {
      expect(validateDimension(100)).toEqual({ valid: true, error: null })
    })

    it('accepts 4096 (upper bound)', () => {
      expect(validateDimension(4096)).toEqual({ valid: true, error: null })
    })

    it('accepts a mid-range value (1500)', () => {
      expect(validateDimension(1500)).toEqual({ valid: true, error: null })
    })

    it('accepts numeric strings ("1584")', () => {
      expect(validateDimension('1584')).toEqual({ valid: true, error: null })
    })

    it('accepts string "100"', () => {
      expect(validateDimension('100')).toEqual({ valid: true, error: null })
    })

    it('accepts string "4096"', () => {
      expect(validateDimension('4096')).toEqual({ valid: true, error: null })
    })
  })

  describe('rejects out-of-range values', () => {
    it('rejects 99 (below lower bound)', () => {
      const result = validateDimension(99)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects 4097 (above upper bound)', () => {
      const result = validateDimension(4097)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects 0', () => {
      const result = validateDimension(0)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects negative integers', () => {
      const result = validateDimension(-500)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects very large numbers', () => {
      const result = validateDimension(10000)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('rejects non-integer values', () => {
    it('rejects decimals (100.5)', () => {
      const result = validateDimension(100.5)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects decimal strings ("200.7")', () => {
      const result = validateDimension('200.7')
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects float that looks like integer but is not (100.0 is fine since Number.isInteger(100.0) is true)', () => {
      // 100.0 is actually an integer in JS
      expect(validateDimension(100.0)).toEqual({ valid: true, error: null })
    })
  })

  describe('rejects non-numeric values', () => {
    it('rejects empty string', () => {
      const result = validateDimension('')
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects null', () => {
      const result = validateDimension(null)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects undefined', () => {
      const result = validateDimension(undefined)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects alphabetic strings', () => {
      const result = validateDimension('abc')
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects mixed strings ("100px")', () => {
      const result = validateDimension('100px')
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects Infinity', () => {
      const result = validateDimension(Infinity)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects -Infinity', () => {
      const result = validateDimension(-Infinity)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects NaN', () => {
      const result = validateDimension(NaN)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects objects', () => {
      const result = validateDimension({})
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects arrays', () => {
      const result = validateDimension([100])
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects boolean true', () => {
      const result = validateDimension(true)
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })
})

describe('useDimensions', () => {
  describe('preset profiles', () => {
    it('returns LinkedIn dimensions by default', () => {
      const result = useDimensions('LinkedIn (1584×396)', null, null)
      expect(result).toEqual({
        width: 1584,
        height: 396,
        profile: 'LinkedIn (1584×396)',
        error: null,
      })
    })

    it('returns Twitter/X dimensions', () => {
      const result = useDimensions('Twitter/X (1500×500)', null, null)
      expect(result).toEqual({
        width: 1500,
        height: 500,
        profile: 'Twitter/X (1500×500)',
        error: null,
      })
    })

    it('returns Facebook dimensions', () => {
      const result = useDimensions('Facebook (820×312)', null, null)
      expect(result).toEqual({
        width: 820,
        height: 312,
        profile: 'Facebook (820×312)',
        error: null,
      })
    })

    it('falls back to LinkedIn for unknown profile names', () => {
      const result = useDimensions('Unknown Profile', null, null)
      expect(result).toEqual({
        width: 1584,
        height: 396,
        profile: 'LinkedIn (1584×396)',
        error: null,
      })
    })

    it('falls back to LinkedIn for null profile', () => {
      const result = useDimensions(null, null, null)
      expect(result).toEqual({
        width: 1584,
        height: 396,
        profile: 'LinkedIn (1584×396)',
        error: null,
      })
    })

    it('falls back to LinkedIn for undefined profile', () => {
      const result = useDimensions(undefined, null, null)
      expect(result).toEqual({
        width: 1584,
        height: 396,
        profile: 'LinkedIn (1584×396)',
        error: null,
      })
    })

    it('ignores custom dimensions when a preset profile is selected', () => {
      const result = useDimensions('Twitter/X (1500×500)', 800, 600)
      expect(result.width).toBe(1500)
      expect(result.height).toBe(500)
    })
  })

  describe('custom profile with valid dimensions', () => {
    it('returns custom dimensions when both are valid', () => {
      const result = useDimensions('Custom', 1920, 1080)
      expect(result).toEqual({
        width: 1920,
        height: 1080,
        profile: 'Custom',
        error: null,
      })
    })

    it('accepts boundary values (100, 4096)', () => {
      const result = useDimensions('Custom', 100, 4096)
      expect(result).toEqual({
        width: 100,
        height: 4096,
        profile: 'Custom',
        error: null,
      })
    })

    it('accepts numeric string custom dimensions', () => {
      const result = useDimensions('Custom', '800', '600')
      expect(result).toEqual({
        width: 800,
        height: 600,
        profile: 'Custom',
        error: null,
      })
    })
  })

  describe('custom profile with invalid dimensions', () => {
    it('returns error for invalid custom width', () => {
      const result = useDimensions('Custom', 50, 500)
      expect(result.error).toContain('Width')
      expect(result.width).toBeNull()
      expect(result.height).toBeNull()
      expect(result.profile).toBe('Custom')
    })

    it('returns error for invalid custom height', () => {
      const result = useDimensions('Custom', 500, 5000)
      expect(result.error).toContain('Height')
      expect(result.width).toBeNull()
      expect(result.height).toBeNull()
    })

    it('returns width error first when both are invalid', () => {
      const result = useDimensions('Custom', 'abc', 'xyz')
      expect(result.error).toContain('Width')
    })

    it('returns error for non-numeric custom width', () => {
      const result = useDimensions('Custom', 'hello', 500)
      expect(result.error).toContain('Width')
      expect(result.width).toBeNull()
    })

    it('returns error for decimal custom height', () => {
      const result = useDimensions('Custom', 500, 300.5)
      expect(result.error).toContain('Height')
      expect(result.height).toBeNull()
    })

    it('returns error for null custom width', () => {
      const result = useDimensions('Custom', null, 500)
      expect(result.error).toContain('Width')
    })

    it('returns error for undefined custom height', () => {
      const result = useDimensions('Custom', 500, undefined)
      expect(result.error).toContain('Height')
    })
  })

  describe('DIMENSION_PROFILES constant', () => {
    it('contains LinkedIn profile with correct dimensions', () => {
      expect(DIMENSION_PROFILES['LinkedIn (1584×396)']).toEqual({ width: 1584, height: 396 })
    })

    it('contains Twitter/X profile with correct dimensions', () => {
      expect(DIMENSION_PROFILES['Twitter/X (1500×500)']).toEqual({ width: 1500, height: 500 })
    })

    it('contains Facebook profile with correct dimensions', () => {
      expect(DIMENSION_PROFILES['Facebook (820×312)']).toEqual({ width: 820, height: 312 })
    })

    it('contains Custom profile as null', () => {
      expect(DIMENSION_PROFILES['Custom']).toBeNull()
    })
  })

  describe('DEFAULT_PROFILE constant', () => {
    it('defaults to LinkedIn', () => {
      expect(DEFAULT_PROFILE).toBe('LinkedIn (1584×396)')
    })
  })
})
