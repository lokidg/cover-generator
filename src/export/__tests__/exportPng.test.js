/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportPng, generateFilename } from '../exportPng.js'

describe('generateFilename', () => {
  it('produces correct PNG filename with given seed, width, height', () => {
    expect(generateFilename(12345, 1584, 396)).toBe('cover-12345-1584x396.png')
  })

  it('produces correct GIF filename when ext is specified', () => {
    expect(generateFilename(42, 1500, 500, 'gif')).toBe('cover-42-1500x500.gif')
  })

  it('uses decimal integers with no padding', () => {
    expect(generateFilename(0, 100, 100)).toBe('cover-0-100x100.png')
  })

  it('handles large seed values', () => {
    expect(generateFilename(2147483647, 4096, 4096)).toBe('cover-2147483647-4096x4096.png')
  })
})

describe('exportPng', () => {
  let mockCanvas
  let mockAnchor
  let mockUrl

  beforeEach(() => {
    mockUrl = 'blob:http://localhost/fake-url'

    // Mock URL.createObjectURL and revokeObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => mockUrl),
      revokeObjectURL: vi.fn(),
    })

    // Mock document.createElement for the anchor element
    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor)
  })

  it('calls canvas.toBlob with image/png MIME type', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' })
    mockCanvas = {
      toBlob: vi.fn((callback, mimeType) => {
        expect(mimeType).toBe('image/png')
        callback(fakeBlob)
      }),
    }

    await exportPng(mockCanvas, 123, 1584, 396)
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
  })

  it('triggers download with correct filename', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' })
    mockCanvas = {
      toBlob: vi.fn((callback) => callback(fakeBlob)),
    }

    await exportPng(mockCanvas, 999, 1500, 500)

    expect(mockAnchor.download).toBe('cover-999-1500x500.png')
    expect(mockAnchor.href).toBe(mockUrl)
    expect(mockAnchor.click).toHaveBeenCalled()
  })

  it('creates object URL from blob and revokes it after download', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' })
    mockCanvas = {
      toBlob: vi.fn((callback) => callback(fakeBlob)),
    }

    await exportPng(mockCanvas, 1, 820, 312)

    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)
  })

  it('rejects with error when toBlob returns null', async () => {
    mockCanvas = {
      toBlob: vi.fn((callback) => callback(null)),
    }

    await expect(exportPng(mockCanvas, 1, 1584, 396)).rejects.toThrow('PNG export failed')
  })

  it('resolves successfully on valid blob', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' })
    mockCanvas = {
      toBlob: vi.fn((callback) => callback(fakeBlob)),
    }

    await expect(exportPng(mockCanvas, 1, 1584, 396)).resolves.toBeUndefined()
  })
})
