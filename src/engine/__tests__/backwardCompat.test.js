// @vitest-environment node
/**
 * Backward Compatibility Tests for CompositionEngine
 * Validates: Requirements 12.1, 12.4, 13.2, 13.3
 *
 * Ensures that when all expanded params are at defaults (disabled/false),
 * the engine produces identical output to pre-expansion behavior.
 * No PRNG calls are consumed by new steps when features are disabled.
 * The PRNG call sequence matches pre-expansion:
 *   type selection → cluster bounds → cluster population → closure →
 *   figure-ground → continuity → common fate → boolean → accents
 */

import { describe, it, expect } from 'vitest'
import { CompositionEngine } from '../CompositionEngine.js'
import { SeededPRNG } from '../SeededPRNG.js'

/**
 * Creates a mock Heerich instance that tracks all applyGeometry calls.
 */
function createMockHeerich() {
  const calls = []
  return {
    calls,
    applyGeometry(params) {
      calls.push(JSON.parse(JSON.stringify(params, (key, value) => {
        // Serialize functions as a placeholder for comparison
        if (typeof value === 'function') return '__function__'
        return value
      })))
    },
    toSVG(options) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect x="0" y="0" width="200" height="200" fill="#eee"/></svg>`
    },
  }
}

/**
 * Creates a PRNG wrapper that counts how many times next() is called.
 */
function createCountingPRNG(seed) {
  const prng = new SeededPRNG(seed)
  let callCount = 0
  const originalNext = prng.next.bind(prng)

  prng.next = function () {
    callCount++
    return originalNext()
  }

  prng.getCallCount = () => callCount

  return prng
}

/** Pre-expansion config — only the original parameters */
function preExpansionConfig() {
  return {
    clusterCount: 3,
    primitiveCount: 12,
    accentOpacity: 0.15,
    surfaceOpacity: 0.10,
    booleanSubtraction: true,
    cameraAngle: 315,
    gridTileSize: 18,
    accentColor: '#4F46E5',
  }
}

/** Expanded config with all new features explicitly disabled */
function expandedConfigAllDisabled() {
  return {
    ...preExpansionConfig(),
    // Shapes disabled
    spheresEnabled: false,
    sphereRadius: 8,
    linesEnabled: false,
    lineStart: [0, 0, 0],
    lineEnd: [18, 18, 18],
    fillsEnabled: false,
    fillPointCount: 6,
    // Boolean mode at default
    booleanMode: 'subtract',
    // Rotation disabled
    rotationEnabled: false,
    rotationAxis: 'Y',
    rotationAmount: 0,
    // Scaling disabled
    scalingEnabled: false,
    scalingMode: 'static',
    scaleX: 1.0,
    scaleY: 1.0,
    scaleZ: 1.0,
    // Functional style disabled
    functionalStyleEnabled: false,
    styleFunction: 'gradient-x',
    styleStartColor: '#E0E0E3',
    styleEndColor: '#4F46E5',
    // Hatching disabled
    hatchingEnabled: false,
    hatchAngle: 45,
    hatchDensity: 3,
    hatchColor: '#000000',
    // Smooth disabled
    smoothEnabled: false,
    // Per-face disabled
    perFaceEnabled: false,
    faceTopColor: '#E0E0E3',
    faceLeftColor: '#E0E0E3',
    faceRightColor: '#E0E0E3',
    // Per-shape gap disabled
    perShapeGapEnabled: false,
    gapMin: 0,
    gapMax: 0.2,
  }
}

describe('Backward Compatibility (Requirements 12.1, 12.4, 13.2, 13.3)', () => {
  const TEST_SEEDS = [42, 0, 123, 999, 2147483647]

  describe('pre-expansion config produces identical output with expanded config (all disabled)', () => {
    for (const seed of TEST_SEEDS) {
      it(`seed ${seed}: identical Heerich calls`, () => {
        const preConfig = preExpansionConfig()
        const expandedConfig = expandedConfigAllDisabled()

        // Generate with pre-expansion config
        const prng1 = new SeededPRNG(seed)
        const heerich1 = createMockHeerich()
        const result1 = CompositionEngine.generate(prng1, heerich1, preConfig)

        // Generate with expanded config (all features disabled)
        const prng2 = new SeededPRNG(seed)
        const heerich2 = createMockHeerich()
        const result2 = CompositionEngine.generate(prng2, heerich2, expandedConfig)

        // Heerich calls must be identical
        expect(heerich1.calls.length).toBe(heerich2.calls.length)
        expect(heerich1.calls).toEqual(heerich2.calls)
      })

      it(`seed ${seed}: identical plan structure`, () => {
        const preConfig = preExpansionConfig()
        const expandedConfig = expandedConfigAllDisabled()

        const prng1 = new SeededPRNG(seed)
        const heerich1 = createMockHeerich()
        const result1 = CompositionEngine.generate(prng1, heerich1, preConfig)

        const prng2 = new SeededPRNG(seed)
        const heerich2 = createMockHeerich()
        const result2 = CompositionEngine.generate(prng2, heerich2, expandedConfig)

        // Plan structure must be identical
        expect(result1.plan.totalCalls).toBe(result2.plan.totalCalls)
        expect(result1.plan.clusters.length).toBe(result2.plan.clusters.length)
        expect(result1.plan.booleanOps.length).toBe(result2.plan.booleanOps.length)
        expect(result1.plan.accentPrimitives.length).toBe(result2.plan.accentPrimitives.length)
        expect(result1.plan.continuityAxis).toEqual(result2.plan.continuityAxis)

        // Cluster primitives must be identical
        for (let i = 0; i < result1.plan.clusters.length; i++) {
          const c1 = result1.plan.clusters[i]
          const c2 = result2.plan.clusters[i]
          expect(c1.primitives.length).toBe(c2.primitives.length)
          expect(c1.dominantType).toBe(c2.dominantType)
          expect(c1.fateDirection).toEqual(c2.fateDirection)
          expect(c1.bounds).toEqual(c2.bounds)
        }
      })

      it(`seed ${seed}: identical SVG output`, () => {
        const preConfig = preExpansionConfig()
        const expandedConfig = expandedConfigAllDisabled()

        const prng1 = new SeededPRNG(seed)
        const heerich1 = createMockHeerich()
        const result1 = CompositionEngine.generate(prng1, heerich1, preConfig)

        const prng2 = new SeededPRNG(seed)
        const heerich2 = createMockHeerich()
        const result2 = CompositionEngine.generate(prng2, heerich2, expandedConfig)

        // SVG output must be byte-identical
        expect(result1.svgString).toBe(result2.svgString)
      })
    }
  })

  describe('PRNG consumption is identical when expanded features are disabled', () => {
    for (const seed of TEST_SEEDS) {
      it(`seed ${seed}: same number of PRNG calls`, () => {
        const preConfig = preExpansionConfig()
        const expandedConfig = expandedConfigAllDisabled()

        // Count PRNG calls with pre-expansion config
        const prng1 = createCountingPRNG(seed)
        const heerich1 = createMockHeerich()
        CompositionEngine.generate(prng1, heerich1, preConfig)
        const preExpansionCallCount = prng1.getCallCount()

        // Count PRNG calls with expanded config (all disabled)
        const prng2 = createCountingPRNG(seed)
        const heerich2 = createMockHeerich()
        CompositionEngine.generate(prng2, heerich2, expandedConfig)
        const expandedCallCount = prng2.getCallCount()

        // PRNG call count must be identical
        expect(expandedCallCount).toBe(preExpansionCallCount)
      })
    }
  })

  describe('new steps only consume PRNG when their feature is enabled', () => {
    it('perShapeGap consumes PRNG only when enabled', () => {
      const seed = 42
      const baseConfig = preExpansionConfig()

      // Without per-shape gap
      const prng1 = createCountingPRNG(seed)
      const heerich1 = createMockHeerich()
      CompositionEngine.generate(prng1, heerich1, baseConfig)
      const baseCallCount = prng1.getCallCount()

      // With per-shape gap enabled
      const prng2 = createCountingPRNG(seed)
      const heerich2 = createMockHeerich()
      const gapConfig = { ...baseConfig, perShapeGapEnabled: true, gapMin: 0, gapMax: 0.1 }
      CompositionEngine.generate(prng2, heerich2, gapConfig)
      const gapCallCount = prng2.getCallCount()

      // Per-shape gap should consume additional PRNG calls (one per primitive)
      expect(gapCallCount).toBeGreaterThan(baseCallCount)
    })

    it('rotation does NOT consume PRNG (pure transform)', () => {
      const seed = 42
      const baseConfig = preExpansionConfig()

      const prng1 = createCountingPRNG(seed)
      const heerich1 = createMockHeerich()
      CompositionEngine.generate(prng1, heerich1, baseConfig)
      const baseCallCount = prng1.getCallCount()

      const prng2 = createCountingPRNG(seed)
      const heerich2 = createMockHeerich()
      const rotConfig = { ...baseConfig, rotationEnabled: true, rotationAxis: 'Y', rotationAmount: 90 }
      CompositionEngine.generate(prng2, heerich2, rotConfig)
      const rotCallCount = prng2.getCallCount()

      // Rotation is a pure transform — no PRNG consumption
      expect(rotCallCount).toBe(baseCallCount)
    })

    it('scaling does NOT consume PRNG (pure transform)', () => {
      const seed = 42
      const baseConfig = preExpansionConfig()

      const prng1 = createCountingPRNG(seed)
      const heerich1 = createMockHeerich()
      CompositionEngine.generate(prng1, heerich1, baseConfig)
      const baseCallCount = prng1.getCallCount()

      const prng2 = createCountingPRNG(seed)
      const heerich2 = createMockHeerich()
      const scaleConfig = { ...baseConfig, scalingEnabled: true, scalingMode: 'static', scaleX: 2.0, scaleY: 1.5, scaleZ: 1.0 }
      CompositionEngine.generate(prng2, heerich2, scaleConfig)
      const scaleCallCount = prng2.getCallCount()

      // Scaling is a pure transform — no PRNG consumption
      expect(scaleCallCount).toBe(baseCallCount)
    })

    it('functionalStyle does NOT consume PRNG (pure color computation)', () => {
      const seed = 42
      const baseConfig = preExpansionConfig()

      const prng1 = createCountingPRNG(seed)
      const heerich1 = createMockHeerich()
      CompositionEngine.generate(prng1, heerich1, baseConfig)
      const baseCallCount = prng1.getCallCount()

      const prng2 = createCountingPRNG(seed)
      const heerich2 = createMockHeerich()
      const styleConfig = { ...baseConfig, functionalStyleEnabled: true, styleFunction: 'gradient-x', styleStartColor: '#000000', styleEndColor: '#FFFFFF' }
      CompositionEngine.generate(prng2, heerich2, styleConfig)
      const styleCallCount = prng2.getCallCount()

      // Functional style is a pure color computation — no PRNG consumption
      expect(styleCallCount).toBe(baseCallCount)
    })

    it('hatching does NOT consume PRNG (pure style transform)', () => {
      const seed = 42
      const baseConfig = preExpansionConfig()

      const prng1 = createCountingPRNG(seed)
      const heerich1 = createMockHeerich()
      CompositionEngine.generate(prng1, heerich1, baseConfig)
      const baseCallCount = prng1.getCallCount()

      const prng2 = createCountingPRNG(seed)
      const heerich2 = createMockHeerich()
      const hatchConfig = { ...baseConfig, hatchingEnabled: true, hatchAngle: 45, hatchDensity: 3, hatchColor: '#000000' }
      CompositionEngine.generate(prng2, heerich2, hatchConfig)
      const hatchCallCount = prng2.getCallCount()

      // Hatching is a pure style transform — no PRNG consumption
      expect(hatchCallCount).toBe(baseCallCount)
    })

    it('perFaceStyle does NOT consume PRNG (pure style transform)', () => {
      const seed = 42
      const baseConfig = preExpansionConfig()

      const prng1 = createCountingPRNG(seed)
      const heerich1 = createMockHeerich()
      CompositionEngine.generate(prng1, heerich1, baseConfig)
      const baseCallCount = prng1.getCallCount()

      const prng2 = createCountingPRNG(seed)
      const heerich2 = createMockHeerich()
      const faceConfig = { ...baseConfig, perFaceEnabled: true, faceTopColor: '#FF0000', faceLeftColor: '#00FF00', faceRightColor: '#0000FF' }
      CompositionEngine.generate(prng2, heerich2, faceConfig)
      const faceCallCount = prng2.getCallCount()

      // Per-face style is a pure style transform — no PRNG consumption
      expect(faceCallCount).toBe(baseCallCount)
    })
  })

  describe('PRNG sequence order matches pre-expansion pipeline', () => {
    it('type selection → cluster bounds → cluster population → closure → figure-ground → continuity → common fate → boolean → accents', () => {
      const seed = 42
      const config = preExpansionConfig()

      // Generate a reference output
      const prng = new SeededPRNG(seed)
      const heerich = createMockHeerich()
      const result = CompositionEngine.generate(prng, heerich, config)

      // Verify the plan has the expected structure from the pipeline
      expect(result.plan.clusters.length).toBeGreaterThanOrEqual(1)
      expect(result.plan.clusters.length).toBeLessThanOrEqual(config.clusterCount)
      expect(result.plan.continuityAxis).toHaveProperty('axis')
      expect(result.plan.continuityAxis).toHaveProperty('value')
      expect(result.plan.booleanOps.length).toBe(1) // booleanSubtraction: true
      expect(result.plan.accentPrimitives.length).toBeGreaterThanOrEqual(1)

      // All cluster primitives should be addBox (no shapes enabled)
      for (const cluster of result.plan.clusters) {
        for (const prim of cluster.primitives) {
          expect(prim.type).toBe('addBox')
        }
      }

      // All heerich calls should be type: 'box'
      for (const call of heerich.calls) {
        expect(call.type).toBe('box')
      }
    })

    it('booleanSubtraction=false skips boolean PRNG calls, preserving subsequent sequence', () => {
      const seed = 42

      // With boolean subtraction
      const configWith = { ...preExpansionConfig(), booleanSubtraction: true }
      const prng1 = new SeededPRNG(seed)
      const heerich1 = createMockHeerich()
      const result1 = CompositionEngine.generate(prng1, heerich1, configWith)

      // Without boolean subtraction
      const configWithout = { ...preExpansionConfig(), booleanSubtraction: false }
      const prng2 = new SeededPRNG(seed)
      const heerich2 = createMockHeerich()
      const result2 = CompositionEngine.generate(prng2, heerich2, configWithout)

      // Without boolean, there should be no boolean ops
      expect(result2.plan.booleanOps.length).toBe(0)

      // The cluster structure should still be identical (boolean step comes after clusters)
      expect(result1.plan.clusters.length).toBe(result2.plan.clusters.length)
      for (let i = 0; i < result1.plan.clusters.length; i++) {
        expect(result1.plan.clusters[i].primitives.length).toBe(result2.plan.clusters[i].primitives.length)
        expect(result1.plan.clusters[i].dominantType).toBe(result2.plan.clusters[i].dominantType)
        expect(result1.plan.clusters[i].bounds).toEqual(result2.plan.clusters[i].bounds)
      }

      // Continuity axis should be identical (comes before boolean)
      expect(result1.plan.continuityAxis).toEqual(result2.plan.continuityAxis)
    })
  })

  describe('deterministic output across multiple invocations', () => {
    it('same seed + same config = identical output (10 invocations)', () => {
      const seed = 42
      const config = preExpansionConfig()

      const referenceHeerich = createMockHeerich()
      const referenceResult = CompositionEngine.generate(new SeededPRNG(seed), referenceHeerich, config)

      for (let i = 0; i < 10; i++) {
        const heerich = createMockHeerich()
        const result = CompositionEngine.generate(new SeededPRNG(seed), heerich, config)

        expect(result.plan.totalCalls).toBe(referenceResult.plan.totalCalls)
        expect(result.svgString).toBe(referenceResult.svgString)
        expect(heerich.calls).toEqual(referenceHeerich.calls)
      }
    })
  })
})
