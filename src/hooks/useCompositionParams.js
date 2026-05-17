/**
 * useCompositionParams — Central state hook bridging panel params to the composition engine.
 *
 * Accepts params from useSettingsState (plain React state),
 * debounces at 300ms to prevent excessive Heerich calls during slider drags,
 * then triggers CompositionEngine.generate() and exposes the resulting SVG.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { SeededPRNG } from '../engine/SeededPRNG.js'
import { CompositionEngine } from '../engine/CompositionEngine.js'
import { loadHeerich, createHeerichInstance } from '../engine/heerichAdapter.js'

const DEBOUNCE_MS = 300

/**
 * Central composition state hook.
 * Bridges panel params → debounced engine render → SVG output.
 *
 * @param {object} params - Current settings from useSettingsState
 * @returns {{ svgString: string|null, isLoading: boolean, error: string|null, regenerate: Function }}
 */
export function useCompositionParams(params) {
  const [svgString, setSvgString] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [engineReady, setEngineReady] = useState(false)

  const debounceRef = useRef(null)
  const paramsRef = useRef(params)
  paramsRef.current = params

  // Load Heerich engine from CDN on mount
  useEffect(() => {
    loadHeerich()
      .then(() => {
        setEngineReady(true)
        setError(null)
      })
      .catch((err) => {
        setError(err.message || 'Rendering engine failed to load. Check your internet connection.')
        setIsLoading(false)
      })
  }, [])

  // Generate composition
  const generate = useCallback(() => {
    if (!engineReady) return

    const p = paramsRef.current
    setIsLoading(true)
    setError(null)

    try {
      const seed = p.seed | 0
      const prng = new SeededPRNG(seed)

      const config = {
        clusterCount: p.clusterCount,
        primitiveCount: p.primitiveCount,
        accentOpacity: p.accentOpacity,
        surfaceOpacity: p.surfaceOpacity,
        booleanSubtraction: p.booleanSubtraction,
        cameraAngle: p.cameraAngle,
        gridTileSize: p.gridTileSize,
        accentColor: p.accentColor,
      }

      const heerich = createHeerichInstance({
        cameraAngle: p.cameraAngle,
        cameraDistance: p.cameraDistance,
        gridTileSize: p.gridTileSize,
        fillColor: p.fillColor,
        strokeColor: p.strokeColor,
        strokeWidth: p.strokeWidth,
        gap: p.gap,
        outlineWidth: p.outlineWidth || 0,
        outlineColor: p.outlineColor || '#000000',
        width: 1500,
        height: 500,
      })

      const result = CompositionEngine.generate(prng, heerich, config)
      setSvgString(result.svgString)
    } catch (err) {
      setError(err.message || 'Composition rendering failed. Try a different seed.')
    } finally {
      setIsLoading(false)
    }
  }, [engineReady])

  // Debounce param changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(generate, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [
    params.seed,
    params.clusterCount,
    params.accentColor,
    params.accentOpacity,
    params.surfaceOpacity,
    params.primitiveCount,
    params.booleanSubtraction,
    params.cameraAngle,
    params.cameraDistance,
    params.gridTileSize,
    params.fillColor,
    params.strokeColor,
    params.strokeWidth,
    params.gap,
    params.outlineWidth,
    params.outlineColor,
    generate,
    engineReady,
  ])

  return { svgString, isLoading, error, regenerate: generate }
}
