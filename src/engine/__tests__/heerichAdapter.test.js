// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We test the module's export structure and behavior.
// Actual CDN loading can't be tested in Node, so we mock the DOM/window layer.

describe('heerichAdapter', () => {
  let loadHeerich, createHeerichInstance
  let mockScripts

  beforeEach(async () => {
    // Reset module cache so each test gets a fresh loadPromise
    vi.resetModules()

    mockScripts = []

    // Set up minimal DOM mocks on globalThis
    globalThis.window = globalThis
    globalThis.document = {
      createElement: (tag) => {
        const el = { tagName: tag.toUpperCase(), src: '', async: false, onload: null, onerror: null }
        return el
      },
      head: {
        appendChild: (script) => {
          mockScripts.push(script)
        },
      },
    }
    delete globalThis.window.heerich

    const mod = await import('../heerichAdapter.js')
    loadHeerich = mod.loadHeerich
    createHeerichInstance = mod.createHeerichInstance
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete globalThis.window.heerich
    delete globalThis.document
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

      // Simulate successful load to avoid unhandled rejection
      const script = mockScripts[0]
      globalThis.window.heerich = class MockHeerich {}
      script.onload()
    })

    it('resolves immediately if window.heerich is already available', async () => {
      // Need fresh module with heerich already set
      vi.resetModules()
      globalThis.window.heerich = class MockHeerich {}
      const mod = await import('../heerichAdapter.js')

      const result = await mod.loadHeerich()
      expect(result).toBe(globalThis.window.heerich)
    })

    it('injects a script element into document.head', () => {
      loadHeerich()

      expect(mockScripts).toHaveLength(1)
      const script = mockScripts[0]
      expect(script.tagName).toBe('SCRIPT')
      expect(script.src).toContain('heerich')
      expect(script.async).toBe(true)

      // Clean up
      globalThis.window.heerich = class MockHeerich {}
      script.onload()
    })

    it('resolves with window.heerich on successful load', async () => {
      const MockHeerich = class {}
      const promise = loadHeerich()

      const script = mockScripts[0]
      globalThis.window.heerich = MockHeerich
      script.onload()

      const result = await promise
      expect(result).toBe(MockHeerich)
    })

    it('rejects with descriptive error on script load failure', async () => {
      const promise = loadHeerich()

      const script = mockScripts[0]
      script.onerror()

      await expect(promise).rejects.toThrow(
        'Rendering engine failed to load. Check your internet connection.'
      )
    })

    it('rejects if script loads but window.heerich is not set', async () => {
      const promise = loadHeerich()

      const script = mockScripts[0]
      // onload fires but window.heerich remains undefined
      script.onload()

      await expect(promise).rejects.toThrow(
        'Rendering engine failed to load. Check your internet connection.'
      )
    })

    it('caches the promise on subsequent calls (only one script tag)', async () => {
      const p1 = loadHeerich()
      const p2 = loadHeerich()

      expect(p1).toBe(p2)
      expect(mockScripts).toHaveLength(1)

      // Resolve to avoid unhandled rejection
      globalThis.window.heerich = class MockHeerich {}
      mockScripts[0].onload()
      await p1
    })

    it('allows retry after a failed load', async () => {
      // First call fails
      const p1 = loadHeerich()
      mockScripts[0].onerror()
      await expect(p1).rejects.toThrow()

      // Second call should retry (loadPromise was cleared on failure)
      const p2 = loadHeerich()
      expect(mockScripts).toHaveLength(2)

      globalThis.window.heerich = class MockHeerich {}
      mockScripts[1].onload()

      const result = await p2
      expect(result).toBe(globalThis.window.heerich)
    })
  })

  describe('createHeerichInstance()', () => {
    it('throws if window.heerich is not loaded', () => {
      expect(() =>
        createHeerichInstance({ cameraAngle: 315, gridTileSize: 18, width: 1500, height: 500 })
      ).toThrow('Rendering engine failed to load. Check your internet connection.')
    })

    it('creates an instance with the provided config', () => {
      const constructorSpy = vi.fn()
      globalThis.window.heerich = class MockHeerich {
        constructor(config) {
          constructorSpy(config)
        }
      }

      const config = { cameraAngle: 315, gridTileSize: 18, width: 1500, height: 500 }
      const instance = createHeerichInstance(config)

      expect(constructorSpy).toHaveBeenCalledWith({
        cameraAngle: 315,
        gridTileSize: 18,
        width: 1500,
        height: 500,
      })
      expect(instance).toBeInstanceOf(globalThis.window.heerich)
    })

    it('passes custom camera angle and grid size', () => {
      const constructorSpy = vi.fn()
      globalThis.window.heerich = class MockHeerich {
        constructor(config) {
          constructorSpy(config)
        }
      }

      createHeerichInstance({ cameraAngle: 45, gridTileSize: 32, width: 820, height: 312 })

      expect(constructorSpy).toHaveBeenCalledWith({
        cameraAngle: 45,
        gridTileSize: 32,
        width: 820,
        height: 312,
      })
    })
  })
})
