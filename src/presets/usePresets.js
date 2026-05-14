import { useState, useCallback } from 'react'

const STORAGE_KEY = 'cover-generator-presets'
const MAX_PRESETS = 50
const LABEL_MIN_LENGTH = 1
const LABEL_MAX_LENGTH = 64

/**
 * Required parameter keys that must be present in a valid preset.
 */
const REQUIRED_PARAM_KEYS = [
  'seed',
  'clusterCount',
  'accentColor',
  'accentOpacity',
  'surfaceOpacity',
  'primitiveCount',
  'booleanSubtraction',
  'name',
  'title',
  'fontSize',
  'titleFontSize',
  'textColor',
  'textOpacity',
  'horizontalAlign',
  'verticalAlign',
  'dimensionProfile',
]

// --- Standalone utility functions (for testability without React) ---

/**
 * Generate a UUID v4 string.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Read all presets from localStorage.
 * Returns an empty array if localStorage is unavailable or data is invalid.
 */
export function readPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

/**
 * Write presets array to localStorage.
 * Returns true on success, false if localStorage is unavailable.
 */
export function writePresets(presets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
    return true
  } catch {
    return false
  }
}

/**
 * Validate a preset label.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateLabel(label) {
  if (typeof label !== 'string') {
    return { valid: false, error: 'Label must be a string' }
  }
  const trimmed = label.trim()
  if (trimmed.length < LABEL_MIN_LENGTH) {
    return { valid: false, error: `Label must be at least ${LABEL_MIN_LENGTH} character(s)` }
  }
  if (trimmed.length > LABEL_MAX_LENGTH) {
    return { valid: false, error: `Label must be at most ${LABEL_MAX_LENGTH} characters` }
  }
  return { valid: true }
}

/**
 * Validate that params object contains all required keys.
 * Returns { valid: true } or { valid: false, error: string, missingKeys: string[] }.
 */
export function validateParams(params) {
  if (!params || typeof params !== 'object') {
    return { valid: false, error: 'Params must be an object', missingKeys: REQUIRED_PARAM_KEYS }
  }
  const missingKeys = REQUIRED_PARAM_KEYS.filter((key) => !(key in params))
  if (missingKeys.length > 0) {
    return { valid: false, error: `Missing required keys: ${missingKeys.join(', ')}`, missingKeys }
  }
  return { valid: true }
}

/**
 * Validate an imported preset JSON string or parsed object.
 * Returns { valid: true, data: object } or { valid: false, error: string }.
 */
export function validateImport(input) {
  let data
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch {
      return { valid: false, error: 'Invalid JSON' }
    }
  } else {
    data = input
  }

  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Import must be a JSON object' }
  }

  // The import can be either a full preset object (with id, label, params)
  // or just the params object directly
  const params = data.params || data
  const paramsValidation = validateParams(params)
  if (!paramsValidation.valid) {
    return { valid: false, error: paramsValidation.error }
  }

  return { valid: true, data }
}

/**
 * Save a new preset. Returns { success, error?, preset? }.
 */
export function savePreset(label, params) {
  const labelValidation = validateLabel(label)
  if (!labelValidation.valid) {
    return { success: false, error: labelValidation.error }
  }

  const paramsValidation = validateParams(params)
  if (!paramsValidation.valid) {
    return { success: false, error: paramsValidation.error }
  }

  const presets = readPresets()
  if (presets.length >= MAX_PRESETS) {
    return { success: false, error: `Maximum ${MAX_PRESETS} presets reached. Delete one to save.` }
  }

  const preset = {
    id: generateId(),
    label: label.trim(),
    createdAt: Date.now(),
    params: { ...params },
  }

  presets.push(preset)
  const written = writePresets(presets)
  if (!written) {
    return { success: false, error: 'Storage unavailable. Presets won\'t persist.' }
  }

  return { success: true, preset }
}

/**
 * Load a preset by ID. Returns the preset's params or null if not found.
 */
export function loadPreset(id) {
  const presets = readPresets()
  const preset = presets.find((p) => p.id === id)
  return preset ? preset.params : null
}

/**
 * Remove a preset by ID. Returns true if removed, false if not found.
 */
export function removePreset(id) {
  const presets = readPresets()
  const index = presets.findIndex((p) => p.id === id)
  if (index === -1) return false
  presets.splice(index, 1)
  writePresets(presets)
  return true
}

/**
 * Get all saved presets.
 */
export function getAllPresets() {
  return readPresets()
}

/**
 * Export a preset as a downloadable JSON file.
 * Returns { success, error? }.
 */
export function exportPresetToFile(id) {
  const presets = readPresets()
  const preset = presets.find((p) => p.id === id)
  if (!preset) {
    return { success: false, error: 'Preset not found' }
  }

  try {
    const json = JSON.stringify(preset, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${preset.label}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Import a preset from a File object. Returns a Promise.
 * Resolves with { success, error?, preset? }.
 */
export async function importPresetFromFile(file) {
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  try {
    const text = await file.text()
    const validation = validateImport(text)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const data = validation.data
    const params = data.params || data
    const label = data.label || file.name.replace(/\.json$/i, '') || 'Imported Preset'

    // Save the imported preset
    return savePreset(label, params)
  } catch (err) {
    return { success: false, error: `Failed to read file: ${err.message}` }
  }
}

// --- React Hook ---

/**
 * React hook for managing presets with localStorage persistence.
 * Provides reactive state that updates when presets are modified.
 */
export function usePresets() {
  const [presets, setPresets] = useState(() => readPresets())

  const refresh = useCallback(() => {
    setPresets(readPresets())
  }, [])

  const save = useCallback((label, params) => {
    const result = savePreset(label, params)
    if (result.success) {
      refresh()
    }
    return result
  }, [refresh])

  const load = useCallback((id) => {
    return loadPreset(id)
  }, [])

  const remove = useCallback((id) => {
    const result = removePreset(id)
    if (result) {
      refresh()
    }
    return result
  }, [refresh])

  const exportPreset = useCallback((id) => {
    return exportPresetToFile(id)
  }, [])

  const importPreset = useCallback(async (file) => {
    const result = await importPresetFromFile(file)
    if (result.success) {
      refresh()
    }
    return result
  }, [refresh])

  const getAll = useCallback(() => {
    return readPresets()
  }, [])

  return {
    presets,
    save,
    load,
    remove,
    exportPreset,
    importPreset,
    getAll,
    refresh,
  }
}

export default usePresets
