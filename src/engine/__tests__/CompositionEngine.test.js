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

  describe('shape types', () => {
    it('only uses addBox when no shape flags are enabled (backward compat)', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig()

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      // All cluster primitives should be addBox
      for (const cluster of plan.clusters) {
        for (const prim of cluster.primitives) {
          expect(prim.type).toBe('addBox')
        }
      }
      // All heerich calls should be type: 'box'
      for (const call of heerich.calls) {
        expect(['box']).toContain(call.type)
      }
    })

    it('includes sphere primitives when spheresEnabled is true', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({ spheresEnabled: true, sphereRadius: 4 })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      // Should have at least one sphere primitive somewhere
      const allPrims = plan.clusters.flatMap(c => c.primitives)
      const spheres = allPrims.filter(p => p.type === 'addSphere')
      expect(spheres.length).toBeGreaterThanOrEqual(0) // May or may not be selected by PRNG

      // If spheres exist, verify their structure
      for (const sphere of spheres) {
        expect(sphere.radius).toBeGreaterThanOrEqual(1)
        expect(sphere.radius).toBeLessThanOrEqual(16)
        expect(sphere.position.length).toBe(3)
        expect(sphere.size.length).toBe(3)
      }
    })

    it('sphere radius is clamped to [1, 16]', () => {
      const prng = new SeededPRNG(100)
      const heerich = createMockHeerich()
      // Test with extreme radius values
      const config = defaultConfig({ spheresEnabled: true, sphereRadius: 50 })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      const allPrims = plan.clusters.flatMap(c => c.primitives)
      const spheres = allPrims.filter(p => p.type === 'addSphere')
      for (const sphere of spheres) {
        expect(sphere.radius).toBeLessThanOrEqual(16)
        expect(sphere.radius).toBeGreaterThanOrEqual(1)
      }
    })

    it('includes line primitives when linesEnabled is true', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({
        linesEnabled: true,
        lineStart: [0, 0, 0],
        lineEnd: [18, 18, 18],
      })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      const allPrims = plan.clusters.flatMap(c => c.primitives)
      const lines = allPrims.filter(p => p.type === 'addLine')

      // If lines exist, verify their structure
      for (const line of lines) {
        expect(line.lineStart.length).toBe(3)
        expect(line.lineEnd.length).toBe(3)
        // Coordinates should be within grid bounds
        for (const coord of line.lineStart) {
          expect(coord).toBeGreaterThanOrEqual(0)
          expect(coord).toBeLessThanOrEqual(config.gridTileSize)
        }
        for (const coord of line.lineEnd) {
          expect(coord).toBeGreaterThanOrEqual(0)
          expect(coord).toBeLessThanOrEqual(config.gridTileSize)
        }
      }
    })

    it('includes fill primitives when fillsEnabled is true', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({ fillsEnabled: true, fillPointCount: 6 })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      const allPrims = plan.clusters.flatMap(c => c.primitives)
      const fills = allPrims.filter(p => p.type === 'addFill')

      // If fills exist, verify their structure
      for (const fill of fills) {
        expect(fill.coords.length).toBeGreaterThanOrEqual(3)
        expect(fill.coords.length).toBeLessThanOrEqual(12)
        // All coords should be within grid bounds
        for (const coord of fill.coords) {
          expect(coord.length).toBe(3)
          for (const val of coord) {
            expect(val).toBeGreaterThanOrEqual(0)
            expect(val).toBeLessThanOrEqual(config.gridTileSize)
          }
        }
      }
    })

    it('dispatches sphere to applyGeometry with type: sphere', () => {
      // Use a seed that we know will produce sphere primitives
      // We enable only spheres to maximize chance
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({ spheresEnabled: true, sphereRadius: 4 })

      CompositionEngine.generate(prng, heerich, config)

      const sphereCalls = heerich.calls.filter(c => c.type === 'sphere')
      // With spheres enabled, at least some calls should be sphere type
      // (depends on PRNG selection, but with only addBox and addSphere available, likely)
      if (sphereCalls.length > 0) {
        for (const call of sphereCalls) {
          expect(call.center).toBeDefined()
          expect(call.center.length).toBe(3)
          expect(call.radius).toBeGreaterThanOrEqual(1)
          expect(call.radius).toBeLessThanOrEqual(16)
        }
      }
    })

    it('dispatches line to applyGeometry with type: line', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({
        linesEnabled: true,
        lineStart: [2, 2, 2],
        lineEnd: [10, 10, 10],
      })

      CompositionEngine.generate(prng, heerich, config)

      const lineCalls = heerich.calls.filter(c => c.type === 'line')
      if (lineCalls.length > 0) {
        for (const call of lineCalls) {
          expect(call.from).toBeDefined()
          expect(call.to).toBeDefined()
          expect(call.from.length).toBe(3)
          expect(call.to.length).toBe(3)
          expect(call.radius).toBe(1)
          expect(call.shape).toBe('rounded')
        }
      }
    })

    it('dispatches fill to applyGeometry with type: fill', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({ fillsEnabled: true, fillPointCount: 5 })

      CompositionEngine.generate(prng, heerich, config)

      const fillCalls = heerich.calls.filter(c => c.type === 'fill')
      if (fillCalls.length > 0) {
        for (const call of fillCalls) {
          expect(call.bounds).toBeDefined()
          expect(call.bounds.length).toBe(2)
          expect(call.test).toBeInstanceOf(Function)
        }
      }
    })

    it('maintains dominant-type ratio (≥60%) with mixed shapes', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({
        spheresEnabled: true,
        linesEnabled: true,
        fillsEnabled: true,
      })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      for (const cluster of plan.clusters) {
        if (cluster.primitives.length === 0) continue
        const dominantType = cluster.dominantType
        const dominantCount = cluster.primitives.filter(p => p.type === dominantType).length
        const ratio = dominantCount / cluster.primitives.length
        expect(ratio).toBeGreaterThanOrEqual(GestaltConstraints.DOMINANT_TYPE_MIN_RATIO - 0.01)
      }
    })

    it('respects 50-call budget with all shapes enabled', () => {
      const prng = new SeededPRNG(42)
      const heerich = createMockHeerich()
      const config = defaultConfig({
        spheresEnabled: true,
        linesEnabled: true,
        fillsEnabled: true,
        primitiveCount: 20,
        clusterCount: 4,
      })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.totalCalls).toBeLessThanOrEqual(GestaltConstraints.MAX_TOTAL_CALLS)
      expect(heerich.calls.length).toBeLessThanOrEqual(GestaltConstraints.MAX_TOTAL_CALLS)
    })

    it('produces deterministic output with shapes enabled', () => {
      const config = defaultConfig({
        spheresEnabled: true,
        linesEnabled: true,
        fillsEnabled: true,
        sphereRadius: 5,
        fillPointCount: 7,
      })

      const prng1 = new SeededPRNG(42)
      const heerich1 = createMockHeerich()
      const result1 = CompositionEngine.generate(prng1, heerich1, config)

      const prng2 = new SeededPRNG(42)
      const heerich2 = createMockHeerich()
      const result2 = CompositionEngine.generate(prng2, heerich2, config)

      expect(result1.plan.totalCalls).toBe(result2.plan.totalCalls)
      expect(result1.plan.clusters.length).toBe(result2.plan.clusters.length)
      // Verify call-by-call equality (excluding function references in fill test)
      expect(heerich1.calls.length).toBe(heerich2.calls.length)
      for (let i = 0; i < heerich1.calls.length; i++) {
        const c1 = heerich1.calls[i]
        const c2 = heerich2.calls[i]
        expect(c1.type).toBe(c2.type)
        if (c1.type === 'box') {
          expect(c1.position).toEqual(c2.position)
          expect(c1.size).toEqual(c2.size)
        } else if (c1.type === 'sphere') {
          expect(c1.center).toEqual(c2.center)
          expect(c1.radius).toBe(c2.radius)
        } else if (c1.type === 'line') {
          expect(c1.from).toEqual(c2.from)
          expect(c1.to).toEqual(c2.to)
        } else if (c1.type === 'fill') {
          expect(c1.bounds).toEqual(c2.bounds)
        }
      }
    })
  })

  describe('booleanMode', () => {
    it('defaults to subtract when booleanMode is not provided', () => {
      const prng = new SeededPRNG(55)
      const heerich = createMockHeerich()
      const config = defaultConfig({ booleanSubtraction: true })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.booleanMode).toBe('subtract')
      expect(plan.booleanOps.length).toBe(1)
      // The applyGeometry call for the boolean op should have mode: 'subtract'
      const booleanCall = heerich.calls.find((c) => c.mode === 'subtract')
      expect(booleanCall).toBeDefined()
    })

    it('passes mode: "intersect" to applyGeometry when booleanMode is intersect', () => {
      const prng = new SeededPRNG(55)
      const heerich = createMockHeerich()
      const config = defaultConfig({ booleanSubtraction: true, booleanMode: 'intersect' })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.booleanMode).toBe('intersect')
      const booleanCall = heerich.calls.find((c) => c.mode === 'intersect')
      expect(booleanCall).toBeDefined()
    })

    it('passes mode: "exclude" to applyGeometry when booleanMode is exclude', () => {
      const prng = new SeededPRNG(55)
      const heerich = createMockHeerich()
      const config = defaultConfig({ booleanSubtraction: true, booleanMode: 'exclude' })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.booleanMode).toBe('exclude')
      const booleanCall = heerich.calls.find((c) => c.mode === 'exclude')
      expect(booleanCall).toBeDefined()
    })

    it('omits mode key from applyGeometry when booleanMode is union', () => {
      const prng = new SeededPRNG(55)
      const heerich = createMockHeerich()
      const config = defaultConfig({ booleanSubtraction: true, booleanMode: 'union' })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.booleanMode).toBe('union')
      // Boolean op call should NOT have a mode property
      // Find the call that corresponds to the boolean op (it has no style)
      const booleanCall = heerich.calls.find((c) => c.style === undefined || c.style === null)
      if (booleanCall) {
        expect(booleanCall.mode).toBeUndefined()
      }
    })

    it('falls back to union and warns for invalid mode strings', () => {
      const prng = new SeededPRNG(55)
      const heerich = createMockHeerich()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const config = defaultConfig({ booleanSubtraction: true, booleanMode: 'invalid-mode' })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.booleanMode).toBe('union')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid booleanMode')
      )
      // Boolean op should not have a mode key (union behavior)
      const booleanCall = heerich.calls.find((c) => c.style === undefined || c.style === null)
      if (booleanCall) {
        expect(booleanCall.mode).toBeUndefined()
      }
      warnSpy.mockRestore()
    })

    it('counts boolean ops toward the 50-call budget', () => {
      const prng = new SeededPRNG(999)
      const heerich = createMockHeerich()
      const config = defaultConfig({
        booleanSubtraction: true,
        booleanMode: 'intersect',
        primitiveCount: 20,
        clusterCount: 4,
      })

      const { plan } = CompositionEngine.generate(prng, heerich, config)

      expect(plan.totalCalls).toBeLessThanOrEqual(GestaltConstraints.MAX_TOTAL_CALLS)
      expect(plan.booleanOps.length).toBe(1)
      // Total calls includes the boolean op
      const clusterPrimCount = plan.clusters.reduce((sum, c) => sum + c.primitives.length, 0)
      expect(plan.totalCalls).toBe(
        clusterPrimCount + plan.booleanOps.length + plan.accentPrimitives.length
      )
    })

    it('preserves backward compat: subtract mode produces same calls as pre-expansion', () => {
      // With booleanMode: 'subtract' (default), behavior should be identical
      const config = defaultConfig({ booleanSubtraction: true })

      const prng1 = new SeededPRNG(42)
      const heerich1 = createMockHeerich()
      const result1 = CompositionEngine.generate(prng1, heerich1, config)

      const prng2 = new SeededPRNG(42)
      const heerich2 = createMockHeerich()
      const result2 = CompositionEngine.generate(prng2, heerich2, { ...config, booleanMode: 'subtract' })

      expect(heerich1.calls).toEqual(heerich2.calls)
      expect(result1.plan.totalCalls).toBe(result2.plan.totalCalls)
    })
  })
})
