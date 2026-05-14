/**
 * Unit tests for Text Overlay rendering
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderTextOverlay, truncateText } from '../textOverlay.js'

/**
 * Creates a mock canvas 2D context with spies on all relevant methods.
 */
function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text) => ({ width: text.length * 10 })),
    globalAlpha: 1,
    textAlign: 'start',
    fillStyle: '#000000',
    font: '',
  }
}

describe('textOverlay - renderTextOverlay()', () => {
  let ctx

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('does nothing when both name and title are empty', () => {
    renderTextOverlay(ctx, {
      name: '',
      title: '',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FFFFFF',
      textOpacity: 1,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.save).not.toHaveBeenCalled()
    expect(ctx.restore).not.toHaveBeenCalled()
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('renders only name when title is empty', () => {
    renderTextOverlay(ctx, {
      name: 'John Doe',
      title: '',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FFFFFF',
      textOpacity: 1,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.fillText).toHaveBeenCalledTimes(1)
    // Name renders at baseY without offset (no title to make room for)
    expect(ctx.fillText).toHaveBeenCalledWith('John Doe', 750, 460)
  })

  it('renders only title when name is empty', () => {
    renderTextOverlay(ctx, {
      name: '',
      title: 'Software Engineer',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FFFFFF',
      textOpacity: 1,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.fillText).toHaveBeenCalledTimes(1)
    expect(ctx.fillText).toHaveBeenCalledWith('Software Engineer', 750, 460)
  })

  it('renders both name and title when both are provided', () => {
    renderTextOverlay(ctx, {
      name: 'John Doe',
      title: 'Software Engineer',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FFFFFF',
      textOpacity: 1,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.fillText).toHaveBeenCalledTimes(2)
    // Name is offset upward by titleFontSize + 8 = 26
    expect(ctx.fillText).toHaveBeenCalledWith('John Doe', 750, 434)
    // Title at baseY
    expect(ctx.fillText).toHaveBeenCalledWith('Software Engineer', 750, 460)
  })

  it('uses Outfit 700 font for name', () => {
    renderTextOverlay(ctx, {
      name: 'Jane',
      title: '',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FFFFFF',
      textOpacity: 1,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.font).toBe('700 32px Outfit')
  })

  it('uses Inter 400 font for title', () => {
    renderTextOverlay(ctx, {
      name: '',
      title: 'Engineer',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FFFFFF',
      textOpacity: 1,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.font).toBe('400 18px Inter')
  })

  it('sets globalAlpha to textOpacity', () => {
    renderTextOverlay(ctx, {
      name: 'Test',
      title: '',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FFFFFF',
      textOpacity: 0.75,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.globalAlpha).toBe(0.75)
  })

  it('sets fillStyle to textColor', () => {
    renderTextOverlay(ctx, {
      name: 'Test',
      title: '',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FF0000',
      textOpacity: 1,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.fillStyle).toBe('#FF0000')
  })

  it('calls save and restore to isolate state', () => {
    renderTextOverlay(ctx, {
      name: 'Test',
      title: '',
      fontSize: 32,
      titleFontSize: 18,
      textColor: '#FFFFFF',
      textOpacity: 1,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
      canvasWidth: 1500,
      canvasHeight: 500,
    })

    expect(ctx.save).toHaveBeenCalledTimes(1)
    expect(ctx.restore).toHaveBeenCalledTimes(1)
  })

  describe('horizontal alignment', () => {
    it('positions text at x=40 for left alignment', () => {
      renderTextOverlay(ctx, {
        name: 'Left',
        title: '',
        fontSize: 32,
        titleFontSize: 18,
        textColor: '#FFFFFF',
        textOpacity: 1,
        horizontalAlign: 'left',
        verticalAlign: 'bottom',
        canvasWidth: 1500,
        canvasHeight: 500,
      })

      expect(ctx.textAlign).toBe('left')
      expect(ctx.fillText).toHaveBeenCalledWith('Left', 40, 460)
    })

    it('positions text at canvasWidth-40 for right alignment', () => {
      renderTextOverlay(ctx, {
        name: 'Right',
        title: '',
        fontSize: 32,
        titleFontSize: 18,
        textColor: '#FFFFFF',
        textOpacity: 1,
        horizontalAlign: 'right',
        verticalAlign: 'bottom',
        canvasWidth: 1500,
        canvasHeight: 500,
      })

      expect(ctx.textAlign).toBe('right')
      expect(ctx.fillText).toHaveBeenCalledWith('Right', 1460, 460)
    })

    it('positions text at canvasWidth/2 for center alignment', () => {
      renderTextOverlay(ctx, {
        name: 'Center',
        title: '',
        fontSize: 32,
        titleFontSize: 18,
        textColor: '#FFFFFF',
        textOpacity: 1,
        horizontalAlign: 'center',
        verticalAlign: 'bottom',
        canvasWidth: 1500,
        canvasHeight: 500,
      })

      expect(ctx.textAlign).toBe('center')
      expect(ctx.fillText).toHaveBeenCalledWith('Center', 750, 460)
    })
  })

  describe('vertical alignment', () => {
    it('positions baseY at 60 for top alignment', () => {
      renderTextOverlay(ctx, {
        name: 'Top',
        title: '',
        fontSize: 32,
        titleFontSize: 18,
        textColor: '#FFFFFF',
        textOpacity: 1,
        horizontalAlign: 'center',
        verticalAlign: 'top',
        canvasWidth: 1500,
        canvasHeight: 500,
      })

      expect(ctx.fillText).toHaveBeenCalledWith('Top', 750, 60)
    })

    it('positions baseY at canvasHeight-40 for bottom alignment', () => {
      renderTextOverlay(ctx, {
        name: 'Bottom',
        title: '',
        fontSize: 32,
        titleFontSize: 18,
        textColor: '#FFFFFF',
        textOpacity: 1,
        horizontalAlign: 'center',
        verticalAlign: 'bottom',
        canvasWidth: 1500,
        canvasHeight: 500,
      })

      expect(ctx.fillText).toHaveBeenCalledWith('Bottom', 750, 460)
    })

    it('positions baseY at canvasHeight/2 for center alignment', () => {
      renderTextOverlay(ctx, {
        name: 'Middle',
        title: '',
        fontSize: 32,
        titleFontSize: 18,
        textColor: '#FFFFFF',
        textOpacity: 1,
        horizontalAlign: 'center',
        verticalAlign: 'center',
        canvasWidth: 1500,
        canvasHeight: 500,
      })

      expect(ctx.fillText).toHaveBeenCalledWith('Middle', 750, 250)
    })
  })

  describe('text truncation', () => {
    it('truncates name with ellipsis when it exceeds maxWidth', () => {
      // Mock measureText to simulate a very long text
      // canvasWidth=200, maxWidth=120 (200-80)
      // Each char = 10px, so "LongName12" = 100px fits, "LongName123" = 110px fits, etc.
      ctx.measureText = vi.fn((text) => ({ width: text.length * 10 }))

      renderTextOverlay(ctx, {
        name: 'A'.repeat(20), // 200px > 120px maxWidth
        title: '',
        fontSize: 32,
        titleFontSize: 18,
        textColor: '#FFFFFF',
        textOpacity: 1,
        horizontalAlign: 'center',
        verticalAlign: 'bottom',
        canvasWidth: 200,
        canvasHeight: 500,
      })

      // Should be truncated — the fillText call should have a truncated string with "…"
      const renderedText = ctx.fillText.mock.calls[0][0]
      expect(renderedText).toContain('…')
      expect(renderedText.length).toBeLessThan(20)
    })

    it('does not truncate text that fits within maxWidth', () => {
      ctx.measureText = vi.fn((text) => ({ width: text.length * 10 }))

      renderTextOverlay(ctx, {
        name: 'Short', // 50px < 1420px maxWidth
        title: '',
        fontSize: 32,
        titleFontSize: 18,
        textColor: '#FFFFFF',
        textOpacity: 1,
        horizontalAlign: 'center',
        verticalAlign: 'bottom',
        canvasWidth: 1500,
        canvasHeight: 500,
      })

      expect(ctx.fillText).toHaveBeenCalledWith('Short', 750, 460)
    })
  })
})

describe('textOverlay - truncateText()', () => {
  let ctx

  beforeEach(() => {
    ctx = createMockCtx()
    // Default: each character is 10px wide
    ctx.measureText = vi.fn((text) => ({ width: text.length * 10 }))
  })

  it('returns original text when it fits within maxWidth', () => {
    const result = truncateText(ctx, 'Hello', 100)
    expect(result).toBe('Hello')
  })

  it('truncates with ellipsis when text exceeds maxWidth', () => {
    // "Hello World" = 110px, maxWidth = 80px
    const result = truncateText(ctx, 'Hello World', 80)
    expect(result).toContain('…')
    expect(result.endsWith('…')).toBe(true)
  })

  it('returns just ellipsis when even one character + ellipsis exceeds maxWidth', () => {
    // maxWidth = 5px, "A…" = 20px — nothing fits
    const result = truncateText(ctx, 'Hello', 5)
    expect(result).toBe('…')
  })

  it('returns ellipsis for zero maxWidth', () => {
    const result = truncateText(ctx, 'Hello', 0)
    expect(result).toBe('…')
  })

  it('returns ellipsis for negative maxWidth', () => {
    const result = truncateText(ctx, 'Hello', -10)
    expect(result).toBe('…')
  })

  it('truncates to the longest fitting prefix + ellipsis', () => {
    // Each char = 10px, maxWidth = 50px
    // "Hello World" = 110px, too long
    // "Hello Worl…" = 110px, too long
    // ...
    // "Hell…" = 50px, fits!
    const result = truncateText(ctx, 'Hello World', 50)
    expect(result).toBe('Hell…')
  })

  it('handles empty string', () => {
    const result = truncateText(ctx, '', 100)
    expect(result).toBe('')
  })

  it('uses ctx.measureText for width calculation', () => {
    truncateText(ctx, 'Test', 100)
    expect(ctx.measureText).toHaveBeenCalledWith('Test')
  })
})
