/**
 * SettingsPanel — Custom control panel matching the Heerich demo aesthetic.
 * Replaces DialKit with native React controls styled to match the dark panel UI.
 *
 * Controls: Camera (type, angle, distance) + Style (fill, stroke, width, gap, outline)
 */

import { useState } from 'react'

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sp-section">
      <button className="sp-section__header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="sp-section__chevron">{open ? '⇅' : '⇅'}</span>
      </button>
      {open && <div className="sp-section__body">{children}</div>}
    </div>
  )
}

function SliderControl({ label, value, min, max, step, onChange }) {
  return (
    <div className="sp-control">
      <label className="sp-control__label">{label}</label>
      <div className="sp-control__row">
        <input
          type="range"
          className="sp-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="sp-control__value">{value}</span>
      </div>
    </div>
  )
}

function ColorControl({ label, value, onChange }) {
  return (
    <div className="sp-control">
      <label className="sp-control__label">{label}</label>
      <div className="sp-control__row">
        <input
          type="color"
          className="sp-color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="sp-control__value sp-control__value--color">{value}</span>
      </div>
    </div>
  )
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <div className="sp-control">
      <label className="sp-control__label">{label}</label>
      <select
        className="sp-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

export function SettingsPanel({ params, onChange }) {
  const update = (key, value) => {
    onChange({ ...params, [key]: value })
  }

  return (
    <aside className="sp-panel">
      <div className="sp-panel__title">SETTINGS</div>

      <Section title="CAMERA">
        <SelectControl
          label="Type"
          value={params.cameraType || 'oblique'}
          options={['oblique', 'perspective', 'orthographic', 'isometric']}
          onChange={(v) => update('cameraType', v)}
        />
        <SliderControl
          label="Angle"
          value={params.cameraAngle}
          min={0} max={360} step={1}
          onChange={(v) => update('cameraAngle', v)}
        />
        <SliderControl
          label="Distance"
          value={params.cameraDistance}
          min={1} max={80} step={1}
          onChange={(v) => update('cameraDistance', v)}
        />
      </Section>

      <Section title="STYLE">
        <ColorControl
          label="Fill"
          value={params.fillColor}
          onChange={(v) => update('fillColor', v)}
        />
        <ColorControl
          label="Stroke"
          value={params.strokeColor}
          onChange={(v) => update('strokeColor', v)}
        />
        <SliderControl
          label="Width"
          value={params.strokeWidth}
          min={0} max={3} step={0.1}
          onChange={(v) => update('strokeWidth', v)}
        />
        <SliderControl
          label="Gap"
          value={params.gap}
          min={0} max={0.2} step={0.01}
          onChange={(v) => update('gap', v)}
        />
        <SliderControl
          label="Outline"
          value={params.outlineWidth || 0}
          min={0} max={5} step={0.5}
          onChange={(v) => update('outlineWidth', v)}
        />
        <ColorControl
          label="O-Color"
          value={params.outlineColor || '#000000'}
          onChange={(v) => update('outlineColor', v)}
        />
      </Section>
      <Section title="COMPOSITION">
        <SliderControl
          label="Primitives"
          value={params.primitiveCount}
          min={8} max={30} step={1}
          onChange={(v) => update('primitiveCount', v)}
        />
        <SliderControl
          label="Clusters"
          value={params.clusterCount}
          min={2} max={4} step={1}
          onChange={(v) => update('clusterCount', v)}
        />
        <SliderControl
          label="Surface Opacity"
          value={params.surfaceOpacity}
          min={0.05} max={0.6} step={0.05}
          onChange={(v) => update('surfaceOpacity', v)}
        />
        <SliderControl
          label="Accent Opacity"
          value={params.accentOpacity}
          min={0.1} max={0.8} step={0.05}
          onChange={(v) => update('accentOpacity', v)}
        />
        <ColorControl
          label="Accent"
          value={params.accentColor}
          onChange={(v) => update('accentColor', v)}
        />
        <SliderControl
          label="Grid Size"
          value={params.gridTileSize}
          min={12} max={40} step={1}
          onChange={(v) => update('gridTileSize', v)}
        />
      </Section>
    </aside>
  )
}
