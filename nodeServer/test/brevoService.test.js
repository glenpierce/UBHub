import { describe, it, expect, vi, afterEach } from 'vitest'
import { sendSingleTransactionalEmail, sendToAllRecipientsIndividually } from '../services/brevoService.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('brevoService', () => {
  describe('sendSingleTransactionalEmail', () => {
    it('posts to the Brevo transactional email endpoint with the expected shape', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ messageId: 'abc123' })
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await sendSingleTransactionalEmail({
        apiKey: 'test-key',
        senderEmail: 'from@example.com',
        senderName: 'UBHub',
        recipientEmail: 'to@example.com',
        subject: 'Hello',
        htmlContent: '<p>Hi</p>'
      })

      expect(result).toEqual({ messageId: 'abc123' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.brevo.com/v3/smtp/email')
      expect(options.method).toBe('POST')
      expect(options.headers['api-key']).toBe('test-key')
      const body = JSON.parse(options.body)
      expect(body.sender).toEqual({ email: 'from@example.com', name: 'UBHub' })
      expect(body.to).toEqual([{ email: 'to@example.com' }])
      expect(body.subject).toBe('Hello')
      expect(body.htmlContent).toBe('<p>Hi</p>')
    })

    it('throws with the response body when Brevo returns a non-2xx status', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('{"message":"invalid sender"}')
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(sendSingleTransactionalEmail({
        apiKey: 'test-key',
        senderEmail: 'from@example.com',
        recipientEmail: 'to@example.com',
        subject: 'Hello',
        htmlContent: '<p>Hi</p>'
      })).rejects.toThrow('invalid sender')
    })
  })

  describe('sendToAllRecipientsIndividually', () => {
    it('sends one API call per recipient, never batching multiple recipients into one call', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ messageId: 'abc123' })
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await sendToAllRecipientsIndividually({
        apiKey: 'test-key',
        senderEmail: 'from@example.com',
        recipients: ['a@example.com', 'b@example.com', 'c@example.com'],
        subject: 'Hello',
        htmlContent: '<p>Hi</p>'
      })

      expect(fetchMock).toHaveBeenCalledTimes(3)
      fetchMock.mock.calls.forEach(([, options]) => {
        const body = JSON.parse(options.body)
        expect(body.to).toHaveLength(1)
      })
      expect(result).toEqual({
        succeeded: ['a@example.com', 'b@example.com', 'c@example.com'],
        failed: []
      })
    })

    it('never throws: partitions successes and failures even when every send fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: vi.fn().mockResolvedValue('boom')
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await sendToAllRecipientsIndividually({
        apiKey: 'test-key',
        senderEmail: 'from@example.com',
        recipients: ['a@example.com', 'b@example.com'],
        subject: 'Hello',
        htmlContent: '<p>Hi</p>'
      })

      expect(result.succeeded).toEqual([])
      expect(result.failed).toHaveLength(2)
      expect(result.failed[0].email).toBe('a@example.com')
      expect(result.failed[0].error).toContain('boom')
    })

    it('partitions mixed success and failure results correctly', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ messageId: '1' }) })
        .mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad Request', text: vi.fn().mockResolvedValue('rejected') })
      vi.stubGlobal('fetch', fetchMock)

      const result = await sendToAllRecipientsIndividually({
        apiKey: 'test-key',
        senderEmail: 'from@example.com',
        recipients: ['a@example.com', 'b@example.com'],
        subject: 'Hello',
        htmlContent: '<p>Hi</p>'
      })

      expect(result.succeeded).toEqual(['a@example.com'])
      expect(result.failed).toEqual([{ email: 'b@example.com', error: expect.stringContaining('rejected') }])
    })
  })
})
