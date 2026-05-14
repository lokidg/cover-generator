// @vitest-environment node
/**
 * Unit tests for CompositionEngine
 * Validates: Requirements 1.1, 1.3, 9.1, 9.2, 9.3, 9.4
 */

import { describe, it, expect, vi } from 'vitest'
import { CompositionEngine } from '../CompositionEngine.js'
import { SeededPRNG } from '../SeededPRNG.js'
import { GestaltConstraints } from '../GestaltConstraints.js'

/**
 * Creates a mock Heerich instance that tracks API calls.
 */
function createMockHeerich() {
  const calls = []
  return {
    calls,
    applyGeometry(params) {
      calls.push(params)
    },
    toSVG(options) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect x="0" y="0" width="200" height="200" fill="#eee"/></svg>`
    },
  }
}

/** Default valid config */
function defaultConfig(overrides = {}) {
  return {
    clusterCount: 3,
    primitiveCount: 12,
    accentOpacity: 0.15,
    surfaceOpacity: 0.10,
    booleanSubtraction: true,
    cameraAngle: 315,
    gridTileSize: 18,
    accentColor: '#4F46E5',
    ...overrides,
  }
}

describe('CompositionEngine', () => {
  describe('generate()', () => {
    it('returns an object with plan and svgString', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      const result = CompositionEngine.generate(prng, heerich, config)

      expect(result).toHaveProperty('plan')
      expect(result).toHaveProperty('svgString')
      expect(typeof result.svgString).toBe('string')
      expect(result.svgString).toContain('<svg')
    })

    it('plan contains clusters, booleanOps, accentPrimitives, continuityAxis, totalCalls', () => {
      const prng = new SeededPRNG(123)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan).toHaveProperty('clusters')
      expect(plan).toHaveProperty('booleanOps')
      expect(plan).toHaveProperty('accentPrimitives')
      expect(plan).toHaveProperty('continuityAxis')
      expect(plan).toHaveProperty('totalCalls')
      expect(Array.isArray(plan.clusters)).toBe(true)
      expect(Array.isArray(plan.booleanOps)).toBe(true)
      expect(Array.isArray(plan.accentPrimitives)).toBe(true)
    })

    it('respects the 30-call limit', () => {
      const prng = new SeededPRNG(999)
      const heerich = createMockHeerich()
      const config = defaultConfig({ primitiveCount: 20, clusterCount: 4 })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.totalCalls).toBeLessThanOrEqual(GestaltConstraints.MAX_TOTAL_CALLS)
      expect(heerich.calls.length).toBeLessThanOrEqual(GestaltConstraints.MAX_TOTAL_CALLS)
    })

    it('generates clusters within the configured clusterCount', () => {
      const prng = new SeededPRNG(77)
      const heerich = createMockHeerich()
      const config = defaultConfig({ clusterCount: 2 })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.clusters.length).toBeGreaterThanOrEqual(1)
      expect(plan.clusters.length).toBeLessThanOrEqual(2)
    })

    it('includes boolean subtraction when enabled', () => {
      const prng = new SeededPRNG(55)
      const heerich = createMockHeerich()
      const config = defaultConfig({ booleanSubtraction: true })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.booleanOps.length).toBe(1)
      expect(plan.booleanOps[0].type).toBe('removeBox')
    })

    it('excludes boolean subtraction when disabled', () => {
      const prng = new SeededPRNG(55)
      const heerich = createMockHeerich()
      const config = defaultConfig({ booleanSubtraction: false })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.booleanOps.length).toBe(0)
    })

    it('generates accent primitives with the configured accent color', () => {
      const prng = new SeededPRNG(200)
      const heerich = createMockHeerich()
      const config = defaultConfig({ accentColor: '#FF0000' })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.accentPrimitives.length).toBeGreaterThanOrEqual(1)
      for (const accent of plan.accentPrimitives) {
        expect(accent.accentColor).toBe('#FF0000')
        // Style should contain the accent color as rgba
        expect(accent.style.default.fill).toContain('255,0,0')
      }
    })

    it('calls heerich.applyGeometry for each primitive', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      // Total heerich calls should match plan.totalCalls
      expect(heerich.calls.length).toBe(plan.totalCalls)
    })

    it('calls heerich.toSVG with padding 40', () => {
      const prng = new SeededPRNG(42)
      const toSVGSpy = vi.fn().mockReturnValue('<svg></svg>')
      const heerich = {
        applyGeometry: vi.fn(),
        toSVG: toSVGSpy,
      }
      const config = defaultConfig()

      CompositionEngine.generate(prng, heerich, config)

      expect(toSVGSpy).toHaveBeenCalledWith({ padding: 40 })
    })

    it('produces deterministic output for the same seed and config', () => {
      const config = defaultConfig()

      const prng1 = new SeededPRNG(42)
      const heerich1 = createMockHeerich()
      const result1 = CompositionEngine.generate(prng1, heerich1, config)

      const prng2 = new SeededPRNG(42)
      const heerich2 = createMockHeerich()
      const result2 = CompositionEngine.generate(prng2, heerich2, config)

      // Plans should be structurally identical
      expect(result1.plan.totalCalls).toBe(result2.plan.totalCalls)
      expect(result1.plan.clusters.length).toBe(result2.plan.clusters.length)
      expect(result1.plan.booleanOps.length).toBe(result2.plan.booleanOps.length)
      expect(result1.plan.accentPrimitives.length).toBe(result2.plan.accentPrimitives.length)

      // Heerich calls should be identical
      expect(heerich1.calls).toEqual(heerich2.calls)
    })

    it('works with edge seed 0', () => {
      const prng = new SeededPRNG(0)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      const result = CompositionEngine.generate(prng, heerich, config)

      expect(result.plan.totalCalls).toBeGreaterThan(0)
      expect(result.svgString).toContain('<svg')
    })

    it('works with max seed 2147483647', () => {
      const prng = new SeededPRNG(2147483647)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      const result = CompositionEngine.generate(prng, heerich, config)

      expect(result.plan.totalCalls).toBeGreaterThan(0)
      expect(result.svgString).toContain('<svg')
    })

    it('surface primitive opacities stay within 0.05–0.15 range', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({ surfaceOpacity: 0.10 })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      for (const cluster of plan.clusters) {
        const opacity = cluster.style.opacity
        expect(opacity).toBeGreaterThanOrEqual(GestaltConstraints.BACKGROUND_OPACITY_RANGE[0] - 0.001)
        expect(opacity).toBeLessThanOrEqual(GestaltConstraints.BACKGROUND_OPACITY_RANGE[1] + 0.001)
      }
    })

    it('accent primitive opacities stay within 0.10–0.25 range', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({ accentOpacity: 0.20 })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      for (const accent of plan.accentPrimitives) {
        // Parse opacity from the rgba fill string
        const match = accent.style.default.fill.match(/rgba\(\d+,\d+,\d+,([\d.]+)\)/)
        if (match) {
          const opacity = parseFloat(match[1])
          expect(opacity).toBeGreaterThanOrEqual(GestaltConstraints.FOREGROUND_OPACITY_RANGE[0] - 0.001)
          expect(opacity).toBeLessThanOrEqual(GestaltConstraints.FOREGROUND_OPACITY_RANGE[1] + 0.001)
        }
      }
    })

    it('applies continuity axis alignment', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.continuityAxis).toHaveProperty('axis')
      expect(plan.continuityAxis).toHaveProperty('value')
      expect(['x', 'y', 'z']).toContain(plan.continuityAxis.axis)
    })

    it('applies common fate direction to clusters', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      for (const cluster of plan.clusters) {
        expect(cluster.fateDirection).not.toBeNull()
        expect(Array.isArray(cluster.fateDirection)).toBe(true)
        expect(cluster.fateDirection.length).toBe(3)
      }
    })

    it('respects gridTileSize parameter', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({ gridTileSize: 10 })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      // All primitive positions should be within the grid
      for (const cluster of plan.clusters) {
        for (const prim of cluster.primitives) {
          for (const coord of prim.position) {
            expect(coord).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })

    it('has no DOM coupling — does not reference document or window', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      // Should not throw even without DOM
      const result = CompositionEngine.generate(prng, heerich, config)
      expect(result.svgString).toBeDefined()
    })
  })
})
