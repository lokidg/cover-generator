/**
 * useCompositionParams — Central state hook bridging DialKit params to the composition engine.
 *
 * Subscribes to DialKit parameter changes via useCompositionPanel,
 * debounces at 50ms to prevent excessive Heerich calls during slider drags,
 * then triggers CompositionEngine.generate() and exposes the resulting SVG.
 *
 * Requirements: 1.2, 3.3, 8.5
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useCompositionPanel } from '../dialkit/useCompositionPanel.js'
import { SeededPRNG } from '../engine/SeededPRNG.js'
import { CompositionEngine } from '../engine/CompositionEngine.js'
import { loadHeerich, createHeerichInstance } from '../engine/heerichAdapter.js'

const DEBOUNCE_MS = 300

/**
 * @typedef {Object} CompositionParamsResult
 * @property {object} params - Current DialKit parameters
 * @property {string|null} svgString - Generated SVG string (null before first render)
 * @property {boolean} isLoading - Whether a render is in progress
 * @property {string|null} error - Error message if engine call failed
 */

/**
 * Central composition state hook.
 * Bridges DialKit panel params → debounced engine render → SVG output.
 *
 * @returns {CompositionParamsResult}
 */
export function useCompositionParams(onAction) {
  const params = useCompositionPanel(onAction)

  const [svgString, setSvgString] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [engineReady, setEngineReady] = useState(false)

  // Track the debounce timer
  const debounceRef = useRef(null)
  // Track the latest params for the debounced callback
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

  // Handle randomize action — sets seed to Date.now() | 0
  const prevRandomizeRef = useRef(null)
  useEffect(() => {
    if (params.randomize && params.randomize !== prevRandomizeRef.current) {
      prevRandomizeRef.current = params.randomize
      paramsRef.current = { ...paramsRef.current, seed: Date.now() | 0 }
    }
  }, [params.randomize])

  // Generate composition on debounced param changes
  const generate = useCallback(() => {
    if (!engineReady) return

    const currentParams = paramsRef.current
    setIsLoading(true)
    setError(null)

    try {
      const seed = currentParams.seed | 0
      const prng = new SeededPRNG(seed)

      const config = {
        clusterCount: currentParams.clusterCount,
        primitiveCount: currentParams.primitiveCount,
        accentOpacity: currentParams.accentOpacity,
        surfaceOpacity: currentParams.surfaceOpacity,
        booleanSubtraction: currentParams.booleanSubtraction,
        cameraAngle: currentParams.cameraAngle,
        gridTileSize: currentParams.gridTileSize,
        accentColor: currentParams.accentColor,
      }

      const heerich = createHeerichInstance({
        cameraAngle: config.cameraAngle,
        gridTileSize: config.gridTileSize,
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

  // Debounce param changes at 50ms
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      generate()
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [
    params.seed,
    params.clusterCount,
    params.accentColor,
    params.accentOpacity,
    params.surfaceOpacity,
    params.primitiveCount,
    params.booleanSubtraction,
    params.cameraAngle,
    params.gridTileSize,
    params.randomize,
    generate,
    engineReady,
  ])

  return { params, svgString, isLoading, error, regenerate: generate }
}
