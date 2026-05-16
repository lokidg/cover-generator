import { describe, it, expect } from 'vitest'
import { applyHatchingAndSmooth } from '../CompositionEngine.js'

/**
 * Helper: creates a primitive with a typical two-level style (default + top).
 */
function makePrimitive(overrides = {}) {
  return {
    type: 'addBox',
    position: [2, 3, 1],
    size: [4, 4, 4],
    style: {
      default: {
        fill: 'rgba(216,216,220,0.10)',
        stroke: 'rgba(0,0,0,0.05)',
        strokeWidth: 0.5,
      },
      top: {
        fill: 'rgba(228,228,231,0.12)',
      },
    },
    ...overrides,
  }
}

describe('applyHatchingAndSmooth', () => {
  describe('when neither hatching nor smooth is enabled', () => {
    it('returns primitives unchanged (no-op)', () => {
      const prims = [makePrimitive(), makePrimitive()]
      const original = JSON.parse(JSON.stringify(prims))
      const config = { hatchingEnabled: false, smoothEnabled: false }

      const result = applyHatchingAndSmooth(prims, config)

      expect(result).toBe(prims) // same reference
      expect(result).toEqual(original) // unchanged content
    })

    it('returns primitives unchanged when config has no hatching/smooth keys', () => {
      const prims = [makePrimitive()]
      const original = JSON.parse(JSON.stringify(prims))
      const config = {}

      const result = applyHatchingAndSmooth(prims, config)

      expect(result).toEqual(original)
    })
  })

  describe('when hatchingEnabled is true', () => {
    it('adds hatch property to each style sub-object with correct angle, period, stroke', () => {
      const prims = [makePrimitive()]
      const config = {
        hatchingEnabled: true,
        hatchAngle: 60,
        hatchDensity: 4,
        hatchColor: '#FF0000',
      }

      applyHatchingAndSmooth(prims, config)

      // density 4 → period = 6 - 4 = 2
      expect(prims[0].style.default.hatch).toEqual({ angle: 60, period: 2, stroke: '#FF0000' })
      expect(prims[0].style.top.hatch).toEqual({ angle: 60, period: 2, stroke: '#FF0000' })
    })

    it('uses default values when hatch params are not provided', () => {
      const prims = [makePrimitive()]
      const config = { hatchingEnabled: true }

      applyHatchingAndSmooth(prims, config)

      // defaults: angle 45, density 3 → period = 6 - 3 = 3, color '#000000'
      expect(prims[0].style.default.hatch).toEqual({ angle: 45, period: 3, stroke: '#000000' })
      expect(prims[0].style.top.hatch).toEqual({ angle: 45, period: 3, stroke: '#000000' })
    })

    it('maps density correctly: density 1 → period 5, density 5 → period 1', () => {
      const prims1 = [makePrimitive()]
      applyHatchingAndSmooth(prims1, { hatchingEnabled: true, hatchDensity: 1 })
      expect(prims1[0].style.default.hatch.period).toBe(5)

      const prims5 = [makePrimitive()]
      applyHatchingAndSmooth(prims5, { hatchingEnabled: true, hatchDensity: 5 })
      expect(prims5[0].style.default.hatch.period).toBe(1)
    })

    it('applies hatch to all primitives in the array', () => {
      const prims = [makePrimitive(), makePrimitive(), makePrimitive()]
      const config = { hatchingEnabled: true, hatchAngle: 90, hatchDensity: 2, hatchColor: '#00FF00' }

      applyHatchingAndSmooth(prims, config)

      for (const prim of prims) {
        expect(prim.style.default.hatch).toEqual({ angle: 90, period: 4, stroke: '#00FF00' })
        expect(prim.style.top.hatch).toEqual({ angle: 90, period: 4, stroke: '#00FF00' })
      }
    })

    it('skips primitives without a style object', () => {
      const prims = [{ type: 'addBox', position: [0, 0, 0], size: [2, 2, 2] }]
      const config = { hatchingEnabled: true }

      // Should not throw
      expect(() => applyHatchingAndSmooth(prims, config)).not.toThrow()
    })

    it('preserves existing style properties alongside hatch', () => {
      const prims = [makePrimitive()]
      const config = { hatchingEnabled: true, hatchAngle: 30, hatchDensity: 3, hatchColor: '#000000' }

      applyHatchingAndSmooth(prims, config)

      expect(prims[0].style.default.fill).toBe('rgba(216,216,220,0.10)')
      expect(prims[0].style.default.stroke).toBe('rgba(0,0,0,0.05)')
      expect(prims[0].style.default.strokeWidth).toBe(0.5)
      expect(prims[0].style.default.hatch).toBeDefined()
    })
  })

  describe('when smoothEnabled is true and hatchingEnabled is false', () => {
    it('sets stroke equal to fill on each style sub-object', () => {
      const prims = [makePrimitive()]
      const config = { hatchingEnabled: false, smoothEnabled: true }

      applyHatchingAndSmooth(prims, config)

      expect(prims[0].style.default.stroke).toBe(prims[0].style.default.fill)
      // top has fill but originally no stroke — after smooth, stroke should equal fill
      expect(prims[0].style.top.stroke).toBe(prims[0].style.top.fill)
    })

    it('does not add hatch property', () => {
      const prims = [makePrimitive()]
      const config = { smoothEnabled: true }

      applyHatchingAndSmooth(prims, config)

      expect(prims[0].style.default.hatch).toBeUndefined()
      expect(prims[0].style.top.hatch).toBeUndefined()
    })

    it('applies smooth to all primitives', () => {
      const prims = [makePrimitive(), makePrimitive()]
      const config = { smoothEnabled: true }

      applyHatchingAndSmooth(prims, config)

      for (const prim of prims) {
        expect(prim.style.default.stroke).toBe(prim.style.default.fill)
      }
    })

    it('skips style sub-objects without a fill property', () => {
      const prim = makePrimitive()
      // Add a sub-object without fill
      prim.style.extra = { strokeWidth: 2 }
      const config = { smoothEnabled: true }

      applyHatchingAndSmooth([prim], config)

      // extra should not get a stroke set (no fill to copy from)
      expect(prim.style.extra.stroke).toBeUndefined()
    })
  })

  describe('when both hatchingEnabled and smoothEnabled are true', () => {
    it('hatching wins — hatch is applied, smooth is NOT applied', () => {
      const prims = [makePrimitive()]
      const originalStroke = prims[0].style.default.stroke
      const config = {
        hatchingEnabled: true,
        smoothEnabled: true,
        hatchAngle: 120,
        hatchDensity: 2,
        hatchColor: '#0000FF',
      }

      applyHatchingAndSmooth(prims, config)

      // Hatch should be present
      expect(prims[0].style.default.hatch).toEqual({ angle: 120, period: 4, stroke: '#0000FF' })
      // Stroke should NOT be set to fill (smooth not applied)
      expect(prims[0].style.default.stroke).toBe(originalStroke)
    })
  })

  describe('edge cases', () => {
    it('handles empty primitives array', () => {
      const prims = []
      const config = { hatchingEnabled: true }

      const result = applyHatchingAndSmooth(prims, config)

      expect(result).toEqual([])
    })

    it('handles hatchAngle of 0', () => {
      const prims = [makePrimitive()]
      const config = { hatchingEnabled: true, hatchAngle: 0, hatchDensity: 3, hatchColor: '#000000' }

      applyHatchingAndSmooth(prims, config)

      expect(prims[0].style.default.hatch.angle).toBe(0)
    })

    it('handles hatchAngle of 180', () => {
      const prims = [makePrimitive()]
      const config = { hatchingEnabled: true, hatchAngle: 180, hatchDensity: 3, hatchColor: '#000000' }

      applyHatchingAndSmooth(prims, config)

      expect(prims[0].style.default.hatch.angle).toBe(180)
    })

    it('mutates primitives in place and returns the same array reference', () => {
      const prims = [makePrimitive()]
      const config = { hatchingEnabled: true }

      const result = applyHatchingAndSmooth(prims, config)

      expect(result).toBe(prims)
    })
  })
})
