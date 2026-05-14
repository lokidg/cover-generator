/**
 * heerichAdapter.js — Loads the Heerich rendering engine from CDN
 * and exposes a factory for creating configured instances.
 *
 * Browser-only module (uses document.createElement('script')).
 */

const CDN_URL = 'https://cdn.jsdelivr.net/npm/heerich@latest/dist/heerich.js'

/** @type {Promise<any> | null} */
let loadPromise = null

/**
 * Loads the Heerich library from CDN via script tag injection.
 * Caches the result so subsequent calls resolve immediately.
 * @returns {Promise<any>} Resolves with the Heerich global when ready.
 */
export function loadHeerich() {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    // If already loaded (e.g. via a prior script tag), resolve immediately
    if (typeof window !== 'undefined' && window.heerich) {
      resolve(window.heerich)
      return
    }

    const script = document.createElement('script')
    script.src = CDN_URL
    script.async = true

    script.onload = () => {
      if (window.heerich) {
        resolve(window.heerich)
      } else {
        loadPromise = null
        reject(new Error('Rendering engine failed to load. Check your internet connection.'))
      }
    }

    script.onerror = () => {
      loadPromise = null
      reject(new Error('Rendering engine failed to load. Check your internet connection.'))
    }

    document.head.appendChild(script)
  })

  return loadPromise
}

/**
 * Creates a configured Heerich instance.
 * Must be called after `loadHeerich()` resolves.
 *
 * @param {{ cameraAngle: number, gridTileSize: number, width: number, height: number }} config
 * @returns {any} A Heerich instance configured with the given parameters.
 */
export function createHeerichInstance(config) {
  if (!window.heerich) {
    throw new Error('Rendering engine failed to load. Check your internet connection.')
  }

  const { cameraAngle, gridTileSize, width, height } = config

  return new window.heerich({
    cameraAngle,
    gridTileSize,
    width,
    height,
  })
}
