import { describe, it, expect } from 'vitest'
import React from 'react'
import { ProgressOverlay } from '../ProgressOverlay.jsx'

describe('ProgressOverlay', () => {
  it('returns null when not visible', () => {
    const result = ProgressOverlay({ current: 1, total: 10, visible: false })
    expect(result).toBeNull()
  })

  it('renders frame progress when visible', () => {
    const result = ProgressOverlay({ current: 3, total: 10, visible: true })
    expect(result).not.toBeNull()
    expect(result.type).toBe('div')
    expect(result.props.className).toBe('progress-overlay')
    expect(result.props.children).toEqual(['Frame ', 3, '/', 10])
  })

  it('renders first frame correctly', () => {
    const result = ProgressOverlay({ current: 1, total: 5, visible: true })
    expect(result.props.children).toEqual(['Frame ', 1, '/', 5])
  })

  it('renders last frame correctly', () => {
    const result = ProgressOverlay({ current: 30, total: 30, visible: true })
    expect(result.props.children).toEqual(['Frame ', 30, '/', 30])
  })

  it('renders with minimum frame count', () => {
    const result = ProgressOverlay({ current: 1, total: 2, visible: true })
    expect(result.props.children).toEqual(['Frame ', 1, '/', 2])
  })
})
