/**
 * Unit tests for SVG-to-Canvas rasterizer
 * Validates: Requirements 1.1, 8.4
 *
 * Since this module uses browser-only APIs (Blob, URL.createObjectURL, Image),
 * we mock these globals to test the logic in a Node environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rasterizeSvg } from '../svgToCanvas.js'

describe('svgToCanvas - rasterizeSvg()', () => {
  let mockImage
  let blobInstances
  let originalImage
  let originalBlob
  let originalURL

  beforeEach(() => {
    // Track Image instances — use a real object that the code can assign onload/onerror to
    mockImage = {}

    originalImage = globalThis.Image
    globalThis.Image = function () {
      return mockImage
    }

    // Track Blob constructor calls
    blobInstances = []
    originalBlob = globalThis.Blob
    globalThis.Blob = function (parts, options) {
      const instance = { parts, type: options?.type }
      blobInstances.push(instance)
      return instance
    }

    // Mock URL.createObjectURL / revokeObjectURL
    originalURL = { ...globalThis.URL }
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    globalThis.Image = originalImage
    globalThis.Blob = originalBlob
    globalThis.URL.createObjectURL = originalURL.createObjectURL
    globalThis.URL.revokeObjectURL = originalURL.revokeObjectURL
  })

  it('exports rasterizeSvg as a function', () => {
    expect(typeof rasterizeSvg).toBe('function')
  })

  it('creates a Blob with the SVG string and correct MIME type', async () => {
    const svgString = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    const promise = rasterizeSvg(svgString, 800, 600)

    expect(blobInstances.length).toBe(1)
    expect(blobInstances[0].parts).toEqual([svgString])
    expect(blobInstances[0].type).toBe('image/svg+xml;charset=utf-8')

    // Trigger load to resolve
    mockImage.onload()
    await promise
  })

  it('creates an Object URL from the Blob', async () => {
    const promise = rasterizeSvg('<svg></svg>', 800, 600)

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(blobInstances[0])

    mockImage.onload()
    await promise
  })

  it('sets image width and height to the specified dimensions', async () => {
    const promise = rasterizeSvg('<svg></svg>', 1584, 396)

    expect(mockImage.width).toBe(1584)
    expect(mockImage.height).toBe(396)

    mockImage.onload()
    await promise
  })

  it('sets image src to the Object URL', async () => {
    const promise = rasterizeSvg('<svg></svg>', 800, 600)

    expect(mockImage.src).toBe('blob:mock-url')

    mockImage.onload()
    await promise
  })

  it('resolves with the Image element on successful load', async () => {
    const promise = rasterizeSvg('<svg></svg>', 800, 600)

    mockImage.onload()
    const result = await promise

    expect(result).toBe(mockImage)
  })

  it('revokes the Object URL after successful load', async () => {
    const promise = rasterizeSvg('<svg></svg>', 800, 600)

    mockImage.onload()
    await promise

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('rejects with an error when image fails to load', async () => {
    const promise = rasterizeSvg('<svg></svg>', 800, 600)

    mockImage.onerror()

    await expect(promise).rejects.toThrow('SVG rasterization failed')
  })

  it('revokes the Object URL on load failure', async () => {
    const promise = rasterizeSvg('<svg></svg>', 800, 600)

    mockImage.onerror()

    try {
      await promise
    } catch {
      // expected
    }

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('returns a Promise', () => {
    const result = rasterizeSvg('<svg></svg>', 800, 600)
    expect(result).toBeInstanceOf(Promise)

    // Clean up
    mockImage.onload()
  })
})
