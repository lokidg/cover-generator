/**
 * ProgressOverlay Component
 *
 * Displays a "Frame {n}/{total}" indicator during GIF generation.
 * Renders nothing when not visible.
 */

import React from 'react'

/**
 * @param {object} props
 * @param {number} props.current - Current frame number (1-based)
 * @param {number} props.total - Total number of frames
 * @param {boolean} props.visible - Whether the overlay is shown
 */
export function ProgressOverlay({ current, total, visible }) {
  if (!visible) return null

  return (
    <div className="progress-overlay">
      Frame {current}/{total}
    </div>
  )
}
