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
    // ─── CAMERA (always visible) ───
    'Camera': {
      cameraType: { type: 'select', options: ['oblique', 'perspective', 'orthographic', 'isometric'] },
      cameraAngle: [315, 0, 360, 1],
      cameraDistance: [20, 1, 80, 1],
    },

    // ─── STYLE (always visible) ───
    'Style': {
      fillColor: '#E0E0E3',
      strokeColor: '#000000',
      accentColor: '#4F46E5',
      strokeWidth: [0.5, 0, 3, 0.1],
      gap: [0, 0, 0.3, 0.01],
      outlineWidth: [0, 0, 5, 0.5],
      outlineColor: '#000000',
      // Style toggles with progressive disclosure sub-controls
      hatchingEnabled: false,
      hatchAngle: [45, 0, 180, 15],
      hatchDensity: [3, 1, 5, 1],
      hatchColor: '#000000',
      smoothEnabled: false,
      functionalStyleEnabled: false,
      styleFunction: { type: 'select', options: ['gradient-x', 'gradient-y', 'gradient-z', 'radial'] },
      styleStartColor: '#E0E0E3',
      styleEndColor: '#4F46E5',
      perFaceEnabled: false,
      faceTopColor: '#E0E0E3',
      faceLeftColor: '#E0E0E3',
      faceRightColor: '#E0E0E3',
    },

    // ─── SHAPES (collapsed) ───
    'Shapes': {
      _collapsed: true,
      spheresEnabled: false,
      sphereRadius: [8, 1, 16, 1],
      linesEnabled: false,
      lineStartX: [0, 0, 24, 1],
      lineStartY: [0, 0, 24, 1],
      lineStartZ: [0, 0, 24, 1],
      lineEndX: [18, 0, 24, 1],
      lineEndY: [18, 0, 24, 1],
      lineEndZ: [18, 0, 24, 1],
      fillsEnabled: false,
      fillPointCount: [6, 3, 12, 1],
    },

    // ─── BOOLEAN (collapsed) ───
    'Boolean': {
      _collapsed: true,
      booleanMode: { type: 'select', options: ['union', 'subtract', 'intersect', 'exclude'] },
    },

    // ─── ADVANCED (collapsed) ───
    'Advanced': {
      _collapsed: true,
      rotationEnabled: false,
      rotationAxis: { type: 'select', options: ['X', 'Y', 'Z'] },
      rotationAmount: { type: 'select', options: [0, 90, 180, 270] },
      scalingEnabled: false,
      scalingMode: { type: 'select', options: ['static', 'functional'] },
      scaleX: [1.0, 0.1, 3.0, 0.1],
      scaleY: [1.0, 0.1, 3.0, 0.1],
      scaleZ: [1.0, 0.1, 3.0, 0.1],
      scalingFunction: { type: 'select', options: ['taper', 'step', 'wave'] },
      scalingAxis: { type: 'select', options: ['X', 'Y', 'Z'] },
      taperEndScale: [0.5, 0.1, 1.0, 0.1],
      stepCount: [4, 2, 10, 1],
      stepScale: [0.8, 0.1, 2.0, 0.1],
      waveFrequency: [1.0, 0.5, 5.0, 0.5],
      waveAmplitude: [0.3, 0.1, 1.0, 0.1],
      perShapeGapEnabled: false,
      gapMin: [0, 0, 0.2, 0.01],
      gapMax: [0.1, 0, 0.2, 0.01],
    },

    // ─── TEXT (existing, unchanged) ───
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

    // ─── DIMENSIONS (existing, unchanged) ───
    'Dimensions': {
      profile: { type: 'select', options: ['LinkedIn (1584×396)', 'Twitter/X (1500×500)', 'Facebook (820×312)', 'Custom'] },
      customWidth: [1584, 100, 4096, 1],
      customHeight: [396, 100, 4096, 1],
    },

    // ─── COMPOSITION (existing, unchanged) ───
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

    // ─── GIF EXPORT (existing, unchanged) ───
    'GIF Export': {
      _collapsed: true,
      frameCount: [10, 2, 30, 1],
      frameDelay: [100, 50, 500, 50],
      startingSeed: [0, 0, 999999, 1],
    },

    // ─── ACTIONS (existing, unchanged) ───
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
  const shapes = resolved['Shapes'] || {}
  const boolean = resolved['Boolean'] || {}
  const advanced = resolved['Advanced'] || {}
  const text = resolved['Text'] || {}
  const dimensions = resolved['Dimensions'] || {}
  const composition = resolved['Composition'] || {}
  const gifExport = resolved['GIF Export'] || {}
  const actions = resolved['Actions'] || {}

  const newResult = {
    // Camera
    cameraType: camera.cameraType || 'oblique',
    cameraAngle: camera.cameraAngle ?? 315,
    cameraDistance: camera.cameraDistance ?? 20,
    // Style
    fillColor: style.fillColor || '#E0E0E3',
    strokeColor: style.strokeColor || '#000000',
    accentColor: style.accentColor || '#4F46E5',
    strokeWidth: style.strokeWidth ?? 0.5,
    gap: style.gap ?? 0,
    outlineWidth: style.outlineWidth ?? 0,
    outlineColor: style.outlineColor || '#000000',
    // Style — hatching
    hatchingEnabled: style.hatchingEnabled ?? false,
    hatchAngle: style.hatchAngle ?? 45,
    hatchDensity: style.hatchDensity ?? 3,
    hatchColor: style.hatchColor || '#000000',
    // Style — smooth
    smoothEnabled: style.smoothEnabled ?? false,
    // Style — functional style
    functionalStyleEnabled: style.functionalStyleEnabled ?? false,
    styleFunction: style.styleFunction || 'gradient-x',
    styleStartColor: style.styleStartColor || '#E0E0E3',
    styleEndColor: style.styleEndColor || '#4F46E5',
    // Style — per-face
    perFaceEnabled: style.perFaceEnabled ?? false,
    faceTopColor: style.faceTopColor || '#E0E0E3',
    faceLeftColor: style.faceLeftColor || '#E0E0E3',
    faceRightColor: style.faceRightColor || '#E0E0E3',
    // Shapes
    spheresEnabled: shapes.spheresEnabled ?? false,
    sphereRadius: shapes.sphereRadius ?? 8,
    linesEnabled: shapes.linesEnabled ?? false,
    lineStartX: shapes.lineStartX ?? 0,
    lineStartY: shapes.lineStartY ?? 0,
    lineStartZ: shapes.lineStartZ ?? 0,
    lineEndX: shapes.lineEndX ?? 18,
    lineEndY: shapes.lineEndY ?? 18,
    lineEndZ: shapes.lineEndZ ?? 18,
    fillsEnabled: shapes.fillsEnabled ?? false,
    fillPointCount: shapes.fillPointCount ?? 6,
    // Boolean
    booleanMode: boolean.booleanMode || 'subtract',
    // Advanced — rotation
    rotationEnabled: advanced.rotationEnabled ?? false,
    rotationAxis: advanced.rotationAxis || 'Y',
    rotationAmount: advanced.rotationAmount ?? 0,
    // Advanced — scaling
    scalingEnabled: advanced.scalingEnabled ?? false,
    scalingMode: advanced.scalingMode || 'static',
    scaleX: advanced.scaleX ?? 1.0,
    scaleY: advanced.scaleY ?? 1.0,
    scaleZ: advanced.scaleZ ?? 1.0,
    scalingFunction: advanced.scalingFunction || 'taper',
    scalingAxis: advanced.scalingAxis || 'Y',
    taperEndScale: advanced.taperEndScale ?? 0.5,
    stepCount: advanced.stepCount ?? 4,
    stepScale: advanced.stepScale ?? 0.8,
    waveFrequency: advanced.waveFrequency ?? 1.0,
    waveAmplitude: advanced.waveAmplitude ?? 0.3,
    // Advanced — per-shape gap
    perShapeGapEnabled: advanced.perShapeGapEnabled ?? false,
    gapMin: advanced.gapMin ?? 0,
    gapMax: advanced.gapMax ?? 0.1,
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
