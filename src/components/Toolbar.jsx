/**
 * Toolbar component — displays dimension label and export buttons.
 * Sits below the canvas viewport.
 *
 * Validates: Requirements 10.4, 5.1, 6.1
 */

/**
 * @param {Object} props
 * @param {number} props.width - Current canvas width in pixels
 * @param {number} props.height - Current canvas height in pixels
 * @param {() => void} props.onExportPng - Callback to trigger PNG export
 * @param {() => void} props.onExportGif - Callback to trigger GIF export
 * @param {boolean} [props.isExporting] - Whether an export is in progress (disables buttons)
 */
export function Toolbar({ width, height, onExportPng, onExportGif, isExporting = false }) {
  return (
    <div className="toolbar" style={styles.container}>
      <span className="toolbar-dimensions" style={styles.dimensions}>
        {width} × {height} px
      </span>
      <div style={styles.actions}>
        <button
          className="toolbar-export-png"
          style={styles.button}
          onClick={onExportPng}
          disabled={isExporting}
        >
          Export PNG
        </button>
        <button
          className="toolbar-export-gif"
          style={styles.button}
          onClick={onExportGif}
          disabled={isExporting}
        >
          Export GIF
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-3) var(--space-4)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-body-sm)',
    borderTop: '1px solid var(--color-border)',
  },
  dimensions: {
    color: 'var(--color-secondary)',
    fontVariantNumeric: 'tabular-nums',
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  button: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-body-sm)',
    fontWeight: 'var(--font-weight-bold)',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--rounded-base)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-elevated)',
    color: 'var(--color-primary)',
    cursor: 'pointer',
  },
}
