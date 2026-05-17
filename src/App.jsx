/**
 * App component — Root layout wiring the composition engine,
 * canvas viewport, settings panel, toolbar, and exports.
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { CanvasViewport } from './components/CanvasViewport.jsx'
import { SettingsPanel } from './components/SettingsPanel.jsx'
import { Toolbar } from './components/Toolbar.jsx'
import { ProgressOverlay } from './components/ProgressOverlay.jsx'
import { useSettingsState } from './hooks/useSettingsState.js'
import { useCompositionParams } from './hooks/useCompositionParams.js'
import { useDimensions } from './hooks/useDimensions.js'
import { exportPng } from './export/exportPng.js'
import { exportGif } from './export/exportGif.js'
import { rasterizeSvg } from './rendering/svgToCanvas.js'
import { renderTextOverlay } from './rendering/textOverlay.js'

export function App() {
  const { params, update, randomize } = useSettingsState()
  const { svgString, isLoading, error, regenerate } = useCompositionParams(params)
  const { width, height } = useDimensions(
    params.profile,
    Math.round(params.customWidth),
    Math.round(params.customHeight)
  )

  const [isExporting, setIsExporting] = useState(false)
  const [gifProgress, setGifProgress] = useState({ current: 0, total: 0, visible: false })
  const canvasRef = useRef(null)

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

  useEffect(() => {
    const canvas = document.querySelector('[data-testid="canvas-viewport"]')
    if (canvas) canvasRef.current = canvas
  })

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
      const renderFrame = async () => {
        const offscreen = document.createElement('canvas')
        offscreen.width = width
        offscreen.height = height
        const ctx = offscreen.getContext('2d')
        const img = await rasterizeSvg(svgString, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        if (textOverlayConfig.name || textOverlayConfig.title) {
          renderTextOverlay(ctx, { ...textOverlayConfig, canvasWidth: width, canvasHeight: height })
        }
        return offscreen
      }
      await exportGif(renderFrame, {
        startingSeed: params.startingSeed || 0,
        frameCount: params.frameCount || 10,
        frameDelay: params.frameDelay || 100,
        width,
        height,
        onProgress: (current, total) => setGifProgress({ current, total, visible: true }),
      })
    } catch (err) {
      console.error('GIF export failed:', err)
    } finally {
      setIsExporting(false)
      setGifProgress({ current: 0, total: 0, visible: false })
    }
  }, [svgString, width, height, params.frameCount, params.frameDelay, params.startingSeed, textOverlayConfig])

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Randomize button */}
      <button
        onClick={randomize}
        disabled={isLoading}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 1000,
          width: 44, height: 44, borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-elevated)',
          color: 'var(--color-primary)',
          fontSize: 20, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-level-2)',
        }}
        title="Randomize seed"
      >
        ↻
      </button>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#991B1B', fontSize: 14, borderBottom: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {isLoading && !svgString ? (
          <div style={{ fontFamily: 'var(--font-body)', color: 'var(--color-secondary)' }}>Loading engine...</div>
        ) : (
          <CanvasViewport
            svgString={svgString}
            width={width || 1584}
            height={height || 396}
            textOverlayConfig={textOverlayConfig}
          />
        )}
      </main>

      <SettingsPanel params={params} onChange={update} />

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
