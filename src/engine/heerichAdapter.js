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
 * - gap: scene-level gap between voxels
 *
 * @param {Object} config
 * @param {string} [config.cameraType='oblique'] - 'oblique'|'perspective'|'orthographic'|'isometric'
 * @param {number} [config.cameraAngle=315] - 0–360
 * @param {number} [config.cameraDistance=20] - 1–80
 * @param {number} [config.gridTileSize=18] - 8–32
 * @param {number} [config.gap=0] - 0–0.2
 * @param {number} [config.outlineWidth=0] - 0–5
 * @param {string} [config.outlineColor='#000000'] - hex color
 * @param {string} [config.fillColor='#E0E0E3'] - hex color
 * @param {string} [config.strokeColor='rgba(0,0,0,0.06)'] - stroke color
 * @param {number} [config.strokeWidth=0.5] - 0–3
 * @param {number} [config.width]
 * @param {number} [config.height]
 * @returns {any} A Heerich instance configured with the given parameters.
 */
export function createHeerichInstance(config) {
  if (!HeerichClass) {
    throw new Error('Rendering engine failed to load. Check your internet connection.')
  }

  const {
    cameraType = 'oblique',
    cameraAngle = 315,
    cameraDistance = 20,
    gridTileSize = 18,
    gap = 0,
    outlineWidth = 0,
    outlineColor = '#000000',
    fillColor = '#E0E0E3',
    strokeColor = 'rgba(0,0,0,0.06)',
    strokeWidth = 0.5,
  } = config

  const style = {
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth,
  }

  if (outlineWidth > 0) {
    style.outlineWidth = outlineWidth
    style.outlineColor = outlineColor
  }

  return new HeerichClass({
    tile: [gridTileSize, gridTileSize],
    camera: {
      type: cameraType,
      angle: cameraAngle,
      distance: cameraDistance,
    },
    style,
    gap,
  })
}
