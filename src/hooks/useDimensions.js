/**
 * useDimensions hook — resolves dimension profile to width/height,
 * validates custom dimensions, and exposes { width, height, profile, error }.
 */

const DIMENSION_PROFILES = {
  'LinkedIn (1584×396)': { width: 1584, height: 396 },
  'Twitter/X (1500×500)': { width: 1500, height: 500 },
  'Facebook (820×312)': { width: 820, height: 312 },
  'Custom': null,
}

const DEFAULT_PROFILE = 'LinkedIn (1584×396)'

/**
 * Validates a single dimension value.
 * Accepts whole integers in the range [100, 4096] inclusive.
 * Rejects non-numeric values, decimals, and out-of-range values.
 *
 * @param {*} value - The value to validate
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateDimension(value) {
  // Reject non-numeric types (but allow numeric strings)
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'Dimension must be a whole integer between 100 and 4096' }
  }

  // Reject objects, arrays, booleans — only numbers and numeric strings are valid
  if (typeof value === 'object' || typeof value === 'boolean') {
    return { valid: false, error: 'Dimension must be a whole integer between 100 and 4096' }
  }

  const num = Number(value)

  // Reject NaN (non-numeric strings, objects, etc.)
  if (Number.isNaN(num)) {
    return { valid: false, error: 'Dimension must be a whole integer between 100 and 4096' }
  }

  // Reject non-finite values (Infinity, -Infinity)
  if (!Number.isFinite(num)) {
    return { valid: false, error: 'Dimension must be a whole integer between 100 and 4096' }
  }

  // Reject decimals — must be a whole integer
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Dimension must be a whole integer between 100 and 4096' }
  }

  // Reject out-of-range values
  if (num < 100 || num > 4096) {
    return { valid: false, error: 'Dimension must be a whole integer between 100 and 4096' }
  }

  return { valid: true, error: null }
}

/**
 * Resolves a dimension profile and optional custom dimensions to
 * concrete width/height values with validation.
 *
 * @param {string} profile - The selected dimension profile name
 * @param {*} customWidth - Custom width value (used when profile is 'Custom')
 * @param {*} customHeight - Custom height value (used when profile is 'Custom')
 * @returns {{ width: number, height: number, profile: string, error: string | null }}
 */
export function useDimensions(profile, customWidth, customHeight) {
  const resolvedProfile = profile && DIMENSION_PROFILES.hasOwnProperty(profile)
    ? profile
    : DEFAULT_PROFILE

  // For preset profiles, return the fixed dimensions
  if (resolvedProfile !== 'Custom') {
    const dims = DIMENSION_PROFILES[resolvedProfile]
    return {
      width: dims.width,
      height: dims.height,
      profile: resolvedProfile,
      error: null,
    }
  }

  // For custom profile, validate both width and height
  const widthResult = validateDimension(customWidth)
  if (!widthResult.valid) {
    return {
      width: null,
      height: null,
      profile: 'Custom',
      error: `Width: ${widthResult.error}`,
    }
  }

  const heightResult = validateDimension(customHeight)
  if (!heightResult.valid) {
    return {
      width: null,
      height: null,
      profile: 'Custom',
      error: `Height: ${heightResult.error}`,
    }
  }

  return {
    width: Number(customWidth),
    height: Number(customHeight),
    profile: 'Custom',
    error: null,
  }
}

export { DIMENSION_PROFILES, DEFAULT_PROFILE }
