import { useDialKit } from 'dialkit'

export function useCompositionPanel() {
  const params = useDialKit('Cover Generator', {
    // Composition
    seed: [Date.now() | 0, 0, 2147483647, 1],
    clusterCount: [3, 2, 4, 1],
    accentColor: '#4F46E5',
    accentOpacity: [0.15, 0.10, 0.25, 0.01],
    surfaceOpacity: [0.10, 0.05, 0.15, 0.01],
    primitiveCount: [12, 8, 20, 1],
    booleanSubtraction: true,
    cameraAngle: [315, 0, 360, 1],
    gridTileSize: [18, 8, 32, 1],

    // Text Overlay
    'Text Overlay': {
      name: '',
      title: '',
      fontSize: [32, 12, 72, 1],
      titleFontSize: [18, 12, 72, 1],
      textColor: '#FFFFFF',
      textOpacity: [1.0, 0, 1, 0.01],
      horizontalAlign: { type: 'select', options: ['left', 'center', 'right'] },
      verticalAlign: { type: 'select', options: ['top', 'center', 'bottom'] },
    },

    // Dimensions
    'Dimensions': {
      profile: { type: 'select', options: ['LinkedIn (1584×396)', 'Twitter/X (1500×500)', 'Facebook (820×312)', 'Custom'] },
      customWidth: [1500, 100, 4096, 1],
      customHeight: [500, 100, 4096, 1],
    },

    // GIF Export
    'GIF Settings': {
      frameCount: [10, 2, 30, 1],
      frameDelay: [100, 50, 500, 50],
      startingSeed: [0, 0, 999999, 1],
    },

    // Actions
    'Actions': {
      randomize: { type: 'action' },
      exportPng: { type: 'action' },
      exportGif: { type: 'action' },
      savePreset: { type: 'action' },
      loadPreset: { type: 'action' },
    },
  })

  return params
}
