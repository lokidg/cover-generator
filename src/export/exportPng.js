/**
 * PNG Export Module
 *
 * Exports the canvas content as a PNG file, triggering a browser download.
 * Handles null blob errors and provides a filename helper.
 */

/**
 * Generate a filename for export.
 * @param {number} seed - Integer seed value
 * @param {number} width - Export width in pixels
 * @param {number} height - Export height in pixels
 * @param {string} ext - File extension (default: 'png')
 * @returns {string} Filename in format cover-{seed}-{width}x{height}.{ext}
 */
export function generateFilename(seed, width, height, ext = 'png') {
  return `cover-${seed}-${width}x${height}.${ext}`
}

/**
 * Export the canvas as a PNG file and trigger a browser download.
 * @param {HTMLCanvasElement} canvas - The canvas element to export
 * @param {number} seed - Integer seed value used for filename
 * @param {number} width - Export width in pixels
 * @param {number} height - Export height in pixels
 * @returns {Promise<void>} Resolves when export completes, rejects on failure
 */
export async function exportPng(canvas, seed, width, height) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG export failed'))
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateFilename(seed, width, height, 'png')
      a.click()
      URL.revokeObjectURL(url)
      resolve()
    }, 'image/png')
  })
}
