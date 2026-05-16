import { describe, it, expect } from 'vitest'
import { applyPerFaceStyle } from '../CompositionEngine.js'

describe('applyPerFaceStyle', () => {
  describe('no-op behavior', () => {
    it('returns primitives unchanged when perFaceEnabled is false', () => {
      const primitives = [
        {
          position: [2, 3, 4],
          size: [3, 4, 5],
          style: {
            default: { fill: 'rgba(200,200,200,0.10)', stroke: 'rgba(0,0,0,0.05)', strokeWidth: 0.5 },
            top: { fill: 'rgba(210,210,210,0.12)' },
          },
        },
      ]
      const originalStyle = { ...primitives[0].style }
      const result = applyPerFaceStyle(primitives, { perFaceEnabled: false })
      expect(result[0].style).toEqual(originalStyle)
    })

    it('returns primitives unchanged when perFaceEnabled is not provided', () => {
      const primitives = [
        {
          position: [2, 3, 4],
          size: [3, 4, 5],
          style: {
            default: { fill: '#AABBCC', stroke: '#000000' },
            top: { fill: '#DDEEFF' },
          },
        },
      ]
      const originalStyle = { ...primitives[0].style }
      const result = applyPerFaceStyle(primitives, {})
      expect(result[0].style).toEqual(originalStyle)
    })

    it('returns the same array reference', () => {
      const primitives = [{ position: [0, 0, 0], size: [1, 1, 1], style: { default: {} } }]
      const result = applyPerFaceStyle(primitives, { perFaceEnabled: false })
      expect(result).toBe(primitives)
    })
  })

  describe('per-face style application', () => {
    it('restructures style with top, left, right keys when enabled', () => {
      const primitives = [
        {
          position: [2, 3, 4],
          size: [3, 4, 5],
          style: {
            default: { fill: 'rgba(200,200,200,0.10)', stroke: 'rgba(0,0,0,0.05)', strokeWidth: 0.5 },
            top: { fill: 'rgba(210,210,210,0.12)' },
          },
        },
      ]
      applyPerFaceStyle(primitives, {
        perFaceEnabled: true,
        faceTopColor: '#FF0000',
        faceLeftColor: '#00FF00',
        faceRightColor: '#0000FF',
      })

      const style = primitives[0].style
      expect(style.top).toBeDefined()
      expect(style.left).toBeDefined()
      expect(style.right).toBeDefined()
      expect(style.top.fill).toBe('#FF0000')
      expect(style.left.fill).toBe('#00FF00')
      expect(style.right.fill).toBe('#0000FF')
    })

    it('includes stroke property on each face derived from fill (darker)', () => {
      const primitives = [
        {
          position: [0, 0, 0],
          size: [2, 2, 2],
          style: { default: { fill: '#FFFFFF', stroke: '#000000' } },
        },
      ]
      applyPerFaceStyle(primitives, {
        perFaceEnabled: true,
        faceTopColor: '#FFFFFF',
        faceLeftColor: '#808080',
        faceRightColor: '#000000',
      })

      const style = primitives[0].style
      // Stroke should be a hex string (darker than fill)
      expect(style.top.stroke).toMatch(/^#[0-9a-f]{6}$/)
      expect(style.left.stroke).toMatch(/^#[0-9a-f]{6}$/)
      expect(style.right.stroke).toMatch(/^#[0-9a-f]{6}$/)

      // Top face: #FFFFFF darkened by 15% → each channel: 255 * 0.85 = 217 → #d9d9d9
      expect(style.top.stroke).toBe('#d9d9d9')
      // Left face: #808080 darkened by 15% → each channel: 128 * 0.85 = 109 → #6d6d6d
      expect(style.left.stroke).toBe('#6d6d6d')
      // Right face: #000000 darkened → stays #000000
      expect(style.right.stroke).toBe('#000000')
    })

    it('preserves existing default style as fallback', () => {
      const originalDefault = { fill: 'rgba(200,200,200,0.10)', stroke: 'rgba(0,0,0,0.05)', strokeWidth: 0.5 }
      const primitives = [
        {
          position: [0, 0, 0],
          size: [2, 2, 2],
          style: { default: { ...originalDefault }, top: { fill: '#AAA' } },
        },
      ]
      applyPerFaceStyle(primitives, {
        perFaceEnabled: true,
        faceTopColor: '#FF0000',
        faceLeftColor: '#00FF00',
        faceRightColor: '#0000FF',
      })

      expect(primitives[0].style.default).toEqual(originalDefault)
    })

    it('uses default color #E0E0E3 when face colors are not provided', () => {
      const primitives = [
        {
          position: [0, 0, 0],
          size: [2, 2, 2],
          style: { default: { fill: '#CCC' } },
        },
      ]
      applyPerFaceStyle(primitives, { perFaceEnabled: true })

      const style = primitives[0].style
      expect(style.top.fill).toBe('#E0E0E3')
      expect(style.left.fill).toBe('#E0E0E3')
      expect(style.right.fill).toBe('#E0E0E3')
    })

    it('applies to multiple primitives', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: '#AAA' } } },
        { position: [5, 5, 5], size: [3, 3, 3], style: { default: { fill: '#BBB' } } },
        { position: [8, 8, 8], size: [1, 1, 1], style: { default: { fill: '#CCC' } } },
      ]
      applyPerFaceStyle(primitives, {
        perFaceEnabled: true,
        faceTopColor: '#FF0000',
        faceLeftColor: '#00FF00',
        faceRightColor: '#0000FF',
      })

      for (const prim of primitives) {
        expect(prim.style.top.fill).toBe('#FF0000')
        expect(prim.style.left.fill).toBe('#00FF00')
        expect(prim.style.right.fill).toBe('#0000FF')
      }
    })

    it('skips primitives without a style property', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: '#AAA' } } },
        { position: [5, 5, 5], size: [3, 3, 3] }, // no style
        { position: [8, 8, 8], size: [1, 1, 1], style: null }, // null style
      ]
      // Should not throw
      applyPerFaceStyle(primitives, {
        perFaceEnabled: true,
        faceTopColor: '#FF0000',
        faceLeftColor: '#00FF00',
        faceRightColor: '#0000FF',
      })

      expect(primitives[0].style.top.fill).toBe('#FF0000')
      expect(primitives[1].style).toBeUndefined()
      expect(primitives[2].style).toBeNull()
    })

    it('mutates primitives in place and returns the same array', () => {
      const primitives = [
        { position: [0, 0, 0], size: [2, 2, 2], style: { default: { fill: '#AAA' } } },
      ]
      const result = applyPerFaceStyle(primitives, {
        perFaceEnabled: true,
        faceTopColor: '#FF0000',
        faceLeftColor: '#00FF00',
        faceRightColor: '#0000FF',
      })
      expect(result).toBe(primitives)
    })
  })

  describe('per-face overrides functional style', () => {
    it('overwrites functional style fills with per-face colors', () => {
      // Simulate a primitive that already had functional style applied (gradient fill)
      const primitives = [
        {
          position: [0, 0, 0],
          size: [2, 2, 2],
          style: {
            default: { fill: '#7F6AF4', stroke: '#6B5AD0' },
            top: { fill: '#9080FF' },
          },
        },
      ]
      applyPerFaceStyle(primitives, {
        perFaceEnabled: true,
        faceTopColor: '#FF0000',
        faceLeftColor: '#00FF00',
        faceRightColor: '#0000FF',
      })

      // Per-face should override the functional style colors
      expect(primitives[0].style.top.fill).toBe('#FF0000')
      expect(primitives[0].style.left.fill).toBe('#00FF00')
      expect(primitives[0].style.right.fill).toBe('#0000FF')
    })
  })

  describe('style structure matches Heerich per-face format', () => {
    it('produces the expected Heerich per-face style structure', () => {
      const primitives = [
        {
          position: [0, 0, 0],
          size: [2, 2, 2],
          style: { default: { fill: '#E0E0E3', stroke: '#000000', strokeWidth: 0.5 } },
        },
      ]
      applyPerFaceStyle(primitives, {
        perFaceEnabled: true,
        faceTopColor: '#AABBCC',
        faceLeftColor: '#DDEEFF',
        faceRightColor: '#112233',
      })

      const style = primitives[0].style
      // Should have default, top, left, right keys
      expect(Object.keys(style)).toContain('default')
      expect(Object.keys(style)).toContain('top')
      expect(Object.keys(style)).toContain('left')
      expect(Object.keys(style)).toContain('right')

      // Each face should have fill and stroke
      expect(style.top).toHaveProperty('fill')
      expect(style.top).toHaveProperty('stroke')
      expect(style.left).toHaveProperty('fill')
      expect(style.left).toHaveProperty('stroke')
      expect(style.right).toHaveProperty('fill')
      expect(style.right).toHaveProperty('stroke')
    })
  })
})
