import { describe, it, expect, vi } from 'vitest'
import {
  createEmailSendRequest,
  approveEmailSendRequest,
  rejectEmailSendRequest,
  markEmailSendRequestSent
} from '../services/emailSendRequestService.js'

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

/**
 * Builds a mock pool for the review flow (approve/reject), which does a
 * `SELECT ... FOR UPDATE` followed by an `UPDATE`, inside a transaction.
 */
function buildMockReviewPool({ existingRow = null } = {}) {
  const query = vi.fn().mockImplementation((sql) => {
    if (String(sql).trim().toUpperCase().startsWith('SELECT')) {
      return Promise.resolve([existingRow ? [existingRow] : []])
    }
    return Promise.resolve([{}])
  })
  const connection = {
    query,
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn()
  }
  const pool = {
    getConnection: vi.fn().mockResolvedValue(connection),
    query: vi.fn().mockResolvedValue([{}])
  }
  return { pool, connection }
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

    it('filters out malformed email values (e.g. leftover placeholder/test data) before snapshotting', async () => {
      const selectRows = [{ email: 'a@example.com' }, { email: 'contact01' }, { email: '  ' }, { email: 'b@example.com' }]
      const { pool, connection } = buildMockPool({ selectRows, insertId: 7 })

      const result = await createEmailSendRequest(pool, {
        requestedBy: 'approver@example.com',
        subject: 'Hello',
        htmlBody: '<p>Hi</p>',
        filterCriteria: { region: 'EU' }
      })

      expect(result).toEqual({ id: 7, recipientCount: 2 })
      const insertCall = connection.query.mock.calls.find(call => String(call[0]).trim().toUpperCase().startsWith('INSERT'))
      const data = JSON.parse(insertCall[1][1])
      expect(data.recipients).toEqual(['a@example.com', 'b@example.com'])
    })

    it('throws INVALID_EMAIL_REQUEST when every matched row has a malformed email', async () => {
      const { pool } = buildMockPool({ selectRows: [{ email: 'contact01' }, { email: 'not-an-email' }] })
      await expect(createEmailSendRequest(pool, {
        requestedBy: 'user@example.com', subject: 'Hello', htmlBody: '<p>Hi</p>', filterCriteria: { region: 'EU' }
      })).rejects.toMatchObject({ code: 'INVALID_EMAIL_REQUEST', message: 'No recipients match the provided filters' })
    })
  })

  describe('rejectEmailSendRequest', () => {
    it('throws when the request does not exist', async () => {
      const { pool, connection } = buildMockReviewPool({ existingRow: null })
      await expect(rejectEmailSendRequest(pool, { id: 1, approver: 'exec@example.com', comments: null }))
        .rejects.toThrow('Email send request not found')
      expect(connection.rollback).toHaveBeenCalled()
    })

    it('throws when the request is not pending', async () => {
      const { pool, connection } = buildMockReviewPool({ existingRow: { id: 1, status: 'sent', data: '{}' } })
      await expect(rejectEmailSendRequest(pool, { id: 1, approver: 'exec@example.com', comments: null }))
        .rejects.toThrow('expected one of: pending')
      expect(connection.rollback).toHaveBeenCalled()
    })

    it('marks a pending request rejected', async () => {
      const { pool, connection } = buildMockReviewPool({ existingRow: { id: 1, status: 'pending', data: '{}' } })
      await rejectEmailSendRequest(pool, { id: 1, approver: 'exec@example.com', comments: 'not appropriate' })

      const updateCall = connection.query.mock.calls.find(call => String(call[0]).trim().toUpperCase().startsWith('UPDATE'))
      expect(updateCall[0]).toContain('UPDATE email_send_requests')
      expect(updateCall[1]).toEqual(['rejected', 'exec@example.com', 'not appropriate', 1])
      expect(connection.commit).toHaveBeenCalled()
      expect(connection.release).toHaveBeenCalled()
    })
  })

  describe('approveEmailSendRequest', () => {
    it('throws when the request is not pending', async () => {
      const { pool, connection } = buildMockReviewPool({ existingRow: { id: 1, status: 'rejected', data: '{}' } })
      await expect(approveEmailSendRequest(pool, { id: 1, approver: 'exec@example.com', comments: null }))
        .rejects.toThrow('expected one of: pending')
      expect(connection.rollback).toHaveBeenCalled()
    })

    it('marks the request approved and returns the parsed payload without sending anything', async () => {
      const storedData = { subject: 'Hello', htmlBody: '<p>Hi</p>', recipients: ['a@example.com'], recipientCount: 1, filterCriteria: { region: 'EU' } }
      const { pool, connection } = buildMockReviewPool({ existingRow: { id: 1, status: 'pending', data: JSON.stringify(storedData) } })

      const result = await approveEmailSendRequest(pool, { id: 1, approver: 'exec@example.com', comments: 'looks good' })

      expect(result).toEqual(storedData)
      const updateCall = connection.query.mock.calls.find(call => String(call[0]).trim().toUpperCase().startsWith('UPDATE'))
      expect(updateCall[1]).toEqual(['approved', 'exec@example.com', 'looks good', 1])
      expect(connection.commit).toHaveBeenCalled()
    })
  })

  describe('markEmailSendRequestSent', () => {
    it('records a null notes value when every send succeeded', async () => {
      const pool = { query: vi.fn().mockResolvedValue([{}]) }
      await markEmailSendRequestSent(pool, { id: 1, succeeded: ['a@example.com'], failed: [] })

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE email_send_requests'),
        ['sent', null, 1]
      )
    })

    it('summarizes failed recipients in notes', async () => {
      const pool = { query: vi.fn().mockResolvedValue([{}]) }
      await markEmailSendRequestSent(pool, {
        id: 1,
        succeeded: ['a@example.com'],
        failed: [{ email: 'b@example.com', error: 'bounced' }]
      })

      const [, params] = pool.query.mock.calls[0]
      expect(params[0]).toBe('sent')
      expect(params[1]).toContain('1 of 2 failed')
      expect(params[1]).toContain('b@example.com')
      expect(params[2]).toBe(1)
    })
  })
})
