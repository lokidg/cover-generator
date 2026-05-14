// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { SeededPRNG } from '../SeededPRNG.js'

describe('SeededPRNG', () => {
  describe('determinism', () => {
    it('produces identical sequences for the same seed', () => {
      const a = new SeededPRNG(42)
      const b = new SeededPRNG(42)
      for (let i = 0; i < 100; i++) {
        expect(a.next()).toBe(b.next())
      }
    })

    it('produces different sequences for different seeds', () => {
      const a = new SeededPRNG(1)
      const b = new SeededPRNG(2)
      const resultsA = Array.from({ length: 10 }, () => a.next())
      const resultsB = Array.from({ length: 10 }, () => b.next())
      expect(resultsA).not.toEqual(resultsB)
    })
  })

  describe('next()', () => {
    it('returns values in [0, 1)', () => {
      const prng = new SeededPRNG(123)
      for (let i = 0; i < 1000; i++) {
        const val = prng.next()
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThan(1)
      }
    })
  })

  describe('intRange()', () => {
    it('returns integers within [min, max] inclusive', () => {
      const prng = new SeededPRNG(99)
      for (let i = 0; i < 500; i++) {
        const val = prng.intRange(3, 7)
        expect(val).toBeGreaterThanOrEqual(3)
        expect(val).toBeLessThanOrEqual(7)
        expect(Number.isInteger(val)).toBe(true)
      }
    })

    it('returns min when min equals max', () => {
      const prng = new SeededPRNG(55)
      expect(prng.intRange(5, 5)).toBe(5)
    })
  })

  describe('floatRange()', () => {
    it('returns floats within [min, max)', () => {
      const prng = new SeededPRNG(77)
      for (let i = 0; i < 500; i++) {
        const val = prng.floatRange(2.0, 5.0)
        expect(val).toBeGreaterThanOrEqual(2.0)
        expect(val).toBeLessThan(5.0)
      }
    })
  })

  describe('pick()', () => {
    it('returns an element from the array', () => {
      const prng = new SeededPRNG(10)
      const items = ['a', 'b', 'c', 'd']
      for (let i = 0; i < 100; i++) {
        expect(items).toContain(prng.pick(items))
      }
    })
  })

  describe('shuffle()', () => {
    it('returns a new array with the same elements', () => {
      const prng = new SeededPRNG(200)
      const original = [1, 2, 3, 4, 5]
      const shuffled = prng.shuffle(original)
      expect(shuffled).toHaveLength(original.length)
      expect(shuffled.sort()).toEqual(original.sort())
    })

    it('does not mutate the original array', () => {
      const prng = new SeededPRNG(300)
      const original = [1, 2, 3, 4, 5]
      const copy = [...original]
      prng.shuffle(original)
      expect(original).toEqual(copy)
    })

    it('produces deterministic shuffles for the same seed', () => {
      const a = new SeededPRNG(42)
      const b = new SeededPRNG(42)
      const arr = [1, 2, 3, 4, 5, 6, 7, 8]
      expect(a.shuffle(arr)).toEqual(b.shuffle(arr))
    })
  })

  describe('default seed', () => {
    it('uses Date.now() when no seed is provided', () => {
      const prng = new SeededPRNG()
      // Should not throw and should produce valid output
      const val = prng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    })
  })
})
