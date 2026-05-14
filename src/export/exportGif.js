/**
 * GIF Export Module
 *
 * Generates an animated GIF by rendering multiple frames with incrementing seeds,
 * encodes with gif.js (Web Worker), and triggers a browser download.
 * Reports progress per frame and handles per-frame errors.
 */

import GIF from 'gif.js'
import { generateFilename } from './exportPng.js'

/**
 * Export an animated GIF by rendering frames with sequential seeds.
 *
 * @param {(seed: number) => Promise<HTMLCanvasElement>} renderFrame - Renders a frame at the given seed
 * @param {object} config - Export configuration
 * @param {number} config.startingSeed - Starting seed value (0–999999)
 * @param {number} config.frameCount - Number of frames to generate (2–30)
 * @param {number} config.frameDelay - Delay between frames in ms (50–500)
 * @param {number} config.width - Canvas width in pixels
 * @param {number} config.height - Canvas height in pixels
 * @param {(current: number, total: number) => void} [config.onProgress] - Progress callback
 * @returns {Promise<void>} Resolves when export completes, rejects on failure
 */
export async function exportGif(renderFrame, config) {
  const { startingSeed, frameCount, frameDelay, width, height, onProgress } = config

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width,
    height,
  })

  for (let i = 0; i < frameCount; i++) {
    const seed = startingSeed + i
    let canvas
    try {
      canvas = await renderFrame(seed)
    } catch (err) {
      gif.abort()
      throw new Error(`GIF export failed at frame ${i + 1}/${frameCount}: ${err.message}`)
    }
    gif.addFrame(canvas, { delay: frameDelay })
    onProgress?.(i + 1, frameCount)
  }

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateFilename(startingSeed, width, height, 'gif')
      a.click()
      URL.revokeObjectURL(url)
      resolve()
    })

    gif.on('error', (err) => {
      reject(new Error(`GIF encoding failed: ${err.message || err}`))
    })

    gif.render()
  })
}
