import { describe, it, expect, vi } from 'vitest'
import { createEmailSendRequest } from '../services/emailSendRequestService.js'

function buildMockPool({ selectRows = [], insertId = 1 } = {}) {
  const query = vi.fn().mockImplementation((sql) => {
    if (String(sql).trim().toUpperCase().startsWith('SELECT')) {
      return Promise.resolve([selectRows])
    }
    return Promise.resolve([{ insertId }])
  })
  const connection = { query, release: vi.fn() }
  return { pool: { getConnection: vi.fn().mockResolvedValue(connection) }, connection }
}

describe('emailSendRequestService', () => {
  describe('createEmailSendRequest', () => {
    it('throws INVALID_EMAIL_REQUEST when subject is missing', async () => {
      const { pool } = buildMockPool()
      await expect(createEmailSendRequest(pool, {
        requestedBy: 'user@example.com', subject: '  ', htmlBody: '<p>Hi</p>', filterCriteria: { region: 'EU' }
      })).rejects.toMatchObject({ code: 'INVALID_EMAIL_REQUEST', message: 'subject is required' })
    })

    it('throws INVALID_EMAIL_REQUEST when htmlBody is missing', async () => {
      const { pool } = buildMockPool()
      await expect(createEmailSendRequest(pool, {
        requestedBy: 'user@example.com', subject: 'Hello', htmlBody: '   ', filterCriteria: { region: 'EU' }
      })).rejects.toMatchObject({ code: 'INVALID_EMAIL_REQUEST', message: 'htmlBody is required' })
    })

    it('propagates INVALID_FILTER_CRITERIA from buildUserEmailFilterQuery', async () => {
      const { pool } = buildMockPool()
      await expect(createEmailSendRequest(pool, {
        requestedBy: 'user@example.com', subject: 'Hello', htmlBody: '<p>Hi</p>', filterCriteria: {}
      })).rejects.toMatchObject({ code: 'INVALID_FILTER_CRITERIA' })
    })

    it('throws INVALID_EMAIL_REQUEST when no recipients match the filter', async () => {
      const { pool, connection } = buildMockPool({ selectRows: [] })
      await expect(createEmailSendRequest(pool, {
        requestedBy: 'user@example.com', subject: 'Hello', htmlBody: '<p>Hi</p>', filterCriteria: { region: 'EU' }
      })).rejects.toMatchObject({ code: 'INVALID_EMAIL_REQUEST', message: 'No recipients match the provided filters' })
      expect(connection.release).toHaveBeenCalled()
    })

    it('resolves recipients, dedupes them, and inserts a pending request row', async () => {
      const selectRows = [{ email: 'a@example.com' }, { email: 'a@example.com' }, { email: 'b@example.com' }]
      const { pool, connection } = buildMockPool({ selectRows, insertId: 42 })

      const result = await createEmailSendRequest(pool, {
        requestedBy: 'approver@example.com',
        subject: '  Hello  ',
        htmlBody: '  <p>Hi</p>  ',
        filterCriteria: { region: 'EU' }
      })

      expect(result).toEqual({ id: 42, recipientCount: 2 })

      const insertCall = connection.query.mock.calls.find(call => String(call[0]).trim().toUpperCase().startsWith('INSERT'))
      expect(insertCall[0]).toContain('INSERT INTO email_send_requests')
      const [requestedBy, dataJson] = insertCall[1]
      expect(requestedBy).toBe('approver@example.com')

      const data = JSON.parse(dataJson)
      expect(data).toEqual({
        subject: 'Hello',
        htmlBody: '<p>Hi</p>',
        recipients: ['a@example.com', 'b@example.com'],
        recipientCount: 2,
        filterCriteria: { region: 'EU' }
      })

      expect(connection.release).toHaveBeenCalled()
    })
  })
})
