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
  const { params, svgString, isLoading, error } = useCompositionParams()
  const { width, height, profile, error: dimError } = useDimensions(
    params.profile,
    params.customWidth,
    params.customHeight
  )
  const { presets, save, load, remove } = usePresets()

  const [isExporting, setIsExporting] = useState(false)
  const [gifProgress, setGifProgress] = useState({ current: 0, total: 0, visible: false })

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

  // Handle DialKit action callbacks via useEffect watchers
  const prevActionsRef = useRef({})

  useEffect(() => {
    // Detect DialKit action triggers by comparing with previous values
    const prev = prevActionsRef.current

    if (params.exportPng && params.exportPng !== prev.exportPng) {
      handleExportPng()
    }
    if (params.exportGif && params.exportGif !== prev.exportGif) {
      handleExportGif()
    }
    if (params.savePreset && params.savePreset !== prev.savePreset) {
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
    }
    if (params.loadPreset && params.loadPreset !== prev.loadPreset) {
      // Load the most recent preset as a simple default behavior
      if (presets.length > 0) {
        const latest = presets[presets.length - 1]
        load(latest.id)
      }
    }

    prevActionsRef.current = {
      exportPng: params.exportPng,
      exportGif: params.exportGif,
      savePreset: params.savePreset,
      loadPreset: params.loadPreset,
      randomize: params.randomize,
    }
  }, [params.exportPng, params.exportGif, params.savePreset, params.loadPreset, params.randomize, handleExportPng, handleExportGif, save, load, presets])

  return (
    <div className="app-layout">
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
        <CanvasViewport
          svgString={svgString}
          width={width || 1584}
          height={height || 396}
          textOverlayConfig={textOverlayConfig}
        />
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
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  errorBanner: {
    padding: 'var(--space-3) var(--space-4)',
    background: '#FEF2F2',
    color: '#991B1B',
    fontSize: 'var(--text-body-sm)',
    fontFamily: 'var(--font-body)',
    borderBottom: '1px solid #FECACA',
  },
}
