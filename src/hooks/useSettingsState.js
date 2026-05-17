/**
 * useSettingsState — Replaces DialKit's useCompositionPanel with plain React state.
 * Returns the same params shape that useCompositionParams expects.
 */

import { useState, useCallback, useRef } from 'react'

const DEFAULTS = {
  // Camera
  cameraType: 'oblique',
  cameraAngle: 315,
  cameraDistance: 20,
  // Style
  fillColor: '#E0E0E3',
  strokeColor: '#000000',
  accentColor: '#4F46E5',
  strokeWidth: 0.5,
  gap: 0,
  outlineWidth: 0,
  outlineColor: '#000000',
  // Text
  name: '',
  title: '',
  textColor: '#0F172A',
  fontSize: 32,
  titleFontSize: 18,
  textOpacity: 1,
  horizontalAlign: 'center',
  verticalAlign: 'bottom',
  textPadding: 40,
  textGap: 8,
  // Dimensions
  profile: 'LinkedIn (1584×396)',
  customWidth: 1584,
  customHeight: 396,
  // Composition
  seed: Date.now() | 0,
  clusterCount: 3,
  accentOpacity: 0.45,
  surfaceOpacity: 0.35,
  primitiveCount: 16,
  booleanSubtraction: true,
  gridTileSize: 24,
  // GIF
  frameCount: 10,
  frameDelay: 100,
  startingSeed: 0,
}

export function useSettingsState() {
  const [params, setParams] = useState(DEFAULTS)
  const actionsRef = useRef({ randomize: null, exportPng: null, exportGif: null })

  const update = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }))
  }, [])

  const randomize = useCallback(() => {
    setParams((prev) => ({ ...prev, seed: Date.now() | 0 }))
  }, [])

  return { params, update, randomize }
}
