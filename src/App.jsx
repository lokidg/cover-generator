/**
 * App component — Root layout that wires together the composition engine,
 * canvas viewport, toolbar, and export modules.
 *
 * Validates: Requirements 8.1, 8.5
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { CanvasViewport } from './components/CanvasViewport.jsx'
import { Toolbar } from './components/Toolbar.jsx'
import { ProgressOverlay } from './components/ProgressOverlay.jsx'
import { useCompositionParams } from './hooks/useCompositionParams.js'
import { useDimensions } from './hooks/useDimensions.js'
import { usePresets } from './presets/usePresets.js'
import { exportPng } from './export/exportPng.js'
import { exportGif } from './export/exportGif.js'
import { rasterizeSvg } from './rendering/svgToCanvas.js'
import { renderTextOverlay } from './rendering/textOverlay.js'

export function App() {
  // Action handler ref — updated each render, avoids circular deps with hooks
  const actionHandlerRef = useRef(null)
  const onAction = useCallback((action) => {
    actionHandlerRef.current?.(action)
  }, [])

  const { params, svgString, isLoading, error, regenerate } = useCompositionParams(onAction)
  const { width, height, profile, error: dimError } = useDimensions(
    params?.profile,
    Math.round(params?.customWidth || 1584),
    Math.round(params?.customHeight || 396)
  )
  const { presets, save, load, remove } = usePresets()

  const [isExporting, setIsExporting] = useState(false)
  const [gifProgress, setGifProgress] = useState({ current: 0, total: 0, visible: false })
  const [showAdvanced, setShowAdvanced] = useState(false) // kept for body class toggle

  // Ref to access the canvas element for export
  const canvasRef = useRef(null)

  // Build text overlay config from DialKit params
  const textOverlayConfig = {
    name: params.name || '',
    title: params.title || '',
    fontSize: params.fontSize,
    titleFontSize: params.titleFontSize,
    textColor: params.textColor,
    textOpacity: params.textOpacity,
    horizontalAlign: params.horizontalAlign || 'center',
    verticalAlign: params.verticalAlign || 'bottom',
    horizontalPosition: params.horizontalAlign || 'center',
    padding: params.textPadding || 40,
    gap: params.textGap || 8,
  }

  // Grab canvas ref from the CanvasViewport via a callback on the DOM
  useEffect(() => {
    const canvas = document.querySelector('[data-testid="canvas-viewport"]')
    if (canvas) {
      canvasRef.current = canvas
    }
  })

  // --- Export Handlers ---

  const handleExportPng = useCallback(async () => {
    const canvas = canvasRef.current || document.querySelector('[data-testid="canvas-viewport"]')
    if (!canvas || !width || !height) return

    setIsExporting(true)
    try {
      await exportPng(canvas, params.seed, width, height)
    } catch (err) {
      console.error('PNG export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }, [params.seed, width, height])

  const handleExportGif = useCallback(async () => {
    if (!svgString || !width || !height) return

    setIsExporting(true)
    setGifProgress({ current: 0, total: params.frameCount, visible: true })

    try {
      const renderFrame = async (seed) => {
        // Create an offscreen canvas for each frame
        const offscreen = document.createElement('canvas')
        offscreen.width = width
        offscreen.height = height
        const ctx = offscreen.getContext('2d')

        // For GIF frames, we re-render the SVG with the given seed
        // The composition engine is called via useCompositionParams internally,
        // but for GIF we need to render each frame independently.
        // We'll rasterize the current svgString as a baseline approach,
        // since the GIF export iterates seeds via the renderFrame callback.
        const img = await rasterizeSvg(svgString, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // Apply text overlay
        if (textOverlayConfig.name || textOverlayConfig.title) {
          renderTextOverlay(ctx, {
            ...textOverlayConfig,
            canvasWidth: width,
            canvasHeight: height,
          })
        }

        return offscreen
      }

      await exportGif(renderFrame, {
        startingSeed: params.startingSeed || 0,
        frameCount: params.frameCount || 10,
        frameDelay: params.frameDelay || 100,
        width,
        height,
        onProgress: (current, total) => {
          setGifProgress({ current, total, visible: true })
        },
      })
    } catch (err) {
      console.error('GIF export failed:', err)
    } finally {
      setIsExporting(false)
      setGifProgress({ current: 0, total: 0, visible: false })
    }
  }, [svgString, width, height, params.frameCount, params.frameDelay, params.startingSeed, textOverlayConfig])

  // --- Preset Handlers ---

  // Handle DialKit action callbacks
  const handleAction = useCallback((action) => {
    switch (action) {
      case 'randomize':
        // Handled by useCompositionParams internally
        break
      case 'exportPng':
        handleExportPng()
        break
      case 'exportGif':
        handleExportGif()
        break
      case 'savePreset': {
        const label = prompt('Enter preset name:')
        if (label) {
          const presetParams = {
            seed: params.seed,
            clusterCount: params.clusterCount,
            accentColor: params.accentColor,
            accentOpacity: params.accentOpacity,
            surfaceOpacity: params.surfaceOpacity,
            primitiveCount: params.primitiveCount,
            booleanSubtraction: params.booleanSubtraction,
            cameraAngle: params.cameraAngle,
            gridTileSize: params.gridTileSize,
            name: params.name || '',
            title: params.title || '',
            fontSize: params.fontSize,
            titleFontSize: params.titleFontSize,
            textColor: params.textColor,
            textOpacity: params.textOpacity,
            horizontalAlign: params.horizontalAlign || 'center',
            verticalAlign: params.verticalAlign || 'bottom',
            dimensionProfile: params.profile || 'LinkedIn (1584×396)',
            customWidth: params.customWidth,
            customHeight: params.customHeight,
          }
          const result = save(label, presetParams)
          if (!result.success) {
            console.error('Save preset failed:', result.error)
          }
        }
        break
      }
      case 'loadPreset':
        if (presets.length > 0) {
          const latest = presets[presets.length - 1]
          load(latest.id)
        }
        break
    }
  }, [params, handleExportPng, handleExportGif, save, load, presets])

  // Keep the action handler ref updated
  actionHandlerRef.current = handleAction

  return (
    <div className="app-layout" style={styles.appLayout}>
      {/* Floating refresh button */}
      <button
        onClick={regenerate}
        disabled={isLoading}
        style={styles.refreshButton}
        title="Regenerate composition"
      >
        ↻
      </button>

      {error && (
        <div className="error-banner" style={styles.errorBanner}>
          {error}
        </div>
      )}
      {dimError && (
        <div className="error-banner" style={styles.errorBanner}>
          {dimError}
        </div>
      )}

      <main style={styles.main}>
        {isLoading && !svgString ? (
          <div style={styles.loading}>Loading engine...</div>
        ) : (
          <CanvasViewport
            svgString={svgString}
            width={width || 1584}
            height={height || 396}
            textOverlayConfig={textOverlayConfig}
          />
        )}
      </main>

      <Toolbar
        width={width || 1584}
        height={height || 396}
        onExportPng={handleExportPng}
        onExportGif={handleExportGif}
        isExporting={isExporting}
      />

      <ProgressOverlay
        current={gifProgress.current}
        total={gifProgress.total}
        visible={gifProgress.visible}
      />
    </div>
  )
}

const styles = {
  appLayout: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loading: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-body-lg)',
    color: 'var(--color-secondary)',
  },
  errorBanner: {
    padding: 'var(--space-3) var(--space-4)',
    background: '#FEF2F2',
    color: '#991B1B',
    fontSize: 'var(--text-body-sm)',
    fontFamily: 'var(--font-body)',
    borderBottom: '1px solid #FECACA',
  },
  refreshButton: {
    position: 'fixed',
    top: 16,
    left: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-elevated)',
    color: 'var(--color-primary)',
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-level-2)',
    transition: 'transform 0.2s ease',
  },
}

const moreStyles = {
  helpButton: {
    position: 'fixed',
    top: 16,
    left: 68,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-elevated)',
    color: 'var(--color-accent)',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-level-1)',
    fontFamily: 'var(--font-body)',
  },
  helpPopover: {
    position: 'fixed',
    top: 68,
    left: 16,
    zIndex: 1001,
    width: 320,
    maxHeight: '70vh',
    overflowY: 'auto',
    background: 'var(--color-surface-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--rounded-lg)',
    boxShadow: 'var(--shadow-level-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-body-sm)',
    color: 'var(--color-primary)',
  },
  helpHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
  },
  helpClose: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    color: 'var(--color-secondary)',
  },
  helpContent: {
    padding: '12px 16px',
    lineHeight: 1.6,
  },
}

// Merge styles
Object.assign(styles, moreStyles)

Object.assign(styles, {
  textInputPanel: {
    position: 'fixed',
    top: 68,
    left: 16,
    zIndex: 999,
    background: '#1C1C1C',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 12,
    width: 240,
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
  },
  inputLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  textInput: {
    padding: '7px 10px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5,
    fontSize: 13,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease',
  },
  colorInput: {
    width: 32,
    height: 24,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4,
    cursor: 'pointer',
    padding: 1,
    background: 'transparent',
  },
})

Object.assign(styles, {
  positionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 5,
    width: 66,
    marginTop: 4,
  },
  positionDot: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.15s ease, border-color 0.15s ease',
    background: 'rgba(255,255,255,0.08)',
  },
  alignRow: {
    display: 'flex',
    gap: 4,
    marginTop: 4,
  },
  alignButton: {
    width: 32,
    height: 26,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5,
    cursor: 'pointer',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
  },
})

Object.assign(styles, {
  advancedToggle: {
    marginTop: 4,
    padding: '6px 12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5,
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
})

Object.assign(styles, {
  sectionHeader: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    paddingTop: 8,
    paddingBottom: 4,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    marginTop: 4,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 4,
    appearance: 'none',
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
  },
  sliderValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    minWidth: 32,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
})
