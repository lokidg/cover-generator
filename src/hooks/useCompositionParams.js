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
import { createHeerichInstance } from '../engine/heerichAdapter.js'

const DEBOUNCE_MS = 50

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
export function useCompositionParams() {
  const params = useCompositionPanel()

  const [svgString, setSvgString] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Track the debounce timer
  const debounceRef = useRef(null)
  // Track the latest params for the debounced callback
  const paramsRef = useRef(params)
  paramsRef.current = params

  // Handle randomize action — sets seed to Date.now() | 0
  const prevRandomizeRef = useRef(null)
  useEffect(() => {
    // DialKit action params are truthy when triggered
    if (params.randomize && params.randomize !== prevRandomizeRef.current) {
      prevRandomizeRef.current = params.randomize
      // DialKit doesn't provide a setter for individual params,
      // so we trigger a re-render by updating the seed externally.
      // In practice, DialKit's action callback fires and we handle it
      // by generating with a new seed.
      paramsRef.current = { ...paramsRef.current, seed: Date.now() | 0 }
    }
  }, [params.randomize])

  // Generate composition on debounced param changes
  const generate = useCallback(() => {
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
      // Keep previous SVG on error (don't clear it)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
  ])

  return { params, svgString, isLoading, error }
}
