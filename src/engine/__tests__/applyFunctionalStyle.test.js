import { describe, it, expect } from 'vitest'
import { applyFunctionalStyle, parseHex, lerpColor } from '../CompositionEngine.js'

describe('parseHex', () => {
  it('parses a standard hex color', () => {
    expect(parseHex('#E0E0E3')).toEqual([224, 224, 227])
  })

  it('parses a hex color without hash prefix', () => {
    expect(parseHex('4F46E5')).toEqual([79, 70, 229])
  })

  it('parses black', () => {
    expect(parseHex('#000000')).toEqual([0, 0, 0])
  })

  it('parses white', () => {
    expect(parseHex('#FFFFFF')).toEqual([255, 255, 255])
  })
})

describe('lerpColor', () => {
  it('returns start color at t=0', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 0)).toBe('#000000')
  })

  it('returns end color at t=1', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 1)).toBe('#ffffff')
  })

  it('returns midpoint at t=0.5', () => {
    const result = lerpColor([0, 0, 0], [254, 254, 254], 0.5)
    expect(result).toBe('#7f7f7f')
  })

  it('clamps t below 0 to 0', () => {
    expect(lerpColor([100, 100, 100], [200, 200, 200], -1)).toBe('#646464')
  })

  it('clamps t above 1 to 1', () => {
    expect(lerpColor([100, 100, 100], [200, 200, 200], 2)).toBe('#c8c8c8')
  })

  it('handles identical start and end colors', () => {
    expect(lerpColor([128, 64, 32], [128, 64, 32], 0.5)).toBe('#804020')
  })
})

describe('applyFunctionalStyle', () => {
  const baseConfig = { gridTileSize: 18 }

  describe('disabled / no-op', () => {
    it('returns primitives unchanged when functionalStyleEnabled is false', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: 'red', stroke: 'black' } } },
      ]
      const result = applyFunctionalStyle(primitives, { ...baseConfig, functionalStyleEnabled: false })
      expect(result[0].style.default.fill).toBe('red')
    })

    it('returns primitives unchanged when functionalStyleEnabled is not provided', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: 'red' } } },
      ]
      const result = applyFunctionalStyle(primitives, baseConfig)
      expect(result[0].style.default.fill).toBe('red')
    })

    it('returns empty array unchanged', () => {
      const result = applyFunctionalStyle([], { ...baseConfig, functionalStyleEnabled: true })
      expect(result).toEqual([])
    })

    it('returns null/undefined primitives unchanged', () => {
      const result = applyFunctionalStyle(null, { ...baseConfig, functionalStyleEnabled: true })
      expect(result).toBeNull()
    })
  })

  describe('gradient-x', () => {
    it('applies gradient along X axis', () => {
      const primitives = [
        { position: [0, 5, 5], size: [2, 2, 2], style: { default: { fill: 'old', stroke: 'black' } } },
        { position: [10, 5, 5], size: [2, 2, 2], style: { default: { fill: 'old', stroke: 'black' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
        styleStartColor: '#000000',
        styleEndColor: '#ffffff',
      })
      // First primitive at x=0 (min) → start color
      expect(primitives[0].style.default.fill).toBe('#000000')
      // Second primitive at x=10 (max) → end color
      expect(primitives[1].style.default.fill).toBe('#ffffff')
    })

    it('computes midpoint correctly for gradient-x', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [5, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [10, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
        styleStartColor: '#000000',
        styleEndColor: '#fe0000',
      })
      expect(primitives[0].style.default.fill).toBe('#000000')
      // t = 5/10 = 0.5 → round(254*0.5) = 127 → #7f0000
      expect(primitives[1].style.default.fill).toBe('#7f0000')
      expect(primitives[2].style.default.fill).toBe('#fe0000')
    })

    it('preserves stroke and other style properties', () => {
      const primitives = [
        {
          position: [0, 0, 0],
          size: [2, 2, 2],
          style: { default: { fill: 'old', stroke: 'rgba(0,0,0,0.05)', strokeWidth: 0.5 }, top: { fill: 'topfill' } },
        },
        {
          position: [10, 0, 0],
          size: [2, 2, 2],
          style: { default: { fill: 'old', stroke: 'rgba(0,0,0,0.06)', strokeWidth: 0.5 }, top: { fill: 'topfill2' } },
        },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
        styleStartColor: '#000000',
        styleEndColor: '#ffffff',
      })
      // Stroke preserved
      expect(primitives[0].style.default.stroke).toBe('rgba(0,0,0,0.05)')
      expect(primitives[0].style.default.strokeWidth).toBe(0.5)
      // Top preserved
      expect(primitives[0].style.top.fill).toBe('topfill')
    })
  })

  describe('gradient-y', () => {
    it('applies gradient along Y axis', () => {
      const primitives = [
        { position: [5, 0, 5], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [5, 10, 5], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-y',
        styleStartColor: '#ff0000',
        styleEndColor: '#0000ff',
      })
      expect(primitives[0].style.default.fill).toBe('#ff0000')
      expect(primitives[1].style.default.fill).toBe('#0000ff')
    })
  })

  describe('gradient-z', () => {
    it('applies gradient along Z axis', () => {
      const primitives = [
        { position: [5, 5, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [5, 5, 20], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-z',
        styleStartColor: '#000000',
        styleEndColor: '#ffffff',
      })
      expect(primitives[0].style.default.fill).toBe('#000000')
      expect(primitives[1].style.default.fill).toBe('#ffffff')
    })
  })

  describe('radial', () => {
    it('applies radial gradient from centroid', () => {
      // Centroid will be at (5, 5, 5)
      const primitives = [
        { position: [5, 5, 5], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [10, 10, 10], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'radial',
        styleStartColor: '#000000',
        styleEndColor: '#ffffff',
      })
      // Centroid primitive (distance 0) → start color
      expect(primitives[0].style.default.fill).toBe('#000000')
      // Corner primitives are equidistant from centroid → same end color
      expect(primitives[1].style.default.fill).toBe(primitives[2].style.default.fill)
      expect(primitives[1].style.default.fill).toBe('#ffffff')
    })

    it('handles single primitive (all at centroid, distance 0)', () => {
      const primitives = [
        { position: [5, 5, 5], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'radial',
        styleStartColor: '#ff0000',
        styleEndColor: '#0000ff',
      })
      // Single primitive → distance 0, maxDist 0 → t=0 → start color
      expect(primitives[0].style.default.fill).toBe('#ff0000')
    })
  })

  describe('edge cases', () => {
    it('handles primitives without style object', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2] },
        { position: [10, 0, 0], size: [2, 2, 2] },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
        styleStartColor: '#000000',
        styleEndColor: '#ffffff',
      })
      expect(primitives[0].style.default.fill).toBe('#000000')
      expect(primitives[1].style.default.fill).toBe('#ffffff')
    })

    it('handles primitives without style.default', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { top: { fill: 'topfill' } } },
        { position: [10, 0, 0], size: [2, 2, 2], style: { top: { fill: 'topfill' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
        styleStartColor: '#000000',
        styleEndColor: '#ffffff',
      })
      expect(primitives[0].style.default.fill).toBe('#000000')
      expect(primitives[1].style.default.fill).toBe('#ffffff')
      // Top preserved
      expect(primitives[0].style.top.fill).toBe('topfill')
    })

    it('handles all primitives at same position (range = 0)', () => {
      const primitives = [
        { position: [5, 5, 5], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [5, 5, 5], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
        styleStartColor: '#ff0000',
        styleEndColor: '#0000ff',
      })
      // All at same position → t=0 → start color
      expect(primitives[0].style.default.fill).toBe('#ff0000')
      expect(primitives[1].style.default.fill).toBe('#ff0000')
    })

    it('uses default styleFunction (gradient-x) when not specified', () => {
      const primitives = [
        { position: [0, 5, 5], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [10, 5, 5], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleStartColor: '#000000',
        styleEndColor: '#ffffff',
      })
      expect(primitives[0].style.default.fill).toBe('#000000')
      expect(primitives[1].style.default.fill).toBe('#ffffff')
    })

    it('uses default colors when not specified', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [10, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
      })
      // Default start: #E0E0E3, default end: #4F46E5
      expect(primitives[0].style.default.fill).toBe('#e0e0e3')
      expect(primitives[1].style.default.fill).toBe('#4f46e5')
    })

    it('skips primitives without valid position', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { size: [2, 2, 2], style: { default: { fill: 'untouched' } } },
        { position: [10, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
        styleStartColor: '#000000',
        styleEndColor: '#ffffff',
      })
      expect(primitives[0].style.default.fill).toBe('#000000')
      expect(primitives[1].style.default.fill).toBe('untouched')
      expect(primitives[2].style.default.fill).toBe('#ffffff')
    })

    it('identical start and end colors produce uniform fill', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [5, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
        { position: [10, 0, 0], size: [2, 2, 2], style: { default: { fill: 'old' } } },
      ]
      applyFunctionalStyle(primitives, {
        ...baseConfig,
        functionalStyleEnabled: true,
        styleFunction: 'gradient-x',
        styleStartColor: '#aabbcc',
        styleEndColor: '#aabbcc',
      })
      expect(primitives[0].style.default.fill).toBe('#aabbcc')
      expect(primitives[1].style.default.fill).toBe('#aabbcc')
      expect(primitives[2].style.default.fill).toBe('#aabbcc')
    })
  })
})
