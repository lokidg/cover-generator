// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('heerichAdapter', () => {
  let loadHeerich, createHeerichInstance
  let MockHeerich
  let constructorSpy

  beforeEach(async () => {
    vi.resetModules()

    constructorSpy = vi.fn()
    MockHeerich = class {
      constructor(config) {
        constructorSpy(config)
      }
    }

    // Mock the dynamic import to return our mock Heerich class
    vi.stubGlobal('window', globalThis)

    const mod = await import('../heerichAdapter.js')
    loadHeerich = mod.loadHeerich
    createHeerichInstance = mod.createHeerichInstance
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('module exports', () => {
    it('exports loadHeerich as a function', () => {
      expect(typeof loadHeerich).toBe('function')
    })

    it('exports createHeerichInstance as a function', () => {
      expect(typeof createHeerichInstance).toBe('function')
    })
  })

  describe('loadHeerich()', () => {
    it('returns a Promise', () => {
      const result = loadHeerich()
      expect(result).toBeInstanceOf(Promise)
      // Let it reject gracefully (CDN not available in test)
      result.catch(() => {})
    })

    it('caches the promise on subsequent calls', () => {
      const p1 = loadHeerich()
      const p2 = loadHeerich()
      expect(p1).toBe(p2)
      // Let it reject gracefully
      p1.catch(() => {})
    })

    it('rejects with descriptive error when CDN is unavailable', async () => {
      await expect(loadHeerich()).rejects.toThrow(
        'Rendering engine failed to load. Check your internet connection.'
      )
    })

    it('allows retry after a failed load', async () => {
      // First call fails
      await expect(loadHeerich()).rejects.toThrow()

      // Second call should retry (loadPromise was cleared on failure)
      const p2 = loadHeerich()
      expect(p2).toBeInstanceOf(Promise)
      await expect(p2).rejects.toThrow()
    })
  })

  describe('createHeerichInstance()', () => {
    it('throws if Heerich is not loaded', () => {
      expect(() =>
        createHeerichInstance({ cameraAngle: 315, gridTileSize: 18, width: 1500, height: 500 })
      ).toThrow('Rendering engine failed to load. Check your internet connection.')
    })
  })

  describe('createHeerichInstance() — with loaded Heerich', () => {
    // For these tests we need HeerichClass to be set.
    // We achieve this by mocking the dynamic import at module level.
    let createHeerichInstance

    beforeEach(async () => {
      vi.resetModules()

      constructorSpy = vi.fn()
      MockHeerich = class {
        constructor(config) {
          constructorSpy(config)
        }
      }

      // Mock the CDN import to return our mock module
      vi.stubGlobal('window', globalThis)
      vi.doMock(
        'https://cdn.jsdelivr.net/npm/heerich@latest/dist/heerich.js',
        () => ({ Heerich: MockHeerich }),
        { virtual: true }
      )

      const mod = await import('../heerichAdapter.js')
      // Load Heerich so HeerichClass is set
      await mod.loadHeerich()
      createHeerichInstance = mod.createHeerichInstance
    })

    it('creates an instance with default config (backward compat)', () => {
      const config = { cameraAngle: 315, gridTileSize: 18, width: 1500, height: 500 }
      const instance = createHeerichInstance(config)

      expect(constructorSpy).toHaveBeenCalledWith({
        tile: [18, 18],
        camera: { type: 'oblique', angle: 315, distance: 20 },
        style: { fill: '#E0E0E3', stroke: 'rgba(0,0,0,0.06)', strokeWidth: 0.5 },
        gap: 0,
      })
      expect(instance).toBeInstanceOf(MockHeerich)
    })

    it('passes custom camera angle and grid size', () => {
      createHeerichInstance({ cameraAngle: 45, gridTileSize: 32, width: 820, height: 312 })

      expect(constructorSpy).toHaveBeenCalledWith({
        tile: [32, 32],
        camera: { type: 'oblique', angle: 45, distance: 20 },
        style: { fill: '#E0E0E3', stroke: 'rgba(0,0,0,0.06)', strokeWidth: 0.5 },
        gap: 0,
      })
    })

    it('passes camera type and distance when provided', () => {
      createHeerichInstance({
        cameraType: 'perspective',
        cameraAngle: 270,
        cameraDistance: 40,
        gridTileSize: 18,
        width: 1500,
        height: 500,
      })

      expect(constructorSpy).toHaveBeenCalledWith({
        tile: [18, 18],
        camera: { type: 'perspective', angle: 270, distance: 40 },
        style: { fill: '#E0E0E3', stroke: 'rgba(0,0,0,0.06)', strokeWidth: 0.5 },
        gap: 0,
      })
    })

    it('passes all camera types correctly', () => {
      const types = ['oblique', 'perspective', 'orthographic', 'isometric']
      for (const type of types) {
        constructorSpy.mockClear()
        createHeerichInstance({
          cameraType: type,
          cameraAngle: 315,
          gridTileSize: 18,
          width: 1500,
          height: 500,
        })
        const calledConfig = constructorSpy.mock.calls[0][0]
        expect(calledConfig.camera.type).toBe(type)
      }
    })

    it('passes gap to Heerich constructor', () => {
      createHeerichInstance({
        cameraAngle: 315,
        gridTileSize: 18,
        gap: 0.1,
        width: 1500,
        height: 500,
      })

      expect(constructorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ gap: 0.1 })
      )
    })

    it('includes outline properties when outlineWidth > 0', () => {
      createHeerichInstance({
        cameraAngle: 315,
        gridTileSize: 18,
        outlineWidth: 2,
        outlineColor: '#FF0000',
        width: 1500,
        height: 500,
      })

      const calledConfig = constructorSpy.mock.calls[0][0]
      expect(calledConfig.style.outlineWidth).toBe(2)
      expect(calledConfig.style.outlineColor).toBe('#FF0000')
    })

    it('omits outline properties when outlineWidth is 0', () => {
      createHeerichInstance({
        cameraAngle: 315,
        gridTileSize: 18,
        outlineWidth: 0,
        outlineColor: '#FF0000',
        width: 1500,
        height: 500,
      })

      const calledConfig = constructorSpy.mock.calls[0][0]
      expect(calledConfig.style).not.toHaveProperty('outlineWidth')
      expect(calledConfig.style).not.toHaveProperty('outlineColor')
    })

    it('omits outline properties when outlineWidth is not provided', () => {
      createHeerichInstance({
        cameraAngle: 315,
        gridTileSize: 18,
        width: 1500,
        height: 500,
      })

      const calledConfig = constructorSpy.mock.calls[0][0]
      expect(calledConfig.style).not.toHaveProperty('outlineWidth')
      expect(calledConfig.style).not.toHaveProperty('outlineColor')
    })

    it('passes custom fill and stroke colors', () => {
      createHeerichInstance({
        cameraAngle: 315,
        gridTileSize: 18,
        fillColor: '#4F46E5',
        strokeColor: '#000000',
        strokeWidth: 1.5,
        width: 1500,
        height: 500,
      })

      const calledConfig = constructorSpy.mock.calls[0][0]
      expect(calledConfig.style.fill).toBe('#4F46E5')
      expect(calledConfig.style.stroke).toBe('#000000')
      expect(calledConfig.style.strokeWidth).toBe(1.5)
    })

    it('defaults to oblique, angle 315, distance 20, gap 0 when no params provided', () => {
      createHeerichInstance({})

      expect(constructorSpy).toHaveBeenCalledWith({
        tile: [18, 18],
        camera: { type: 'oblique', angle: 315, distance: 20 },
        style: { fill: '#E0E0E3', stroke: 'rgba(0,0,0,0.06)', strokeWidth: 0.5 },
        gap: 0,
      })
    })
  })
})
