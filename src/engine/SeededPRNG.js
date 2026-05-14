/**
 * SeededPRNG — Mulberry32 seeded pseudo-random number generator
 * Fast, well-distributed 32-bit PRNG for deterministic composition generation.
 * Given the same seed, produces identical sequences every time.
 */

export class SeededPRNG {
  /**
   * @param {number} [seed] - Numeric seed. Defaults to Date.now()
   */
  constructor(seed) {
    this._state = (seed != null ? seed : Date.now()) | 0
  }

  /** Returns a float in [0, 1) */
  next() {
    let t = (this._state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Returns an integer in [min, max] inclusive */
  intRange(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /** Returns a float in [min, max) */
  floatRange(min, max) {
    return this.next() * (max - min) + min
  }

  /** Picks a random element from the array */
  pick(array) {
    return array[this.intRange(0, array.length - 1)]
  }

  /** Returns a new shuffled copy of the array (Fisher-Yates) */
  shuffle(array) {
    const result = array.slice()
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.intRange(0, i)
      const tmp = result[i]
      result[i] = result[j]
      result[j] = tmp
    }
    return result
  }
}
