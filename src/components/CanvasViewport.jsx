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

/**
 * @param {Object} props
 * @param {string} props.svgString - SVG markup to render on canvas
 * @param {number} props.width - Target canvas width in pixels
 * @param {number} props.height - Target canvas height in pixels
 * @param {Object} [props.textOverlayConfig] - Text overlay configuration
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
        // Text is rendered as a separate HTML layer above the mask
      } catch (err) {
        console.error('Canvas rendering failed:', err)
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [svgString, width, height])

  // Compute text position based on alignment
  const tc = textOverlayConfig || {}
  const hasText = tc.name || tc.title
  const hAlign = tc.horizontalAlign || 'left'
  const vPos = tc.verticalAlign || 'bottom'
  const hPos = tc.horizontalPosition || 'left'
  const padding = tc.padding || 40
  const gap = tc.gap || 8

  const textStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: vPos === 'top' ? 'flex-start' : vPos === 'bottom' ? 'flex-end' : 'center',
    alignItems: hPos === 'left' ? 'flex-start' : hPos === 'right' ? 'flex-end' : 'center',
    textAlign: hAlign,
    padding: `${padding}px`,
    gap: `${gap}px`,
    pointerEvents: 'none',
    zIndex: 2,
    opacity: tc.textOpacity ?? 1,
  }

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
      <div style={{ position: 'relative', width: `${displayWidth}px`, height: `${displayHeight}px` }}>
        {/* Canvas with generative art at 50% opacity */}
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #C9C9C9',
            background: '#FFFFFF',
            opacity: 0.5,
          }}
          data-testid="canvas-viewport"
        />
        {/* Gradient mask overlay — fades art into page background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.8) 50%, #FFFFFF 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Text overlay — rendered as HTML above the mask */}
        {hasText && (
          <div style={textStyle} data-testid="text-overlay-layer">
            {tc.name && (
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                fontSize: `${tc.fontSize || 32}px`,
                color: tc.textColor || '#FFFFFF',
                lineHeight: 1.2,
              }}>
                {tc.name}
              </span>
            )}
            {tc.title && (
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: `${tc.titleFontSize || 18}px`,
                color: tc.textColor || '#FFFFFF',
                lineHeight: 1.4,
              }}>
                {tc.title}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
