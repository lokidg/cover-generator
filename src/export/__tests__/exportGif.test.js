import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock gif.js with a class-based mock
const mockAddFrame = vi.fn()
const mockRender = vi.fn()
const mockAbort = vi.fn()
const mockOn = vi.fn()
let lastConstructorOptions = null

vi.mock('gif.js', () => {
  return {
    default: class MockGIF {
      constructor(options) {
        lastConstructorOptions = options
        this.addFrame = mockAddFrame
        this.render = mockRender
        this.abort = mockAbort
        this.on = mockOn
      }
    },
  }
})

// Mock URL and DOM APIs
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
const mockClick = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  lastConstructorOptions = null

  global.URL = {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  }

  global.document = {
    createElement: vi.fn(() => ({
      click: mockClick,
      href: '',
      download: '',
    })),
  }
})

// Import after mocks are set up
const { exportGif } = await import('../exportGif.js')

describe('exportGif', () => {
  const defaultConfig = {
    startingSeed: 42,
    frameCount: 5,
    frameDelay: 100,
    width: 1500,
    height: 500,
    onProgress: vi.fn(),
  }

  function createMockCanvas() {
    return { getContext: vi.fn(), width: 1500, height: 500 }
  }

  it('initializes gif.js with correct dimensions and settings', async () => {
    const renderFrame = vi.fn().mockResolvedValue(createMockCanvas())

    mockOn.mockImplementation((event, cb) => {
      if (event === 'finished') {
        setTimeout(() => cb(new Blob(['gif'])), 0)
      }
    })

    await exportGif(renderFrame, defaultConfig)

    expect(lastConstructorOptions).toEqual({
      workers: 2,
      quality: 10,
      width: 1500,
      height: 500,
    })
  })

  it('renders exactly frameCount frames with sequential seeds', async () => {
    const renderFrame = vi.fn().mockResolvedValue(createMockCanvas())

    mockOn.mockImplementation((event, cb) => {
      if (event === 'finished') {
        setTimeout(() => cb(new Blob(['gif'])), 0)
      }
    })

    await exportGif(renderFrame, defaultConfig)

    expect(renderFrame).toHaveBeenCalledTimes(5)
    expect(renderFrame).toHaveBeenNthCalledWith(1, 42) // startingSeed + 0
    expect(renderFrame).toHaveBeenNthCalledWith(2, 43) // startingSeed + 1
    expect(renderFrame).toHaveBeenNthCalledWith(3, 44) // startingSeed + 2
    expect(renderFrame).toHaveBeenNthCalledWith(4, 45) // startingSeed + 3
    expect(renderFrame).toHaveBeenNthCalledWith(5, 46) // startingSeed + 4
  })

  it('adds each frame to gif with correct delay', async () => {
    const canvas = createMockCanvas()
    const renderFrame = vi.fn().mockResolvedValue(canvas)

    mockOn.mockImplementation((event, cb) => {
      if (event === 'finished') {
        setTimeout(() => cb(new Blob(['gif'])), 0)
      }
    })

    await exportGif(renderFrame, defaultConfig)

    expect(mockAddFrame).toHaveBeenCalledTimes(5)
    expect(mockAddFrame).toHaveBeenCalledWith(canvas, { delay: 100 })
  })

  it('reports progress for each frame', async () => {
    const renderFrame = vi.fn().mockResolvedValue(createMockCanvas())

    mockOn.mockImplementation((event, cb) => {
      if (event === 'finished') {
        setTimeout(() => cb(new Blob(['gif'])), 0)
      }
    })

    await exportGif(renderFrame, defaultConfig)

    expect(defaultConfig.onProgress).toHaveBeenCalledTimes(5)
    expect(defaultConfig.onProgress).toHaveBeenNthCalledWith(1, 1, 5)
    expect(defaultConfig.onProgress).toHaveBeenNthCalledWith(2, 2, 5)
    expect(defaultConfig.onProgress).toHaveBeenNthCalledWith(3, 3, 5)
    expect(defaultConfig.onProgress).toHaveBeenNthCalledWith(4, 4, 5)
    expect(defaultConfig.onProgress).toHaveBeenNthCalledWith(5, 5, 5)
  })

  it('triggers download with correct filename format', async () => {
    const renderFrame = vi.fn().mockResolvedValue(createMockCanvas())
    const mockAnchor = { click: mockClick, href: '', download: '' }
    global.document.createElement = vi.fn(() => mockAnchor)

    mockOn.mockImplementation((event, cb) => {
      if (event === 'finished') {
        setTimeout(() => cb(new Blob(['gif'])), 0)
      }
    })

    await exportGif(renderFrame, defaultConfig)

    expect(mockAnchor.download).toBe('cover-42-1500x500.gif')
    expect(mockAnchor.href).toBe('blob:mock-url')
    expect(mockClick).toHaveBeenCalled()
  })

  it('revokes object URL after download', async () => {
    const renderFrame = vi.fn().mockResolvedValue(createMockCanvas())

    mockOn.mockImplementation((event, cb) => {
      if (event === 'finished') {
        setTimeout(() => cb(new Blob(['gif'])), 0)
      }
    })

    await exportGif(renderFrame, defaultConfig)

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('aborts and rejects when renderFrame throws', async () => {
    const renderFrame = vi.fn()
      .mockResolvedValueOnce(createMockCanvas())
      .mockResolvedValueOnce(createMockCanvas())
      .mockRejectedValueOnce(new Error('Render failed'))

    await expect(
      exportGif(renderFrame, defaultConfig)
    ).rejects.toThrow('GIF export failed at frame 3/5: Render failed')

    expect(mockAbort).toHaveBeenCalled()
    expect(renderFrame).toHaveBeenCalledTimes(3)
  })

  it('works without onProgress callback', async () => {
    const renderFrame = vi.fn().mockResolvedValue(createMockCanvas())
    const configWithoutProgress = { ...defaultConfig, onProgress: undefined }

    mockOn.mockImplementation((event, cb) => {
      if (event === 'finished') {
        setTimeout(() => cb(new Blob(['gif'])), 0)
      }
    })

    await expect(exportGif(renderFrame, configWithoutProgress)).resolves.toBeUndefined()
  })

  it('calls gif.render() after all frames are added', async () => {
    const renderFrame = vi.fn().mockResolvedValue(createMockCanvas())

    mockOn.mockImplementation((event, cb) => {
      if (event === 'finished') {
        setTimeout(() => cb(new Blob(['gif'])), 0)
      }
    })

    await exportGif(renderFrame, defaultConfig)

    expect(mockRender).toHaveBeenCalledTimes(1)
    expect(mockAddFrame).toHaveBeenCalledTimes(5)
  })
})
