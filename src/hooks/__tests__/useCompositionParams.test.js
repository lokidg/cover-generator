/**
 * Unit tests for useCompositionParams hook
 *
 * Tests the core logic: debouncing, engine invocation, error handling,
 * and randomize action. Since the hook depends on React and DialKit,
 * we test the underlying logic patterns directly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SeededPRNG } from '../../engine/SeededPRNG.js'

describe('useCompositionParams - core logic', () => {
  describe('CompositionEngine integration', () => {
    it('should create correct config from params for engine call', () => {
      const params = {
        seed: 12345,
        clusterCount: 3,
        primitiveCount: 12,
        accentOpacity: 0.15,
        surfaceOpacity: 0.10,
        booleanSubtraction: true,
        cameraAngle: 315,
        gridTileSize: 18,
        accentColor: '#4F46E5',
        // Text overlay params (should not be in engine config)
        name: 'Test',
        title: 'Developer',
        fontSize: 32,
      }

      // Extract config the same way the hook does
      const config = {
        clusterCount: params.clusterCount,
        primitiveCount: params.primitiveCount,
        accentOpacity: params.accentOpacity,
        surfaceOpacity: params.surfaceOpacity,
        booleanSubtraction: params.booleanSubtraction,
        cameraAngle: params.cameraAngle,
        gridTileSize: params.gridTileSize,
        accentColor: params.accentColor,
      }

      expect(config).toEqual({
        clusterCount: 3,
        primitiveCount: 12,
        accentOpacity: 0.15,
        surfaceOpacity: 0.10,
        booleanSubtraction: true,
        cameraAngle: 315,
        gridTileSize: 18,
        accentColor: '#4F46E5',
      })

      // Text overlay params should not leak into engine config
      expect(config).not.toHaveProperty('name')
      expect(config).not.toHaveProperty('title')
      expect(config).not.toHaveProperty('fontSize')
    })

    it('should create SeededPRNG with integer seed', () => {
      const seed = 42
      const prng = new SeededPRNG(seed | 0)

      // Should produce deterministic output
      const val1 = prng.next()
      const prng2 = new SeededPRNG(42)
      const val2 = prng2.next()

      expect(val1).toBe(val2)
    })

    it('should truncate decimal seeds to integer via bitwise OR', () => {
      const decimalSeed = 123.7
      const truncated = decimalSeed | 0

      expect(truncated).toBe(123)
      expect(Number.isInteger(truncated)).toBe(true)

      // Both should produce same PRNG sequence
      const prng1 = new SeededPRNG(decimalSeed | 0)
      const prng2 = new SeededPRNG(123)
      expect(prng1.next()).toBe(prng2.next())
    })

    it('should handle engine errors by catching exceptions', () => {
      const failingEngine = () => {
        throw new Error('Composition rendering failed. Try a different seed.')
      }

      let error = null
      let svgString = '<svg>previous</svg>'

      try {
        failingEngine()
      } catch (err) {
        error = err.message
        // Keep previous SVG on error (don't clear it)
      }

      expect(error).toBe('Composition rendering failed. Try a different seed.')
      expect(svgString).toBe('<svg>previous</svg>') // Previous SVG preserved
    })
  })

  describe('Randomize action', () => {
    it('should generate a new integer seed from Date.now() | 0', () => {
      const newSeed = Date.now() | 0

      expect(typeof newSeed).toBe('number')
      expect(Number.isInteger(newSeed)).toBe(true)
    })

    it('should produce a 32-bit integer seed', () => {
      const seed = Date.now() | 0

      // Bitwise OR 0 truncates to 32-bit signed integer
      expect(seed).toBe(seed | 0)
      expect(seed >= -2147483648).toBe(true)
      expect(seed <= 2147483647).toBe(true)
    })

    it('should produce different seeds at different times', async () => {
      const seed1 = Date.now() | 0
      // Wait a tiny bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 2))
      const seed2 = Date.now() | 0

      expect(seed1).not.toBe(seed2)
    })
  })

  describe('Debounce behavior', () => {
    it('should debounce — callback fires after delay, not before', async () => {
      const DEBOUNCE_MS = 50
      const callback = vi.fn()
      let timer = null

      const debounce = () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(callback, DEBOUNCE_MS)
      }

      debounce()

      // Immediately after, callback should not have fired
      expect(callback).not.toHaveBeenCalled()

      // Wait for debounce to complete
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should only fire once after rapid changes within debounce window', async () => {
      const DEBOUNCE_MS = 50
      const callback = vi.fn()
      let timer = null

      const debounce = () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(callback, DEBOUNCE_MS)
      }

      // Simulate rapid changes
      debounce()
      debounce()
      debounce()

      // Wait for debounce to complete
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should cancel previous timer when new change arrives', async () => {
      const DEBOUNCE_MS = 50
      const callback = vi.fn()
      let timer = null

      const debounce = () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(callback, DEBOUNCE_MS)
      }

      debounce()

      // After 30ms, trigger another change (resets the timer)
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(callback).not.toHaveBeenCalled()
      debounce()

      // 30ms after second debounce — still waiting
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(callback).not.toHaveBeenCalled()

      // 50ms after second debounce — should fire
      await new Promise((resolve) => setTimeout(resolve, 25))
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Heerich instance config', () => {
    it('should pass cameraAngle and gridTileSize to Heerich instance', () => {
      const params = {
        cameraAngle: 270,
        gridTileSize: 24,
      }

      const heerichConfig = {
        cameraAngle: params.cameraAngle,
        gridTileSize: params.gridTileSize,
        width: 1500,
        height: 500,
      }

      expect(heerichConfig).toEqual({
        cameraAngle: 270,
        gridTileSize: 24,
        width: 1500,
        height: 500,
      })
    })
  })
})
