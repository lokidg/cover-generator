/**
 * heerichAdapter.js — Loads the Heerich rendering engine from CDN
 * and exposes a factory for creating configured instances.
 *
 * Uses dynamic import() since the CDN file is an ES module.
 */

const CDN_URL = 'https://cdn.jsdelivr.net/npm/heerich@latest/dist/heerich.js'

/** @type {Promise<any> | null} */
let loadPromise = null

/** @type {any} */
let HeerichClass = null

/**
 * Loads the Heerich library from CDN via dynamic import.
 * Caches the result so subsequent calls resolve immediately.
 * @returns {Promise<any>} Resolves with the Heerich constructor when ready.
 */
export function loadHeerich() {
  if (loadPromise) return loadPromise

  loadPromise = import(/* @vite-ignore */ CDN_URL)
    .then((module) => {
      // Heerich exports: { Heerich, SVGRenderer, boxCoords, fillCoords, lineCoords, sphereCoords }
      HeerichClass = module.Heerich || module.default || module
      if (typeof window !== 'undefined') {
        window.heerich = HeerichClass
      }
      return HeerichClass
    })
    .catch((err) => {
      loadPromise = null
      throw new Error('Rendering engine failed to load. Check your internet connection.')
    })

  return loadPromise
}

/**
 * Creates a configured Heerich instance.
 * Must be called after `loadHeerich()` resolves.
 *
 * Heerich constructor accepts: { tile, style, camera, gap }
 * - tile: number or [x, y, z] — voxel tile size
 * - camera: { type, angle, distance }
 * - style: default fill/stroke style
 *
 * @param {{ cameraAngle: number, gridTileSize: number, width: number, height: number }} config
 * @returns {any} A Heerich instance configured with the given parameters.
 */
export function createHeerichInstance(config) {
  if (!HeerichClass) {
    throw new Error('Rendering engine failed to load. Check your internet connection.')
  }

  const { cameraAngle = 315, gridTileSize = 18 } = config

  return new HeerichClass({
    tile: [gridTileSize, gridTileSize],
    camera: {
      type: 'oblique',
      angle: cameraAngle,
      distance: 20,
    },
    style: {
      fill: '#E0E0E3',
      stroke: 'rgba(0,0,0,0.06)',
      strokeWidth: 0.5,
    },
    gap: 0,
  })
}
