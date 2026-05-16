/**
 * CompositionEngine — Gestalt-principled voxel composition generator
 *
 * Adapted from the portfolio hero-generative.js reference.
 * Accepts a parameterized CompositionConfig and a Heerich instance (injected for testability).
 * Returns { plan, svgString } with no DOM coupling.
 *
 * Composition rules (Requirement 1.3):
 * - Cluster-based generation (2–4 clusters)
 * - Neutral surface fills at 5–15% opacity
 * - Accent color primitives at 10–25% opacity
 * - Boolean subtraction operations
 * - Max 30 total Heerich API calls per composition
 */

import { GestaltConstraints } from './GestaltConstraints.js'

// ─── Constants ───────────────────────────────────────────────

/** Neutral surface fills used for cluster primitives */
const NEUTRAL_FILLS = ['#D8D8DC', '#E4E4E7', '#D0D0D5', '#DCDCE0', '#E8E8EB']

/** Base additive primitive type (always available) */
const BASE_ADDITIVE_TYPES = ['addBox']

/** Additive primitive types available for clusters (default, backward-compatible) */
const ADDITIVE_TYPES = ['addBox']

/** Boolean subtraction types */
const SUBTRACTIVE_TYPES = ['removeBox']

// ─── Style Helpers ───────────────────────────────────────────

/**
 * Applies opacity to a hex color by converting to rgba.
 * @param {string} hex - Hex color like '#D8D8DC'
 * @param {number} opacity - Opacity value [0, 1]
 * @returns {string} rgba string
 */
function applyOpacity(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${Math.min(1, opacity).toFixed(2)})`
}

/**
 * Creates a Heerich style object for a neutral (background) primitive.
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {number} opacity - Fill opacity in the background range
 * @returns {object} Heerich style object
 */
function neutralStyle(prng, opacity) {
  const fill = prng.pick(NEUTRAL_FILLS)
  const topFill = prng.pick(NEUTRAL_FILLS)
  return {
    default: {
      fill: applyOpacity(fill, opacity),
      stroke: `rgba(0,0,0,${prng.floatRange(0.05, 0.06).toFixed(2)})`,
      strokeWidth: 0.5,
    },
    top: { fill: applyOpacity(topFill, opacity + 0.02) },
  }
}


/**
 * Creates a Heerich style object for an accent (foreground) primitive.
 * @param {string} accentColor - Hex color string for accent
 * @param {number} opacity - Fill opacity in the foreground range
 * @returns {object} Heerich style object
 */
function accentStyle(accentColor, opacity) {
  const r = parseInt(accentColor.slice(1, 3), 16)
  const g = parseInt(accentColor.slice(3, 5), 16)
  const b = parseInt(accentColor.slice(5, 7), 16)
  return {
    default: {
      fill: `rgba(${r},${g},${b},${opacity.toFixed(2)})`,
      stroke: `rgba(${r},${g},${b},${(opacity + 0.03).toFixed(2)})`,
      strokeWidth: 0.5,
    },
    top: { fill: `rgba(${r},${g},${b},${(opacity + 0.03).toFixed(2)})` },
  }
}

// ─── Cluster Generation ──────────────────────────────────────

/**
 * Generates non-overlapping bounding regions for clusters on the voxel grid.
 * Divides the grid into spatial zones to ensure inter-cluster separation.
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {number} count - Number of clusters (2–4)
 * @param {number} gridSize - Grid tile size
 * @returns {Array<{x: [number, number], y: [number, number], z: [number, number]}>}
 */
function generateClusterBounds(prng, count, gridSize) {
  const bounds = []
  // Use the full grid space — clusters overlap for denser coverage
  const zoneWidth = Math.floor(gridSize / count)

  for (let i = 0; i < count; i++) {
    // Clusters span most of the grid with overlap
    const xMin = Math.max(0, i * zoneWidth - prng.intRange(1, 3))
    const xMax = Math.min(gridSize, xMin + zoneWidth + prng.intRange(2, 6))
    const zMin = prng.intRange(0, Math.floor(gridSize * 0.2))
    const zMax = Math.min(gridSize, zMin + prng.intRange(Math.floor(gridSize * 0.5), gridSize))
    const yMin = prng.intRange(0, Math.floor(gridSize * 0.1))
    const yMax = Math.min(gridSize, yMin + prng.intRange(Math.floor(gridSize * 0.6), gridSize))

    bounds.push({
      x: [xMin, xMax],
      y: [yMin, yMax],
      z: [zMin, zMax],
    })
  }
  return bounds
}

/**
 * Populates a cluster with primitives respecting the dominant type ratio.
 * Dispatches to shape-specific helpers for sphere, line, and fill types.
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {object} bounds - Cluster bounding region
 * @param {string} dominantType - The dominant additive type for this cluster
 * @param {string[]} allowedTypes - The additive types chosen for this composition
 * @param {number} primCount - Number of primitives to generate
 * @param {number} bgOpacity - Background opacity for this cluster
 * @param {number} gridSize - Grid tile size
 * @param {object} [shapeConfig] - Shape-specific config (sphereRadius, lineStart, lineEnd, fillPointCount)
 * @returns {Array<object>} Array of primitive objects
 */
function populateCluster(prng, bounds, dominantType, allowedTypes, primCount, bgOpacity, gridSize, shapeConfig) {
  const primitives = []
  const dominantCount = Math.ceil(primCount * GestaltConstraints.DOMINANT_TYPE_MIN_RATIO)
  const otherTypes = allowedTypes.filter((t) => t !== dominantType)

  const xSpan = Math.max(4, bounds.x[1] - bounds.x[0])
  const ySpan = Math.max(4, bounds.y[1] - bounds.y[0])
  const zSpan = Math.max(4, bounds.z[1] - bounds.z[0])

  for (let i = 0; i < primCount; i++) {
    const type =
      i < dominantCount
        ? dominantType
        : prng.pick(otherTypes.length > 0 ? otherTypes : [dominantType])

    // Dispatch to shape-specific helpers for new types
    if (type === 'addSphere' && shapeConfig) {
      primitives.push(populateSphere(prng, bounds, shapeConfig.sphereRadius || 8, bgOpacity, gridSize))
      continue
    }
    if (type === 'addLine' && shapeConfig) {
      const lineStart = shapeConfig.lineStart || [0, 0, 0]
      const lineEnd = shapeConfig.lineEnd || [gridSize, gridSize, gridSize]
      primitives.push(populateLine(prng, bounds, lineStart, lineEnd, bgOpacity, gridSize))
      continue
    }
    if (type === 'addFill' && shapeConfig) {
      primitives.push(populateFill(prng, bounds, shapeConfig.fillPointCount || 6, bgOpacity, gridSize))
      continue
    }

    // Default: box primitive
    const pos = [
      prng.intRange(bounds.x[0], bounds.x[1]),
      prng.intRange(bounds.y[0], bounds.y[1]),
      prng.intRange(bounds.z[0], bounds.z[1]),
    ]
    // Larger sizes — 30-80% of the cluster span
    const size = [
      prng.intRange(Math.max(2, Math.floor(xSpan * 0.3)), Math.max(3, Math.floor(xSpan * 0.8))),
      prng.intRange(Math.max(2, Math.floor(ySpan * 0.3)), Math.max(3, Math.floor(ySpan * 0.8))),
      prng.intRange(Math.max(2, Math.floor(zSpan * 0.3)), Math.max(3, Math.floor(zSpan * 0.8))),
    ]
    // Clamp position + size to stay within grid
    const clampedPos = [
      Math.max(0, Math.min(pos[0], gridSize - size[0])),
      Math.max(0, Math.min(pos[1], gridSize - size[1])),
      Math.max(0, Math.min(pos[2], gridSize - size[2])),
    ]

    primitives.push({
      type,
      position: clampedPos,
      size,
      style: neutralStyle(prng, bgOpacity),
    })
  }
  return primitives
}

// ─── Shape Population Helpers ────────────────────────────────

/**
 * Generates a sphere primitive with radius clamped to [1, 16].
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {object} bounds - Cluster bounding region
 * @param {number} sphereRadius - Configured sphere radius
 * @param {number} bgOpacity - Background opacity
 * @param {number} gridSize - Grid tile size
 * @returns {object} Sphere primitive
 */
function populateSphere(prng, bounds, sphereRadius, bgOpacity, gridSize) {
  const radius = Math.max(1, Math.min(16, sphereRadius))
  const pos = [
    prng.intRange(bounds.x[0], bounds.x[1]),
    prng.intRange(bounds.y[0], bounds.y[1]),
    prng.intRange(bounds.z[0], bounds.z[1]),
  ]
  // Clamp position so sphere stays within grid
  const clampedPos = [
    Math.max(0, Math.min(pos[0], gridSize - radius * 2)),
    Math.max(0, Math.min(pos[1], gridSize - radius * 2)),
    Math.max(0, Math.min(pos[2], gridSize - radius * 2)),
  ]
  return {
    type: 'addSphere',
    position: clampedPos,
    size: [radius * 2, radius * 2, radius * 2],
    radius,
    style: neutralStyle(prng, bgOpacity),
  }
}

/**
 * Generates a line primitive with start/end clamped to [0, gridTileSize].
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {object} bounds - Cluster bounding region
 * @param {number[]} lineStart - Configured line start [x, y, z]
 * @param {number[]} lineEnd - Configured line end [x, y, z]
 * @param {number} bgOpacity - Background opacity
 * @param {number} gridSize - Grid tile size
 * @returns {object} Line primitive
 */
function populateLine(prng, bounds, lineStart, lineEnd, bgOpacity, gridSize) {
  // Generate start and end points within bounds, influenced by config
  const start = [
    Math.max(0, Math.min(gridSize, lineStart[0] + prng.intRange(-2, 2))),
    Math.max(0, Math.min(gridSize, lineStart[1] + prng.intRange(-2, 2))),
    Math.max(0, Math.min(gridSize, lineStart[2] + prng.intRange(-2, 2))),
  ]
  const end = [
    Math.max(0, Math.min(gridSize, lineEnd[0] + prng.intRange(-2, 2))),
    Math.max(0, Math.min(gridSize, lineEnd[1] + prng.intRange(-2, 2))),
    Math.max(0, Math.min(gridSize, lineEnd[2] + prng.intRange(-2, 2))),
  ]
  // Compute bounding box for position/size representation
  const minPos = [
    Math.min(start[0], end[0]),
    Math.min(start[1], end[1]),
    Math.min(start[2], end[2]),
  ]
  const maxPos = [
    Math.max(start[0], end[0]),
    Math.max(start[1], end[1]),
    Math.max(start[2], end[2]),
  ]
  return {
    type: 'addLine',
    position: minPos,
    size: [
      Math.max(1, maxPos[0] - minPos[0]),
      Math.max(1, maxPos[1] - minPos[1]),
      Math.max(1, maxPos[2] - minPos[2]),
    ],
    lineStart: start,
    lineEnd: end,
    style: neutralStyle(prng, bgOpacity),
  }
}

/**
 * Generates a fill primitive with 3–12 points clamped to [0, gridTileSize].
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {object} bounds - Cluster bounding region
 * @param {number} fillPointCount - Configured number of points (3–12)
 * @param {number} bgOpacity - Background opacity
 * @param {number} gridSize - Grid tile size
 * @returns {object} Fill primitive
 */
function populateFill(prng, bounds, fillPointCount, bgOpacity, gridSize) {
  const pointCount = Math.max(3, Math.min(12, fillPointCount))
  const coords = []
  for (let i = 0; i < pointCount; i++) {
    coords.push([
      Math.max(0, Math.min(gridSize, prng.intRange(bounds.x[0], bounds.x[1]))),
      Math.max(0, Math.min(gridSize, prng.intRange(bounds.y[0], bounds.y[1]))),
      Math.max(0, Math.min(gridSize, prng.intRange(bounds.z[0], bounds.z[1]))),
    ])
  }
  // Compute bounding box for position/size representation
  const minX = Math.min(...coords.map(c => c[0]))
  const minY = Math.min(...coords.map(c => c[1]))
  const minZ = Math.min(...coords.map(c => c[2]))
  const maxX = Math.max(...coords.map(c => c[0]))
  const maxY = Math.max(...coords.map(c => c[1]))
  const maxZ = Math.max(...coords.map(c => c[2]))
  return {
    type: 'addFill',
    position: [minX, minY, minZ],
    size: [
      Math.max(1, maxX - minX),
      Math.max(1, maxY - minY),
      Math.max(1, maxZ - minZ),
    ],
    coords,
    style: neutralStyle(prng, bgOpacity),
  }
}

// ─── Gestalt Principle Helpers ───────────────────────────────

/**
 * Continuity: aligns at least one coordinate along a shared axis across clusters.
 * Picks a random axis and value, then adjusts one primitive per cluster to share it.
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {Array<object>} clusters - Array of cluster objects with primitives
 * @param {number} gridSize - Grid tile size
 * @returns {{axis: string, value: number}} The continuity axis info
 */
function applyContinuity(prng, clusters, gridSize) {
  const axes = ['x', 'y', 'z']
  const axisIndex = prng.intRange(0, 2)
  const axis = axes[axisIndex]
  const sharedValue = prng.intRange(2, Math.max(3, gridSize - 4))

  for (const cluster of clusters) {
    if (cluster.primitives.length > 0) {
      const prim = cluster.primitives[0]
      prim.position[axisIndex] = Math.min(sharedValue, gridSize - prim.size[axisIndex])
      prim.position[axisIndex] = Math.max(0, prim.position[axisIndex])
    }
  }
  return { axis, value: sharedValue }
}

/**
 * Closure: arranges 3–5 addBox calls to imply an enclosing form.
 * Creates an L-shape or U-shape from boxes within the first cluster.
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {object} cluster - The cluster to apply closure to
 * @param {number} surfaceOpacity - Surface opacity for closure primitives
 * @returns {Array<object>} Additional closure primitives
 */
function applyClosure(prng, cluster, surfaceOpacity) {
  const closureCount = prng.intRange(
    GestaltConstraints.CLOSURE_BOX_RANGE[0],
    GestaltConstraints.CLOSURE_BOX_RANGE[1]
  )
  const closurePrims = []
  const baseX = cluster.bounds.x[0]
  const baseY = cluster.bounds.y[0]
  const baseZ = cluster.bounds.z[0]

  // Create an implied enclosing form — L/U shape
  const positions = [
    [baseX, baseY, baseZ],
    [baseX + 3, baseY, baseZ],
    [baseX, baseY + 2, baseZ],
    [baseX + 3, baseY + 2, baseZ],
    [baseX + 1, baseY, baseZ + 2],
  ]

  for (let i = 0; i < closureCount; i++) {
    const pos = positions[i] || positions[0]
    const clampedPos = pos.map((v) => Math.max(0, Math.min(v, 16)))
    closurePrims.push({
      type: 'addBox',
      position: clampedPos,
      size: [prng.intRange(1, 2), prng.intRange(1, 2), prng.intRange(1, 2)],
      style: neutralStyle(prng, surfaceOpacity),
    })
  }
  return closurePrims
}

/**
 * Figure-ground: assigns opacity ranges to clusters.
 * Background clusters get lower opacity, foreground accents get higher.
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {Array<object>} clusters
 * @param {number} surfaceOpacity - The configured surface opacity
 */
function applyFigureGround(prng, clusters, surfaceOpacity) {
  for (const cluster of clusters) {
    // Use the configured surfaceOpacity with slight per-cluster variation
    const bgOpacity = Math.max(
      GestaltConstraints.BACKGROUND_OPACITY_RANGE[0],
      Math.min(
        GestaltConstraints.BACKGROUND_OPACITY_RANGE[1],
        surfaceOpacity + prng.floatRange(-0.02, 0.02)
      )
    )
    cluster.style = { opacity: bgOpacity }
    for (const prim of cluster.primitives) {
      prim.style = neutralStyle(prng, bgOpacity)
    }
  }
}

/**
 * Common fate: stores a directional shift per cluster for regeneration.
 * Each cluster gets a consistent direction vector.
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {Array<object>} clusters
 */
function applyCommonFate(prng, clusters) {
  const directions = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]
  for (const cluster of clusters) {
    cluster.fateDirection = prng.pick(directions)
  }
}

// ─── Rotation Post-Processing ────────────────────────────────

/**
 * Rounds a numeric angle to the nearest valid 90° increment (0, 90, 180, 270).
 * Midpoints round up: 45° → 90°, 135° → 180°, 225° → 270°.
 * @param {number} angle - Any numeric angle value
 * @returns {number} One of 0, 90, 180, 270
 */
export function roundToNearest90(angle) {
  // Normalize to [0, 360) range
  let normalized = ((angle % 360) + 360) % 360
  // Round to nearest 90° increment, midpoints round up
  // Midpoint rounding up means: 45 → 90, 135 → 180, 225 → 270, 315 → 0
  const increment = Math.ceil((normalized - 0.0001) / 90) * 90
  // But we need proper rounding: values closer to lower go down, midpoints go up
  const lower = Math.floor(normalized / 90) * 90
  const upper = lower + 90
  const distToLower = normalized - lower
  const distToUpper = upper - normalized
  let rounded
  if (distToLower < distToUpper) {
    rounded = lower
  } else {
    // Equal distance (midpoint) or closer to upper → round up
    rounded = upper
  }
  // Normalize result to [0, 360) → map 360 to 0
  return rounded % 360
}

/**
 * Applies rotation to primitives' position and size arrays based on axis and angle.
 * This is a pure post-processing step (step 10 in the pipeline).
 *
 * When `config.rotationEnabled` is false (or not provided), returns primitives unchanged.
 * Does NOT consume PRNG values.
 *
 * Rotation permutes and negates position/size components:
 * - Y-axis 90°: swap X and Z components
 * - Y-axis 180°: negate X and Z positions
 * - Y-axis 270°: swap X and Z, negate the new X
 * - X-axis 90°: swap Y and Z
 * - X-axis 180°: negate Y and Z positions
 * - X-axis 270°: swap Y and Z, negate the new Y
 * - Z-axis 90°: swap X and Y
 * - Z-axis 180°: negate X and Y positions
 * - Z-axis 270°: swap X and Y, negate the new X
 *
 * After rotation, positions are clamped so position[i] ∈ [0, gridTileSize - size[i]].
 *
 * @param {Array<object>} primitives - Array of primitive objects with position and size arrays
 * @param {object} config - Configuration object
 * @param {boolean} [config.rotationEnabled=false] - Whether rotation is active
 * @param {string} [config.rotationAxis='Y'] - Rotation axis: 'X', 'Y', or 'Z'
 * @param {number} [config.rotationAmount=0] - Rotation angle (will be rounded to nearest 90°)
 * @param {number} config.gridTileSize - Grid tile size for clamping
 * @returns {Array<object>} The primitives array (mutated in place) with rotated positions/sizes
 */
export function applyRotation(primitives, config) {
  if (!config.rotationEnabled) {
    return primitives
  }

  const axis = config.rotationAxis || 'Y'
  const angle = roundToNearest90(config.rotationAmount || 0)
  const gridSize = config.gridTileSize

  if (angle === 0) {
    return primitives
  }

  for (const prim of primitives) {
    if (!prim.position || !prim.size) continue

    let [px, py, pz] = prim.position
    let [sx, sy, sz] = prim.size

    if (axis === 'Y') {
      if (angle === 90) {
        // Swap X and Z
        const tmpP = px; px = pz; pz = tmpP
        const tmpS = sx; sx = sz; sz = tmpS
      } else if (angle === 180) {
        // Negate X and Z positions
        px = -px
        pz = -pz
      } else if (angle === 270) {
        // Swap X and Z, then negate the new X
        const tmpP = px; px = pz; pz = tmpP
        const tmpS = sx; sx = sz; sz = tmpS
        px = -px
      }
    } else if (axis === 'X') {
      if (angle === 90) {
        // Swap Y and Z
        const tmpP = py; py = pz; pz = tmpP
        const tmpS = sy; sy = sz; sz = tmpS
      } else if (angle === 180) {
        // Negate Y and Z positions
        py = -py
        pz = -pz
      } else if (angle === 270) {
        // Swap Y and Z, then negate the new Y
        const tmpP = py; py = pz; pz = tmpP
        const tmpS = sy; sy = sz; sz = tmpS
        py = -py
      }
    } else if (axis === 'Z') {
      if (angle === 90) {
        // Swap X and Y
        const tmpP = px; px = py; py = tmpP
        const tmpS = sx; sx = sy; sy = tmpS
      } else if (angle === 180) {
        // Negate X and Y positions
        px = -px
        py = -py
      } else if (angle === 270) {
        // Swap X and Y, then negate the new X
        const tmpP = px; px = py; py = tmpP
        const tmpS = sx; sx = sy; sy = tmpS
        px = -px
      }
    }

    // Clamp positions: position[i] ∈ [0, gridTileSize - size[i]]
    prim.position = [
      Math.max(0, Math.min(px, gridSize - sx)),
      Math.max(0, Math.min(py, gridSize - sy)),
      Math.max(0, Math.min(pz, gridSize - sz)),
    ]
    prim.size = [sx, sy, sz]
  }

  return primitives
}

// ─── Heerich Execution ───────────────────────────────────────

/**
 * Executes all Heerich API calls from a CompositionPlan.
 * @param {object} heerich - Heerich instance
 * @param {object} plan - CompositionPlan
 */
function executeHeerichCalls(heerich, plan) {
  // Render cluster primitives
  for (const cluster of plan.clusters) {
    for (const prim of cluster.primitives) {
      callHeerich(heerich, prim)
    }
  }

  // Render boolean subtractions
  for (const op of plan.booleanOps) {
    callHeerich(heerich, op)
  }

  // Render accent primitives
  for (const accent of plan.accentPrimitives) {
    callHeerich(heerich, accent)
  }
}

/**
 * Calls the appropriate Heerich method for a primitive.
 * Dispatches to the correct Heerich API based on primitive type:
 * - Box: applyGeometry({ type: 'box', position, size, style, mode })
 * - Sphere: applyGeometry({ type: 'sphere', center: [x,y,z], radius: r, style })
 * - Line: applyGeometry({ type: 'line', from: [x,y,z], to: [x,y,z], radius: r, shape: 'rounded', style })
 * - Fill: applyGeometry({ type: 'fill', bounds: [[x1,y1,z1], [x2,y2,z2]], test: fn, style })
 * @param {object} heerich - Heerich instance
 * @param {object} prim - Primitive object with position [x,y,z] and size [w,h,d]
 */
function callHeerich(heerich, prim) {
  if (!prim.position || !prim.size) {
    console.warn('Skipping primitive with missing position/size:', prim)
    return
  }

  if (prim.type === 'addSphere') {
    const params = {
      type: 'sphere',
      center: [
        prim.position[0] + prim.radius,
        prim.position[1] + prim.radius,
        prim.position[2] + prim.radius,
      ],
      radius: prim.radius,
    }
    if (prim.style) params.style = prim.style
    if (prim.gap != null) params.gap = prim.gap
    heerich.applyGeometry(params)
    return
  }

  if (prim.type === 'addLine') {
    const params = {
      type: 'line',
      from: prim.lineStart,
      to: prim.lineEnd,
      radius: 1,
      shape: 'rounded',
    }
    if (prim.style) params.style = prim.style
    if (prim.gap != null) params.gap = prim.gap
    heerich.applyGeometry(params)
    return
  }

  if (prim.type === 'addFill') {
    const bounds = [
      prim.position,
      [
        prim.position[0] + prim.size[0],
        prim.position[1] + prim.size[1],
        prim.position[2] + prim.size[2],
      ],
    ]
    const coords = prim.coords
    const params = {
      type: 'fill',
      bounds,
      test: (x, y, z) => {
        // Point-in-polygon test using the fill coords
        return coords.some(
          (c) => Math.abs(x - c[0]) <= 1 && Math.abs(y - c[1]) <= 1 && Math.abs(z - c[2]) <= 1
        )
      },
    }
    if (prim.style) params.style = prim.style
    if (prim.gap != null) params.gap = prim.gap
    heerich.applyGeometry(params)
    return
  }

  // Default: box types (addBox, removeBox)
  const params = {
    type: 'box',
    position: prim.position,
    size: prim.size,
  }

  if (prim.style) {
    params.style = prim.style
  }

  // Determine mode from booleanMode property
  if (prim.booleanMode && prim.booleanMode !== 'union') {
    params.mode = prim.booleanMode
  }
  // Legacy support: removeBox type implies subtract mode
  else if (prim.type === 'removeBox' && !prim.booleanMode) {
    params.mode = 'subtract'
  }

  if (prim.gap != null) {
    params.gap = prim.gap
  }

  heerich.applyGeometry(params)
}

// ─── CompositionEngine ───────────────────────────────────────

/** Valid boolean mode strings */
const VALID_BOOLEAN_MODES = ['union', 'subtract', 'intersect', 'exclude']

export { VALID_BOOLEAN_MODES }

/**
 * @typedef {Object} CompositionConfig
 * @property {number} clusterCount - Number of clusters (2–4)
 * @property {number} primitiveCount - Total primitives (8–20)
 * @property {number} accentOpacity - Accent opacity (0.10–0.25)
 * @property {number} surfaceOpacity - Surface opacity (0.05–0.15)
 * @property {boolean} booleanSubtraction - Whether to apply boolean subtraction
 * @property {number} cameraAngle - Camera angle (0–360)
 * @property {number} gridTileSize - Grid tile size (8–32)
 * @property {string} accentColor - Hex color string for accent
 * @property {string} [booleanMode='subtract'] - Boolean operation mode: 'union'|'subtract'|'intersect'|'exclude'
 * @property {boolean} [spheresEnabled=false] - Whether sphere primitives are available
 * @property {number} [sphereRadius=8] - Sphere radius (1–16)
 * @property {boolean} [linesEnabled=false] - Whether line primitives are available
 * @property {number[]} [lineStart=[0,0,0]] - Line start coordinates
 * @property {number[]} [lineEnd=[gridTileSize,gridTileSize,gridTileSize]] - Line end coordinates
 * @property {boolean} [fillsEnabled=false] - Whether fill primitives are available
 * @property {number} [fillPointCount=6] - Fill point count (3–12)
 */

/**
 * @typedef {Object} CompositionPlan
 * @property {Array<object>} clusters
 * @property {Array<object>} booleanOps
 * @property {Array<object>} accentPrimitives
 * @property {{axis: string, value: number}} continuityAxis
 * @property {number} totalCalls
 * @property {number} clusterCount
 * @property {number} primitiveCount
 * @property {boolean} booleanSubtraction
 */

export const CompositionEngine = {
  /**
   * Generates a Gestalt-principled voxel composition.
   *
   * @param {import('./SeededPRNG.js').SeededPRNG} prng - Seeded PRNG instance
   * @param {object} heerich - Heerich instance (injected for testability)
   * @param {CompositionConfig} config - Parameterized composition configuration
   * @returns {{ plan: CompositionPlan, svgString: string }}
   */
  generate(prng, heerich, config) {
    const {
      clusterCount,
      primitiveCount,
      accentOpacity,
      surfaceOpacity,
      booleanSubtraction,
      accentColor,
      gridTileSize,
      booleanMode: rawBooleanMode,
    } = config

    // Validate booleanMode — fall back to union with console.warn for invalid values
    let booleanMode = rawBooleanMode || 'subtract'
    if (!VALID_BOOLEAN_MODES.includes(booleanMode)) {
      console.warn(`Invalid booleanMode "${booleanMode}" — falling back to "union"`)
      booleanMode = 'union'
    }

    // 1. Build the additive types pool based on config flags
    // When all shape flags are disabled (or not provided), only 'addBox' is available
    // This preserves pre-expansion behavior exactly
    const availableTypes = [...BASE_ADDITIVE_TYPES]
    if (config.spheresEnabled) availableTypes.push('addSphere')
    if (config.linesEnabled) availableTypes.push('addLine')
    if (config.fillsEnabled) availableTypes.push('addFill')

    // Choose distinct additive primitive types (Hick's Law)
    const typeCount = Math.min(
      prng.intRange(
        GestaltConstraints.DISTINCT_TYPES_RANGE[0],
        GestaltConstraints.DISTINCT_TYPES_RANGE[1]
      ),
      availableTypes.length
    )
    const shuffledTypes = prng.shuffle(availableTypes)
    const allowedTypes = shuffledTypes.slice(0, typeCount)

    // 2. Generate bounding regions for each cluster
    const clusterBounds = generateClusterBounds(prng, clusterCount, gridTileSize)

    // 3. Budget total calls: reserve for boolean + accents
    const accentCount = prng.intRange(
      GestaltConstraints.ACCENT_COUNT_RANGE[0],
      GestaltConstraints.ACCENT_COUNT_RANGE[1]
    )
    const booleanCount = booleanSubtraction ? 1 : 0
    const reservedCalls = accentCount + booleanCount
    const maxClusterCalls = Math.min(
      primitiveCount,
      GestaltConstraints.MAX_TOTAL_CALLS - reservedCalls
    )
    const primsPerCluster = Math.max(1, Math.floor(maxClusterCalls / clusterCount))

    // 4. Build clusters
    const clusters = []
    let totalCalls = 0

    for (let i = 0; i < clusterCount; i++) {
      const bounds = clusterBounds[i]
      const dominantType = prng.pick(allowedTypes)
      const bgOpacity = Math.max(
        GestaltConstraints.BACKGROUND_OPACITY_RANGE[0],
        Math.min(GestaltConstraints.BACKGROUND_OPACITY_RANGE[1], surfaceOpacity)
      )

      // Limit primitives to stay within budget
      const primCount = Math.min(
        primsPerCluster,
        GestaltConstraints.MAX_TOTAL_CALLS - totalCalls - reservedCalls
      )
      if (primCount <= 0) break

      const primitives = populateCluster(
        prng,
        bounds,
        dominantType,
        allowedTypes,
        primCount,
        bgOpacity,
        gridTileSize,
        {
          sphereRadius: config.sphereRadius,
          lineStart: config.lineStart,
          lineEnd: config.lineEnd,
          fillPointCount: config.fillPointCount,
        }
      )

      const cluster = {
        id: i,
        bounds,
        dominantType,
        primitives,
        style: { opacity: bgOpacity },
        fateDirection: null,
      }
      clusters.push(cluster)
      totalCalls += primitives.length
    }

    // 5. Apply closure to the first cluster (3–5 boxes implying enclosing form)
    if (clusters.length > 0) {
      const closurePrims = applyClosure(prng, clusters[0], surfaceOpacity)
      const closureBudget = Math.min(
        closurePrims.length,
        GestaltConstraints.MAX_TOTAL_CALLS - totalCalls - reservedCalls
      )
      const addedClosure = closurePrims.slice(0, closureBudget)
      clusters[0].primitives.push(...addedClosure)
      totalCalls += addedClosure.length
    }

    // 6. Apply figure-ground opacity
    applyFigureGround(prng, clusters, surfaceOpacity)

    // 7. Apply continuity axis alignment
    const continuityAxis = applyContinuity(prng, clusters, gridTileSize)

    // 8. Apply common fate (directional shifts for regeneration)
    applyCommonFate(prng, clusters)

    // 9. Boolean subtraction
    const booleanOps = []
    if (booleanSubtraction && clusters.length > 0) {
      const targetCluster = prng.pick(clusters)
      const subType = prng.pick(SUBTRACTIVE_TYPES)
      const subPos = [
        prng.intRange(
          targetCluster.bounds.x[0],
          Math.max(targetCluster.bounds.x[0], targetCluster.bounds.x[1] - 2)
        ),
        prng.intRange(
          targetCluster.bounds.y[0],
          Math.max(targetCluster.bounds.y[0], targetCluster.bounds.y[1] - 2)
        ),
        prng.intRange(
          targetCluster.bounds.z[0],
          Math.max(targetCluster.bounds.z[0], targetCluster.bounds.z[1] - 2)
        ),
      ].map((v) => Math.max(0, Math.min(v, gridTileSize - 2)))
      const subSize = [prng.intRange(1, 2), prng.intRange(1, 3), prng.intRange(1, 2)]

      booleanOps.push({
        type: subType,
        position: subPos,
        size: subSize,
        style: null,
        booleanMode,
      })
      totalCalls += 1
    }

    // 10. Accent primitives — Von Restorff accents
    const accentPrimitives = []
    for (let i = 0; i < accentCount && totalCalls < GestaltConstraints.MAX_TOTAL_CALLS; i++) {
      const fgOpacity = Math.max(
        GestaltConstraints.FOREGROUND_OPACITY_RANGE[0],
        Math.min(GestaltConstraints.FOREGROUND_OPACITY_RANGE[1], accentOpacity)
      )
      const accentPos = [
        prng.intRange(1, Math.max(2, gridTileSize - 3)),
        prng.intRange(2, Math.max(3, gridTileSize - 6)),
        prng.intRange(1, Math.max(2, gridTileSize - 3)),
      ]
      const accentSize = [prng.intRange(1, 3), prng.intRange(1, 3), prng.intRange(1, 3)]
      const accentType = prng.pick(allowedTypes)

      // Build accent primitive with shape-specific properties
      const accentPrim = {
        type: accentType,
        position: accentPos,
        size: accentSize,
        style: accentStyle(accentColor, fgOpacity),
        accentColor,
      }

      // Add shape-specific properties for new types
      if (accentType === 'addSphere') {
        const radius = Math.max(1, Math.min(16, config.sphereRadius || 8))
        accentPrim.radius = radius
        accentPrim.size = [radius * 2, radius * 2, radius * 2]
      } else if (accentType === 'addLine') {
        const lineStart = config.lineStart || [0, 0, 0]
        const lineEnd = config.lineEnd || [gridTileSize, gridTileSize, gridTileSize]
        accentPrim.lineStart = [
          Math.max(0, Math.min(gridTileSize, lineStart[0] + prng.intRange(-2, 2))),
          Math.max(0, Math.min(gridTileSize, lineStart[1] + prng.intRange(-2, 2))),
          Math.max(0, Math.min(gridTileSize, lineStart[2] + prng.intRange(-2, 2))),
        ]
        accentPrim.lineEnd = [
          Math.max(0, Math.min(gridTileSize, lineEnd[0] + prng.intRange(-2, 2))),
          Math.max(0, Math.min(gridTileSize, lineEnd[1] + prng.intRange(-2, 2))),
          Math.max(0, Math.min(gridTileSize, lineEnd[2] + prng.intRange(-2, 2))),
        ]
      } else if (accentType === 'addFill') {
        const pointCount = Math.max(3, Math.min(12, config.fillPointCount || 6))
        const coords = []
        for (let j = 0; j < pointCount; j++) {
          coords.push([
            Math.max(0, Math.min(gridTileSize, prng.intRange(0, gridTileSize))),
            Math.max(0, Math.min(gridTileSize, prng.intRange(0, gridTileSize))),
            Math.max(0, Math.min(gridTileSize, prng.intRange(0, gridTileSize))),
          ])
        }
        accentPrim.coords = coords
      }

      accentPrimitives.push(accentPrim)
      totalCalls += 1
    }

    // 11. Enforce perceptual group limit (clusters + accent elements ≤ 5)
    const totalGroups = clusters.length + accentPrimitives.length
    if (totalGroups > GestaltConstraints.MAX_PERCEPTUAL_GROUPS) {
      const excessAccents = totalGroups - GestaltConstraints.MAX_PERCEPTUAL_GROUPS
      accentPrimitives.splice(accentPrimitives.length - excessAccents, excessAccents)
      totalCalls -= excessAccents
    }

    // Build the composition plan
    const plan = {
      clusters,
      booleanOps,
      accentPrimitives,
      continuityAxis,
      totalCalls,
      clusterCount: clusters.length,
      primitiveCount: totalCalls,
      booleanSubtraction,
      booleanMode,
    }

    // 12. Execute all Heerich API calls
    executeHeerichCalls(heerich, plan)

    // 13. Get SVG output from Heerich
    const svgString = heerich.toSVG({ padding: 40 })

    return { plan, svgString }
  },
}
