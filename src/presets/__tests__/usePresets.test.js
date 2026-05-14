// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateId,
  readPresets,
  writePresets,
  validateLabel,
  validateParams,
  validateImport,
  savePreset,
  loadPreset,
  removePreset,
  getAllPresets,
  exportPresetToFile,
  importPresetFromFile,
} from '../usePresets.js'

const STORAGE_KEY = 'cover-generator-presets'

/**
 * Create a File-like object for testing in Node environment.
 */
function createMockFile(content, name, options = {}) {
  const blob = new Blob([content], { type: options.type || 'application/json' })
  blob.name = name
  blob.text = () => Promise.resolve(content)
  return blob
}

// Valid params fixture with all required keys
function makeValidParams(overrides = {}) {
  return {
    seed: 12345,
    clusterCount: 3,
    accentColor: '#4F46E5',
    accentOpacity: 0.15,
    surfaceOpacity: 0.10,
    primitiveCount: 12,
    booleanSubtraction: true,
    name: 'John Doe',
    title: 'Software Engineer',
    fontSize: 32,
    titleFontSize: 18,
    textColor: '#FFFFFF',
    textOpacity: 1.0,
    horizontalAlign: 'center',
    verticalAlign: 'bottom',
    dimensionProfile: 'LinkedIn (1584×396)',
    ...overrides,
  }
}

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i) => Object.keys(store)[i] ?? null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('validateLabel', () => {
  it('accepts valid labels', () => {
    expect(validateLabel('My Preset')).toEqual({ valid: true })
    expect(validateLabel('A')).toEqual({ valid: true })
    expect(validateLabel('a'.repeat(64))).toEqual({ valid: true })
  })

  it('rejects empty labels', () => {
    expect(validateLabel('')).toEqual({ valid: false, error: expect.any(String) })
    expect(validateLabel('   ')).toEqual({ valid: false, error: expect.any(String) })
  })

  it('rejects labels longer than 64 characters', () => {
    expect(validateLabel('a'.repeat(65))).toEqual({ valid: false, error: expect.any(String) })
  })

  it('rejects non-string labels', () => {
    expect(validateLabel(123)).toEqual({ valid: false, error: expect.any(String) })
    expect(validateLabel(null)).toEqual({ valid: false, error: expect.any(String) })
    expect(validateLabel(undefined)).toEqual({ valid: false, error: expect.any(String) })
  })

  it('trims whitespace before validating length', () => {
    expect(validateLabel(' A ')).toEqual({ valid: true })
  })
})

describe('validateParams', () => {
  it('accepts params with all required keys', () => {
    expect(validateParams(makeValidParams())).toEqual({ valid: true })
  })

  it('rejects null or non-object', () => {
    expect(validateParams(null).valid).toBe(false)
    expect(validateParams(undefined).valid).toBe(false)
    expect(validateParams('string').valid).toBe(false)
    expect(validateParams(42).valid).toBe(false)
  })

  it('rejects params missing required keys', () => {
    const params = { seed: 1, clusterCount: 3 }
    const result = validateParams(params)
    expect(result.valid).toBe(false)
    expect(result.missingKeys.length).toBeGreaterThan(0)
  })

  it('reports which keys are missing', () => {
    const params = makeValidParams()
    delete params.seed
    delete params.accentColor
    const result = validateParams(params)
    expect(result.valid).toBe(false)
    expect(result.missingKeys).toContain('seed')
    expect(result.missingKeys).toContain('accentColor')
  })
})

describe('validateImport', () => {
  it('accepts valid JSON string with all required keys', () => {
    const json = JSON.stringify(makeValidParams())
    const result = validateImport(json)
    expect(result.valid).toBe(true)
    expect(result.data).toEqual(makeValidParams())
  })

  it('accepts a full preset object with params nested', () => {
    const preset = { id: 'abc', label: 'Test', params: makeValidParams() }
    const json = JSON.stringify(preset)
    const result = validateImport(json)
    expect(result.valid).toBe(true)
  })

  it('rejects invalid JSON', () => {
    expect(validateImport('not json {').valid).toBe(false)
    expect(validateImport('').valid).toBe(false)
  })

  it('rejects JSON missing required keys', () => {
    const json = JSON.stringify({ seed: 1 })
    expect(validateImport(json).valid).toBe(false)
  })

  it('accepts a parsed object directly', () => {
    const result = validateImport(makeValidParams())
    expect(result.valid).toBe(true)
  })
})

describe('readPresets / writePresets', () => {
  it('returns empty array when nothing stored', () => {
    expect(readPresets()).toEqual([])
  })

  it('round-trips presets through localStorage', () => {
    const presets = [{ id: '1', label: 'Test', createdAt: 1000, params: makeValidParams() }]
    writePresets(presets)
    expect(readPresets()).toEqual(presets)
  })

  it('returns empty array for invalid JSON in storage', () => {
    localStorageMock.setItem(STORAGE_KEY, 'not-json')
    expect(readPresets()).toEqual([])
  })

  it('returns empty array for non-array JSON in storage', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ not: 'array' }))
    expect(readPresets()).toEqual([])
  })
})

describe('savePreset', () => {
  it('saves a valid preset and returns it', () => {
    const result = savePreset('My Preset', makeValidParams())
    expect(result.success).toBe(true)
    expect(result.preset).toBeDefined()
    expect(result.preset.label).toBe('My Preset')
    expect(result.preset.id).toBeDefined()
    expect(result.preset.createdAt).toBeGreaterThan(0)
    expect(result.preset.params).toEqual(makeValidParams())
  })

  it('trims the label', () => {
    const result = savePreset('  Trimmed  ', makeValidParams())
    expect(result.success).toBe(true)
    expect(result.preset.label).toBe('Trimmed')
  })

  it('rejects invalid label', () => {
    const result = savePreset('', makeValidParams())
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects invalid params', () => {
    const result = savePreset('Valid Label', { seed: 1 })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects when at max capacity (50 presets)', () => {
    // Fill storage with 50 presets
    const presets = Array.from({ length: 50 }, (_, i) => ({
      id: `id-${i}`,
      label: `Preset ${i}`,
      createdAt: Date.now(),
      params: makeValidParams(),
    }))
    writePresets(presets)

    const result = savePreset('One More', makeValidParams())
    expect(result.success).toBe(false)
    expect(result.error).toContain('50')

    // Verify storage was not modified
    expect(readPresets()).toHaveLength(50)
  })

  it('persists to localStorage', () => {
    savePreset('Persisted', makeValidParams())
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY))
    expect(stored).toHaveLength(1)
    expect(stored[0].label).toBe('Persisted')
  })
})

describe('loadPreset', () => {
  it('returns params for an existing preset', () => {
    const { preset } = savePreset('Load Me', makeValidParams({ seed: 999 }))
    const loaded = loadPreset(preset.id)
    expect(loaded).toEqual(makeValidParams({ seed: 999 }))
  })

  it('returns null for non-existent ID', () => {
    expect(loadPreset('non-existent-id')).toBeNull()
  })
})

describe('removePreset', () => {
  it('removes an existing preset', () => {
    const { preset } = savePreset('Remove Me', makeValidParams())
    expect(removePreset(preset.id)).toBe(true)
    expect(readPresets()).toHaveLength(0)
  })

  it('returns false for non-existent ID', () => {
    expect(removePreset('non-existent-id')).toBe(false)
  })

  it('does not affect other presets', () => {
    const { preset: p1 } = savePreset('Keep', makeValidParams({ seed: 1 }))
    const { preset: p2 } = savePreset('Remove', makeValidParams({ seed: 2 }))
    removePreset(p2.id)
    const remaining = readPresets()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(p1.id)
  })
})

describe('getAllPresets', () => {
  it('returns all saved presets', () => {
    savePreset('First', makeValidParams({ seed: 1 }))
    savePreset('Second', makeValidParams({ seed: 2 }))
    const all = getAllPresets()
    expect(all).toHaveLength(2)
    expect(all[0].label).toBe('First')
    expect(all[1].label).toBe('Second')
  })

  it('returns empty array when no presets exist', () => {
    expect(getAllPresets()).toEqual([])
  })
})

describe('exportPresetToFile', () => {
  it('returns error for non-existent preset', () => {
    const result = exportPresetToFile('non-existent')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

describe('importPresetFromFile', () => {
  it('imports a valid preset file', async () => {
    const params = makeValidParams({ seed: 777 })
    const preset = { id: 'imported', label: 'Imported', params }
    const file = createMockFile(JSON.stringify(preset), 'test.json')

    const result = await importPresetFromFile(file)
    expect(result.success).toBe(true)
    expect(result.preset.params).toEqual(params)
    expect(result.preset.label).toBe('Imported')
  })

  it('imports a params-only JSON file using filename as label', async () => {
    const params = makeValidParams({ seed: 888 })
    const file = createMockFile(JSON.stringify(params), 'my-preset.json')

    const result = await importPresetFromFile(file)
    expect(result.success).toBe(true)
    expect(result.preset.params).toEqual(params)
    expect(result.preset.label).toBe('my-preset')
  })

  it('rejects invalid JSON file', async () => {
    const file = createMockFile('not valid json', 'bad.json')
    const result = await importPresetFromFile(file)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects file with missing required keys', async () => {
    const file = createMockFile(JSON.stringify({ seed: 1 }), 'incomplete.json')
    const result = await importPresetFromFile(file)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns error when no file provided', async () => {
    const result = await importPresetFromFile(null)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No file')
  })

  it('respects the 50 preset limit on import', async () => {
    // Fill storage with 50 presets
    const presets = Array.from({ length: 50 }, (_, i) => ({
      id: `id-${i}`,
      label: `Preset ${i}`,
      createdAt: Date.now(),
      params: makeValidParams(),
    }))
    writePresets(presets)

    const file = createMockFile(JSON.stringify(makeValidParams()), 'overflow.json')
    const result = await importPresetFromFile(file)
    expect(result.success).toBe(false)
    expect(result.error).toContain('50')
  })
})

describe('localStorage unavailability', () => {
  it('readPresets returns empty array when localStorage throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('Quota exceeded') })
    expect(readPresets()).toEqual([])
  })

  it('writePresets returns false when localStorage throws', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Quota exceeded') })
    expect(writePresets([])).toBe(false)
  })

  it('savePreset returns error when storage is unavailable', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Quota exceeded') })
    const result = savePreset('Test', makeValidParams())
    expect(result.success).toBe(false)
    expect(result.error).toContain('Storage unavailable')
  })
})
