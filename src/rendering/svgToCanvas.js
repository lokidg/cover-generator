/**
 * SVG-to-Canvas Rasterizer
 *
 * Converts an SVG string into an Image element that can be drawn onto a canvas
 * via ctx.drawImage(). Uses the Blob URL pipeline for browser-native SVG rendering.
 *
 * Pipeline: SVG string → Blob (image/svg+xml) → Object URL → Image element → resolve on load
 *
 * Validates: Requirements 1.1, 8.4
 */

/**
 * Rasterizes an SVG string into an Image element at the specified dimensions.
 *
 * @param {string} svgString - Valid SVG markup to rasterize
 * @param {number} width - Target image width in pixels
 * @param {number} height - Target image height in pixels
 * @returns {Promise<HTMLImageElement>} Resolves with a loaded Image element ready for drawImage()
 * @throws {Error} Rejects with 'SVG rasterization failed' if the image fails to load
 */
export async function rasterizeSvg(svgString, width, height) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.width = width
  img.height = height

  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG rasterization failed'))
    }
    img.src = url
  })
}
