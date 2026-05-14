/**
 * useCanvasResize hook — computes responsive scale factor to fit a canvas
 * within the available viewport space, maintaining aspect ratio without upscaling.
 *
 * Validates: Requirements 2.4, 10.1, 10.2, 10.3
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const PADDING = 32 // 16px each side

/**
 * Computes the scale factor for responsive canvas display.
 * Scale = min(1, (availableWidth - PADDING) / width, (availableHeight - PADDING) / height)
 *
 * @param {number} canvasWidth - Target canvas width in pixels
 * @param {number} canvasHeight - Target canvas height in pixels
 * @param {number} viewportWidth - Available viewport width in pixels
 * @param {number} viewportHeight - Available viewport height in pixels
 * @returns {{ scale: number, displayWidth: number, displayHeight: number }}
 */
export function computeScale(canvasWidth, canvasHeight, viewportWidth, viewportHeight) {
  if (canvasWidth <= 0 || canvasHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { scale: 1, displayWidth: canvasWidth, displayHeight: canvasHeight }
  }

  const availableWidth = Math.max(0, viewportWidth - PADDING)
  const availableHeight = Math.max(0, viewportHeight - PADDING)

  const scaleX = availableWidth / canvasWidth
  const scaleY = availableHeight / canvasHeight

  // No upscaling: cap at 1
  const scale = Math.min(1, scaleX, scaleY)

  const displayWidth = Math.round(canvasWidth * scale)
  const displayHeight = Math.round(canvasHeight * scale)

  return { scale, displayWidth, displayHeight }
}

/**
 * React hook that computes responsive canvas scaling based on container size.
 *
 * @param {{ width: number, height: number }} dimensions - Target canvas dimensions
 * @returns {{ scale: number, displayWidth: number, displayHeight: number, containerRef: React.RefObject }}
 */
export function useCanvasResize({ width, height }) {
  const containerRef = useRef(null)
  const [viewportSize, setViewportSize] = useState({
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setViewportSize({
        viewportWidth: rect.width,
        viewportHeight: rect.height,
      })
    } else {
      setViewportSize({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
    }
  }, [])

  useEffect(() => {
    updateSize()

    let timeoutId = null
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(updateSize, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [updateSize])

  const { scale, displayWidth, displayHeight } = computeScale(
    width,
    height,
    viewportSize.viewportWidth,
    viewportSize.viewportHeight,
  )

  return { scale, displayWidth, displayHeight, containerRef }
}
