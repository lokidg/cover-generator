/**
 * useCompositionParams — Central state hook bridging DialKit params to the composition engine.
 *
 * Subscribes to DialKit parameter changes via useCompositionPanel,
 * debounces at 300ms to prevent excessive Heerich calls during slider drags,
 * then triggers CompositionEngine.generate() and exposes the resulting SVG.
 *
 * Requirements: 1.2, 3.3, 3.6, 8.5, 12.1
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

      // Expanded CompositionConfig — all engine fields
      const config = {
        // Existing
        clusterCount: currentParams.clusterCount,
        primitiveCount: currentParams.primitiveCount,
        accentOpacity: currentParams.accentOpacity,
        surfaceOpacity: currentParams.surfaceOpacity,
        booleanSubtraction: currentParams.booleanSubtraction,
        cameraAngle: currentParams.cameraAngle,
        gridTileSize: currentParams.gridTileSize,
        accentColor: currentParams.accentColor,
        // Shapes
        spheresEnabled: currentParams.spheresEnabled,
        sphereRadius: currentParams.sphereRadius,
        linesEnabled: currentParams.linesEnabled,
        lineStart: [currentParams.lineStartX, currentParams.lineStartY, currentParams.lineStartZ],
        lineEnd: [currentParams.lineEndX, currentParams.lineEndY, currentParams.lineEndZ],
        fillsEnabled: currentParams.fillsEnabled,
        fillPointCount: currentParams.fillPointCount,
        // Boolean
        booleanMode: currentParams.booleanMode,
        // Rotation
        rotationEnabled: currentParams.rotationEnabled,
        rotationAxis: currentParams.rotationAxis,
        rotationAmount: currentParams.rotationAmount,
        // Scaling
        scalingEnabled: currentParams.scalingEnabled,
        scalingMode: currentParams.scalingMode,
        scaleX: currentParams.scaleX,
        scaleY: currentParams.scaleY,
        scaleZ: currentParams.scaleZ,
        scalingFunction: currentParams.scalingFunction,
        scalingAxis: currentParams.scalingAxis,
        taperEndScale: currentParams.taperEndScale,
        stepCount: currentParams.stepCount,
        stepScale: currentParams.stepScale,
        waveFrequency: currentParams.waveFrequency,
        waveAmplitude: currentParams.waveAmplitude,
        // Styling
        hatchingEnabled: currentParams.hatchingEnabled,
        hatchAngle: currentParams.hatchAngle,
        hatchDensity: currentParams.hatchDensity,
        hatchColor: currentParams.hatchColor,
        smoothEnabled: currentParams.smoothEnabled,
        functionalStyleEnabled: currentParams.functionalStyleEnabled,
        styleFunction: currentParams.styleFunction,
        styleStartColor: currentParams.styleStartColor,
        styleEndColor: currentParams.styleEndColor,
        perFaceEnabled: currentParams.perFaceEnabled,
        faceTopColor: currentParams.faceTopColor,
        faceLeftColor: currentParams.faceLeftColor,
        faceRightColor: currentParams.faceRightColor,
        // Per-shape gap
        perShapeGapEnabled: currentParams.perShapeGapEnabled,
        gapMin: currentParams.gapMin,
        gapMax: currentParams.gapMax,
      }

      // Expanded adapter config — camera, style, outline, gap
      const heerich = createHeerichInstance({
        cameraType: currentParams.cameraType,
        cameraAngle: currentParams.cameraAngle,
        cameraDistance: currentParams.cameraDistance,
        gridTileSize: currentParams.gridTileSize,
        gap: currentParams.gap,
        outlineWidth: currentParams.outlineWidth,
        outlineColor: currentParams.outlineColor,
        fillColor: currentParams.fillColor,
        strokeColor: currentParams.strokeColor,
        strokeWidth: currentParams.strokeWidth,
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

  // Debounce param changes at 300ms
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
    // Existing
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
    // Camera
    params.cameraType,
    params.cameraDistance,
    // Style
    params.fillColor,
    params.strokeColor,
    params.strokeWidth,
    params.gap,
    params.outlineWidth,
    params.outlineColor,
    // Shapes
    params.spheresEnabled,
    params.sphereRadius,
    params.linesEnabled,
    params.lineStartX,
    params.lineStartY,
    params.lineStartZ,
    params.lineEndX,
    params.lineEndY,
    params.lineEndZ,
    params.fillsEnabled,
    params.fillPointCount,
    // Boolean
    params.booleanMode,
    // Rotation
    params.rotationEnabled,
    params.rotationAxis,
    params.rotationAmount,
    // Scaling
    params.scalingEnabled,
    params.scalingMode,
    params.scaleX,
    params.scaleY,
    params.scaleZ,
    params.scalingFunction,
    params.scalingAxis,
    params.taperEndScale,
    params.stepCount,
    params.stepScale,
    params.waveFrequency,
    params.waveAmplitude,
    // Styling
    params.hatchingEnabled,
    params.hatchAngle,
    params.hatchDensity,
    params.hatchColor,
    params.smoothEnabled,
    params.functionalStyleEnabled,
    params.styleFunction,
    params.styleStartColor,
    params.styleEndColor,
    params.perFaceEnabled,
    params.faceTopColor,
    params.faceLeftColor,
    params.faceRightColor,
    // Per-shape gap
    params.perShapeGapEnabled,
    params.gapMin,
    params.gapMax,
    // Internal
    generate,
    engineReady,
  ])

  return { params, svgString, isLoading, error, regenerate: generate }
}
