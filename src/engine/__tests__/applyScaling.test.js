import { describe, it, expect } from 'vitest'
import { applyScaling } from '../CompositionEngine.js'

describe('applyScaling', () => {
  const baseConfig = { gridTileSize: 18 }

  describe('disabled / no-op', () => {
    it('returns primitives unchanged when scalingEnabled is false', () => {
      const primitives = [
        { position: [2, 3, 4], size: [6, 8, 10] },
      ]
      const result = applyScaling(primitives, { ...baseConfig, scalingEnabled: false })
      expect(result[0].position).toEqual([2, 3, 4])
      expect(result[0].size).toEqual([6, 8, 10])
    })

    it('returns primitives unchanged when scalingEnabled is not provided', () => {
      const primitives = [
        { position: [2, 3, 4], size: [6, 8, 10] },
      ]
      const result = applyScaling(primitives, baseConfig)
      expect(result[0].position).toEqual([2, 3, 4])
      expect(result[0].size).toEqual([6, 8, 10])
    })

    it('does not modify positions in any mode', () => {
      const primitives = [
        { position: [5, 7, 9], size: [4, 4, 4] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'static',
        scaleX: 2.0,
        scaleY: 2.0,
        scaleZ: 2.0,
      })
      expect(primitives[0].position).toEqual([5, 7, 9])
    })
  })

  describe('static mode', () => {
    it('multiplies size by scale factors', () => {
      const primitives = [
        { position: [0, 0, 0], size: [4, 6, 8] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'static',
        scaleX: 2.0,
        scaleY: 1.5,
        scaleZ: 0.5,
      })
      expect(primitives[0].size).toEqual([8, 9, 4])
    })

    it('defaults scale factors to 1.0 when not provided', () => {
      const primitives = [
        { position: [0, 0, 0], size: [4, 6, 8] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'static',
      })
      expect(primitives[0].size).toEqual([4, 6, 8])
    })

    it('clamps size dimensions to minimum of 1', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'static',
        scaleX: 0.1,
        scaleY: 0.1,
        scaleZ: 0.1,
      })
      // 2 * 0.1 = 0.2, rounds to 0, clamped to 1
      expect(primitives[0].size[0]).toBeGreaterThanOrEqual(1)
      expect(primitives[0].size[1]).toBeGreaterThanOrEqual(1)
      expect(primitives[0].size[2]).toBeGreaterThanOrEqual(1)
    })

    it('handles multiple primitives', () => {
      const primitives = [
        { position: [0, 0, 0], size: [4, 4, 4] },
        { position: [5, 5, 5], size: [6, 6, 6] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'static',
        scaleX: 2.0,
        scaleY: 2.0,
        scaleZ: 2.0,
      })
      expect(primitives[0].size).toEqual([8, 8, 8])
      expect(primitives[1].size).toEqual([12, 12, 12])
    })

    it('skips primitives without size', () => {
      const primitives = [
        { position: [0, 0, 0], size: [4, 4, 4] },
        { type: 'removeBox', style: null },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'static',
        scaleX: 2.0,
        scaleY: 2.0,
        scaleZ: 2.0,
      })
      expect(primitives[0].size).toEqual([8, 8, 8])
      expect(primitives[1]).toEqual({ type: 'removeBox', style: null })
    })
  })

  describe('functional mode — taper', () => {
    it('applies linear interpolation from 1.0 to taperEndScale along Y axis', () => {
      // Position at Y=0 → t=0 → scale=1.0
      // Position at Y=9 → t=0.5 → scale=0.75 (lerp from 1.0 to 0.5)
      // Position at Y=18 → t=1.0 → scale=0.5
      const primitives = [
        { position: [0, 0, 0], size: [10, 10, 10] },
        { position: [0, 9, 0], size: [10, 10, 10] },
        { position: [0, 18, 0], size: [10, 10, 10] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'functional',
        scalingFunction: 'taper',
        scalingAxis: 'Y',
        taperEndScale: 0.5,
      })
      // t=0: scale=1.0, size stays [10,10,10]
      expect(primitives[0].size).toEqual([10, 10, 10])
      // t=0.5: scale=0.75, size=[8,8,8] (round(10*0.75)=8)
      expect(primitives[1].size).toEqual([8, 8, 8])
      // t=1.0: scale=0.5, size=[5,5,5]
      expect(primitives[2].size).toEqual([5, 5, 5])
    })

    it('works along X axis', () => {
      const primitives = [
        { position: [9, 0, 0], size: [10, 10, 10] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'functional',
        scalingFunction: 'taper',
        scalingAxis: 'X',
        taperEndScale: 0.5,
      })
      // t=9/18=0.5, scale=0.75
      expect(primitives[0].size).toEqual([8, 8, 8])
    })

    it('works along Z axis', () => {
      const primitives = [
        { position: [0, 0, 18], size: [10, 10, 10] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'functional',
        scalingFunction: 'taper',
        scalingAxis: 'Z',
        taperEndScale: 0.5,
      })
      // t=18/18=1.0, scale=0.5
      expect(primitives[0].size).toEqual([5, 5, 5])
    })
  })

  describe('functional mode — step', () => {
    it('applies stepScale uniformly to all primitives', () => {
      const primitives = [
        { position: [0, 0, 0], size: [10, 10, 10] },
        { position: [0, 9, 0], size: [10, 10, 10] },
        { position: [0, 14, 0], size: [10, 10, 10] },
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'functional',
        scalingFunction: 'step',
        scalingAxis: 'Y',
        stepCount: 4,
        stepScale: 0.8,
      })
      // All primitives get stepScale=0.8 applied: round(10*0.8)=8
      expect(primitives[0].size).toEqual([8, 8, 8])
      expect(primitives[1].size).toEqual([8, 8, 8])
      expect(primitives[2].size).toEqual([8, 8, 8])
    })
  })

  describe('functional mode — wave', () => {
    it('applies sinusoidal scale based on position', () => {
      // At t=0: sin(0)=0, scale=1.0
      // At t=0.25: sin(π/2)=1, scale=1+0.3=1.3
      const primitives = [
        { position: [0, 0, 0], size: [10, 10, 10] },
        { position: [0, 4.5, 0], size: [10, 10, 10] }, // t=4.5/18=0.25
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'functional',
        scalingFunction: 'wave',
        scalingAxis: 'Y',
        waveFrequency: 1.0,
        waveAmplitude: 0.3,
      })
      // t=0: scale=1+0.3*sin(0)=1.0, size=[10,10,10]
      expect(primitives[0].size).toEqual([10, 10, 10])
      // t=0.25: scale=1+0.3*sin(π/2)=1.3, size=[13,13,13]
      expect(primitives[1].size).toEqual([13, 13, 13])
    })

    it('handles negative sine values (scale < 1)', () => {
      // At t=0.75: sin(3π/2)=-1, scale=1+0.3*(-1)=0.7
      const primitives = [
        { position: [0, 13.5, 0], size: [10, 10, 10] }, // t=13.5/18=0.75
      ]
      applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'functional',
        scalingFunction: 'wave',
        scalingAxis: 'Y',
        waveFrequency: 1.0,
        waveAmplitude: 0.3,
      })
      // scale=0.7, size=[7,7,7]
      expect(primitives[0].size).toEqual([7, 7, 7])
    })
  })

  describe('edge cases', () => {
    it('returns the same array reference (mutates in place)', () => {
      const primitives = [
        { position: [0, 0, 0], size: [4, 4, 4] },
      ]
      const result = applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'static',
        scaleX: 2.0,
        scaleY: 2.0,
        scaleZ: 2.0,
      })
      expect(result).toBe(primitives)
    })

    it('handles empty primitives array', () => {
      const primitives = []
      const result = applyScaling(primitives, {
        ...baseConfig,
        scalingEnabled: true,
        scalingMode: 'static',
        scaleX: 2.0,
      })
      expect(result).toEqual([])
    })

    it('handles gridTileSize of 0 gracefully in functional mode', () => {
      const primitives = [
        { position: [0, 0, 0], size: [10, 10, 10] },
      ]
      // Should not throw — t will be 0
      applyScaling(primitives, {
        ...baseConfig,
        gridTileSize: 0,
        scalingEnabled: true,
        scalingMode: 'functional',
        scalingFunction: 'taper',
        scalingAxis: 'Y',
        taperEndScale: 0.5,
      })
      // t=0, scale=1.0
      expect(primitives[0].size).toEqual([10, 10, 10])
    })
  })
})
