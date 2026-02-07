import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchJson, debounce, zeroPad, formatDateTime } from '../public/javascripts/data-management/utils.js'

describe('data-management utils', () => {
  describe('zeroPad', () => {
    it('pads single digit numbers to length 2 by default', () => {
      expect(zeroPad(5)).toBe('05')
    })

    it('pads to the requested length', () => {
      expect(zeroPad(7, 4)).toBe('0007')
    })

    it('leaves longer numbers unchanged beyond requested length', () => {
      expect(zeroPad(12345, 3)).toBe('12345')
    })
  })

  describe('formatDateTime', () => {
    it('returns empty string for non-Date inputs', () => {
      expect(formatDateTime(null)).toBe('')
      expect(formatDateTime('2020-01-01')).toBe('')
    })

    it('returns empty string for invalid Date', () => {
      expect(formatDateTime(new Date('invalid'))).toBe('')
    })

    it('formats a valid date with zero padding', () => {
      const date = new Date(Date.UTC(2020, 0, 2, 3, 4, 5)) // 2020-01-02 03:04:05 UTC
      // Because the function uses local timezone, we compute expected by constructing a date in local timezone
      const expectedYear = date.getFullYear()
      const expectedMonth = String(date.getMonth() + 1).padStart(2, '0')
      const expectedDay = String(date.getDate()).padStart(2, '0')
      const expectedHours = String(date.getHours()).padStart(2, '0')
      const expectedMinutes = String(date.getMinutes()).padStart(2, '0')
      const expectedSeconds = String(date.getSeconds()).padStart(2, '0')
      const expected = `${expectedYear}-${expectedMonth}-${expectedDay} ${expectedHours}:${expectedMinutes}:${expectedSeconds}`
      expect(formatDateTime(date)).toBe(expected)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.resetAllMocks()
    })

    it('debounces calls and calls the wrapped function once with last args', () => {
      const mockFn = vi.fn()
      const debounced = debounce(mockFn, 100)

      debounced('first')
      debounced('second')

      // not called immediately
      expect(mockFn).not.toHaveBeenCalled()

      // advance time to trigger debounce
      vi.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('second')
    })

    it('supports multiple arguments and preserves them', () => {
      const mockFn = vi.fn()
      const debounced = debounce(mockFn, 50)

      debounced(1, 2, 3)
      vi.advanceTimersByTime(50)

      expect(mockFn).toHaveBeenCalledWith(1, 2, 3)
    })
  })

  describe('fetchJson', () => {
    let originalFetch

    beforeEach(() => {
      originalFetch = global.fetch
    })

    afterEach(() => {
      global.fetch = originalFetch
      vi.restoreAllMocks()
    })

    it('resolves with parsed json when response is ok', async () => {
      const fakeResponse = {
        ok: true,
        json: async () => ({ success: true }),
      }
      global.fetch = vi.fn(() => Promise.resolve(fakeResponse))

      await expect(fetchJson('/fake-url')).resolves.toEqual({ success: true })
      expect(global.fetch).toHaveBeenCalledWith('/fake-url', {})
    })

    it('rejects with an Error when response is not ok', async () => {
      const fakeResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }
      global.fetch = vi.fn(() => Promise.resolve(fakeResponse))

      await expect(fetchJson('/not-found')).rejects.toThrow('404 Not Found')
      expect(global.fetch).toHaveBeenCalledWith('/not-found', {})
    })
  })
})
