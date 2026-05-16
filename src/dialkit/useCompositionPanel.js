import { useDialKit } from 'dialkit'
import { useRef } from 'react'

/**
 * Resolves DialKit values — v1.2.0 returns flat values directly for most types.
 * Sliders return numbers, colors return hex strings, text returns strings.
 */
function resolveValue(raw) {
  if (raw === null || raw === undefined) return raw
  if (typeof raw !== 'object') return raw
  // Action config — pass through
  if (raw.type === 'action') return raw
  // Text config object { type: 'text', placeholder: '...' } — return empty string as default
  if (raw.type === 'text') return ''
  // Select config object { type: 'select', options: [...] } — return first option as default
  if (raw.type === 'select' && raw.options) return raw.options[0]
  // Color config object { type: 'color' } — return empty string
  if (raw.type === 'color') return ''
  // Spring/easing config
  if (raw.type === 'spring' || raw.type === 'easing') return raw
  // Folder — recurse
  const resolved = {}
  for (const [key, val] of Object.entries(raw)) {
    if (key === '_collapsed') continue
    resolved[key] = resolveValue(val)
  }
  return resolved
}

export function useCompositionPanel(onAction) {
  const raw = useDialKit('Cover Generator', {
    // ─── CAMERA ───
    'Camera': {
      cameraAngle: [315, 0, 360, 1],
      cameraDistance: [20, 5, 40, 1],
    },

    // ─── STYLE ───
    'Style': {
      fillColor: '#E0E0E3',
      strokeColor: '#000000',
      accentColor: '#4F46E5',
      strokeWidth: [0.5, 0, 3, 0.1],
      gap: [0, 0, 0.3, 0.01],
    },

    // ─── TEXT ───
    'Text': {
      name: { type: 'text', placeholder: 'Your Name' },
      title: { type: 'text', placeholder: 'Your Title' },
      textColor: '#0F172A',
      fontSize: [32, 12, 72, 1],
      titleFontSize: [18, 12, 72, 1],
      textOpacity: [1.0, 0, 1, 0.01],
      horizontalAlign: { type: 'select', options: ['left', 'center', 'right'] },
      verticalAlign: { type: 'select', options: ['top', 'center', 'bottom'] },
      textPadding: [40, 16, 120, 1],
      textGap: [8, 0, 32, 1],
    },

    // ─── DIMENSIONS ───
    'Dimensions': {
      profile: { type: 'select', options: ['LinkedIn (1584×396)', 'Twitter/X (1500×500)', 'Facebook (820×312)', 'Custom'] },
      customWidth: [1584, 100, 4096, 1],
      customHeight: [396, 100, 4096, 1],
    },

    // ─── COMPOSITION (advanced) ───
    'Composition': {
      _collapsed: true,
      seed: [Date.now() | 0, 0, 2147483647, 1],
      clusterCount: [3, 2, 4, 1],
      accentOpacity: [0.15, 0.10, 0.25, 0.01],
      surfaceOpacity: [0.10, 0.05, 0.15, 0.01],
      primitiveCount: [16, 8, 30, 1],
      booleanSubtraction: true,
      gridTileSize: [24, 12, 40, 1],
    },

    // ─── GIF EXPORT (advanced) ───
    'GIF Export': {
      _collapsed: true,
      frameCount: [10, 2, 30, 1],
      frameDelay: [100, 50, 500, 50],
      startingSeed: [0, 0, 999999, 1],
    },

    // ─── ACTIONS ───
    'Actions': {
      _collapsed: true,
      randomize: { type: 'action' },
      exportPng: { type: 'action' },
      exportGif: { type: 'action' },
    },
  }, { onAction })

  // Flatten folder values to top level
  const resolved = resolveValue(raw)
  const camera = resolved['Camera'] || {}
  const style = resolved['Style'] || {}
  const text = resolved['Text'] || {}
  const dimensions = resolved['Dimensions'] || {}
  const composition = resolved['Composition'] || {}
  const gifExport = resolved['GIF Export'] || {}
  const actions = resolved['Actions'] || {}

  const newResult = {
    // Camera
    cameraAngle: camera.cameraAngle ?? 315,
    cameraDistance: camera.cameraDistance ?? 20,
    // Style
    fillColor: style.fillColor || '#E0E0E3',
    strokeColor: style.strokeColor || '#000000',
    accentColor: style.accentColor || '#4F46E5',
    strokeWidth: style.strokeWidth ?? 0.5,
    gap: style.gap ?? 0,
    // Text
    name: text.name || '',
    title: text.title || '',
    textColor: text.textColor || '#0F172A',
    fontSize: text.fontSize || 32,
    titleFontSize: text.titleFontSize || 18,
    textOpacity: text.textOpacity ?? 1,
    horizontalAlign: text.horizontalAlign || 'center',
    verticalAlign: text.verticalAlign || 'bottom',
    textPadding: text.textPadding ?? 40,
    textGap: text.textGap ?? 8,
    // Dimensions
    profile: dimensions.profile || 'LinkedIn (1584×396)',
    customWidth: dimensions.customWidth || 1584,
    customHeight: dimensions.customHeight || 396,
    // Composition
    seed: composition.seed ?? (Date.now() | 0),
    clusterCount: composition.clusterCount ?? 3,
    accentOpacity: composition.accentOpacity ?? 0.15,
    surfaceOpacity: composition.surfaceOpacity ?? 0.10,
    primitiveCount: composition.primitiveCount ?? 16,
    booleanSubtraction: composition.booleanSubtraction ?? true,
    gridTileSize: composition.gridTileSize ?? 24,
    // GIF
    frameCount: gifExport.frameCount || 10,
    frameDelay: gifExport.frameDelay || 100,
    startingSeed: gifExport.startingSeed || 0,
    // Actions
    randomize: actions.randomize,
    exportPng: actions.exportPng,
    exportGif: actions.exportGif,
  }

  // Stable reference
  const prevRef = useRef(newResult)
  const prevJson = JSON.stringify(prevRef.current)
  const newJson = JSON.stringify(newResult)
  if (prevJson !== newJson) {
    prevRef.current = newResult
  }

  return prevRef.current
}
