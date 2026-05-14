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

/** Additive primitive types available for clusters */
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
  const zoneWidth = Math.floor((gridSize - 2) / count)

  for (let i = 0; i < count; i++) {
    const xMin = Math.min(i * zoneWidth + prng.intRange(0, 1), gridSize - 4)
    const xMax = Math.min(xMin + prng.intRange(4, Math.max(5, zoneWidth)), gridSize)
    const zMin = prng.intRange(0, 4)
    const zMax = Math.min(zMin + prng.intRange(4, 8), gridSize)
    const yMin = prng.intRange(0, 2)
    const yMax = Math.min(yMin + prng.intRange(4, 10), gridSize)

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
 * @param {import('./SeededPRNG.js').SeededPRNG} prng
 * @param {object} bounds - Cluster bounding region
 * @param {string} dominantType - The dominant additive type for this cluster
 * @param {string[]} allowedTypes - The additive types chosen for this composition
 * @param {number} primCount - Number of primitives to generate
 * @param {number} bgOpacity - Background opacity for this cluster
 * @param {number} gridSize - Grid tile size
 * @returns {Array<object>} Array of primitive objects
 */
function populateCluster(prng, bounds, dominantType, allowedTypes, primCount, bgOpacity, gridSize) {
  const primitives = []
  const dominantCount = Math.ceil(primCount * GestaltConstraints.DOMINANT_TYPE_MIN_RATIO)
  const otherTypes = allowedTypes.filter((t) => t !== dominantType)

  for (let i = 0; i < primCount; i++) {
    const type =
      i < dominantCount
        ? dominantType
        : prng.pick(otherTypes.length > 0 ? otherTypes : [dominantType])
    const pos = [
      prng.intRange(bounds.x[0], bounds.x[1]),
      prng.intRange(bounds.y[0], bounds.y[1]),
      prng.intRange(bounds.z[0], bounds.z[1]),
    ]
    const size = [
      prng.intRange(2, Math.max(3, bounds.x[1] - bounds.x[0])),
      prng.intRange(2, Math.max(3, bounds.y[1] - bounds.y[0])),
      prng.intRange(2, Math.max(3, bounds.z[1] - bounds.z[0])),
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
 * @param {object} heerich - Heerich instance
 * @param {object} prim - Primitive object
 */
function callHeerich(heerich, prim) {
  const params = {
    type: prim.type === 'addBox' ? 'box' : prim.type === 'removeBox' ? 'box' : prim.type,
    position: prim.position,
    size: prim.size,
  }

  if (prim.style) {
    params.style = prim.style
  }

  if (prim.type === 'removeBox') {
    params.mode = 'subtract'
  }

  heerich.applyGeometry(params)
}

// ─── CompositionEngine ───────────────────────────────────────

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
    } = config

    // 1. Choose distinct additive primitive types (Hick's Law)
    const typeCount = Math.min(
      prng.intRange(
        GestaltConstraints.DISTINCT_TYPES_RANGE[0],
        GestaltConstraints.DISTINCT_TYPES_RANGE[1]
      ),
      ADDITIVE_TYPES.length
    )
    const shuffledTypes = prng.shuffle(ADDITIVE_TYPES)
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
        gridTileSize
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
        booleanMode: 'subtract',
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

      accentPrimitives.push({
        type: prng.pick(allowedTypes),
        position: accentPos,
        size: accentSize,
        style: accentStyle(accentColor, fgOpacity),
        accentColor,
      })
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
    }

    // 12. Execute all Heerich API calls
    executeHeerichCalls(heerich, plan)

    // 13. Get SVG output from Heerich
    const svgString = heerich.toSVG({ padding: 40 })

    return { plan, svgString }
  },
}
