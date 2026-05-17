/**
 * GestaltConstraints — Frozen constants encoding Gestalt principles and Laws of UX bounds.
 * Defines the composition rules for cluster-based voxel generation.
 * Frozen to prevent accidental mutation at runtime.
 */

export const GestaltConstraints = Object.freeze({
  /** Proximity: intra-cluster spacing ≤ 30% of inter-cluster spacing */
  INTRA_CLUSTER_MAX_RATIO: 0.3,

  /** Similarity: ≥60% of primitives in a cluster share the same type */
  DOMINANT_TYPE_MIN_RATIO: 0.6,

  /** Closure: 3–5 boxes implying an enclosing form */
  CLOSURE_BOX_RANGE: Object.freeze([3, 5]),

  /** Figure-ground: background cluster fill opacity range (5–60%) */
  BACKGROUND_OPACITY_RANGE: Object.freeze([0.05, 0.60]),

  /** Figure-ground: foreground accent fill opacity range (10–80%) */
  FOREGROUND_OPACITY_RANGE: Object.freeze([0.10, 0.80]),

  /** Primitive count bounds per composition */
  PRIMITIVE_COUNT_RANGE: Object.freeze([8, 30]),

  /** Max total Heerich API calls per composition */
  MAX_TOTAL_CALLS: 50,

  /** Hick's Law: distinct additive primitive types per composition */
  DISTINCT_TYPES_RANGE: Object.freeze([2, 3]),

  /** Miller's Law: max perceptual groups (clusters + accent elements) */
  MAX_PERCEPTUAL_GROUPS: 5,

  /** Von Restorff: accent-colored primitive count */
  ACCENT_COUNT_RANGE: Object.freeze([1, 2]),
})
