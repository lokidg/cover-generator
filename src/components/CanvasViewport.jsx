/**
 * CanvasViewport component — manages the HTML5 canvas element,
 * calls the SVG-to-Canvas rasterizer on svgString change,
 * and applies responsive scaling via useCanvasResize hook.
 *
 * Validates: Requirements 2.4, 10.1, 10.2, 10.3
 */

import { useRef, useEffect } from 'react'
import { useCanvasResize } from '../hooks/useCanvasResize.js'
import { rasterizeSvg } from '../rendering/svgToCanvas.js'
import { renderTextOverlay } from '../rendering/textOverlay.js'

/**
 * @param {Object} props
 * @param {string} props.svgString - SVG markup to render on canvas
 * @param {number} props.width - Target canvas width in pixels
 * @param {number} props.height - Target canvas height in pixels
 * @param {Object} [props.textOverlayConfig] - Text overlay configuration (rendered by task 7.1)
 */
export function CanvasViewport({ svgString, width, height, textOverlayConfig }) {
  const canvasRef = useRef(null)
  const { scale, displayWidth, displayHeight, containerRef } = useCanvasResize({ width, height })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !svgString) return

    let cancelled = false

    async function render() {
      try {
        const img = await rasterizeSvg(svgString, width, height)
        if (cancelled) return

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // Composite text overlay after SVG background
        if (textOverlayConfig) {
          renderTextOverlay(ctx, { ...textOverlayConfig, canvasWidth: width, canvasHeight: height })
        }
      } catch (err) {
        console.error('Canvas rendering failed:', err)
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [svgString, width, height, textOverlayConfig])

  return (
    <div
      ref={containerRef}
      className="canvas-viewport"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        data-testid="canvas-viewport"
      />
    </div>
  )
}
