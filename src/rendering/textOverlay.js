/**
 * Text Overlay Compositing
 *
 * Renders name (Outfit 700) and title (Inter 400) on the canvas
 * with configurable alignment, opacity, and ellipsis truncation.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9
 */

/**
 * Truncates text with ellipsis ("…") if it exceeds maxWidth using ctx.measureText().
 * Returns the original text if it fits, otherwise truncates character by character.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context (font must be set before calling)
 * @param {string} text - The text to potentially truncate
 * @param {number} maxWidth - Maximum allowed width in pixels
 * @returns {string} The original or truncated text
 */
export function truncateText(ctx, text, maxWidth) {
  if (maxWidth <= 0) return '…'

  const measured = ctx.measureText(text)
  if (measured.width <= maxWidth) return text

  const ellipsis = '…'
  for (let i = text.length - 1; i >= 0; i--) {
    const truncated = text.slice(0, i) + ellipsis
    if (ctx.measureText(truncated).width <= maxWidth) {
      return truncated
    }
  }

  // If even a single character + ellipsis doesn't fit, return just the ellipsis
  return ellipsis
}

/**
 * Renders text overlay (name and title) on the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Object} config - Text overlay configuration
 * @param {string} config.name - User's name text
 * @param {string} config.title - User's title text
 * @param {number} config.fontSize - Font size for name in pixels
 * @param {number} config.titleFontSize - Font size for title in pixels
 * @param {string} config.textColor - CSS color string for text
 * @param {number} config.textOpacity - Opacity value 0–1
 * @param {'left'|'center'|'right'} config.horizontalAlign - Horizontal alignment
 * @param {'top'|'center'|'bottom'} config.verticalAlign - Vertical alignment
 * @param {number} config.canvasWidth - Canvas width in pixels
 * @param {number} config.canvasHeight - Canvas height in pixels
 */
export function renderTextOverlay(ctx, { name, title, fontSize, titleFontSize, textColor, textOpacity, horizontalAlign, verticalAlign, canvasWidth, canvasHeight }) {
  if (!name && !title) return

  ctx.save()
  ctx.globalAlpha = textOpacity

  // Position calculation based on alignment
  const x = horizontalAlign === 'left' ? 40 : horizontalAlign === 'right' ? canvasWidth - 40 : canvasWidth / 2
  const baseY = verticalAlign === 'top' ? 60 : verticalAlign === 'bottom' ? canvasHeight - 40 : canvasHeight / 2
  const textAlign = horizontalAlign === 'left' ? 'left' : horizontalAlign === 'right' ? 'right' : 'center'

  ctx.textAlign = textAlign
  ctx.fillStyle = textColor

  const maxWidth = canvasWidth - 80

  if (name) {
    ctx.font = `700 ${fontSize}px Outfit`
    const displayName = truncateText(ctx, name, maxWidth)
    ctx.fillText(displayName, x, baseY - (title ? titleFontSize + 8 : 0))
  }
  if (title) {
    ctx.font = `400 ${titleFontSize}px Inter`
    const displayTitle = truncateText(ctx, title, maxWidth)
    ctx.fillText(displayTitle, x, baseY)
  }

  ctx.restore()
}
