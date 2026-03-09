import { describe, it, expect, vi } from 'vitest';
import { isAuthenticated, isContributor, isApprover, isExec } from '../middleware/authMiddleware.js';

/**
 * Helper to create a minimal mock request with session data.
 */
function createMockRequest({ user = undefined, privileges = undefined } = {}) {
  return {
    session: {
      user,
      privileges,
    },
  };
}

/**
 * Helper to create a minimal mock response that captures status and json calls.
 */
function createMockResponse() {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(data) {
      response.body = data;
      return response;
    },
  };
  return response;
}

describe('authMiddleware', () => {
  describe('isAuthenticated', () => {
    it('calls next when session has a user', () => {
      const request = createMockRequest({ user: 'alice' });
      const response = createMockResponse();
      const next = vi.fn();

      isAuthenticated(request, response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 401 when session has no user', () => {
      const request = createMockRequest({});
      const response = createMockResponse();
      const next = vi.fn();

      isAuthenticated(request, response, next);

      expect(next).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(401);
      expect(response.body).toEqual({ error: 'Not authenticated' });
    });
  });

  describe('isContributor', () => {
    it('calls next when privileges >= 2', () => {
      const request = createMockRequest({ user: 'alice', privileges: 2 });
      const response = createMockResponse();
      const next = vi.fn();

      isContributor(request, response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 403 when privileges < 2', () => {
      const request = createMockRequest({ user: 'bob', privileges: 1 });
      const response = createMockResponse();
      const next = vi.fn();

      isContributor(request, response, next);

      expect(next).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(403);
    });
  });

  describe('isApprover', () => {
    it('calls next when privileges >= 3', () => {
      const request = createMockRequest({ user: 'charlie', privileges: 3 });
      const response = createMockResponse();
      const next = vi.fn();

      isApprover(request, response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 403 when privileges < 3', () => {
      const request = createMockRequest({ user: 'dave', privileges: 2 });
      const response = createMockResponse();
      const next = vi.fn();

      isApprover(request, response, next);

      expect(next).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(403);
    });
  });

  describe('isExec', () => {
    it('calls next when privileges >= 4', () => {
      const request = createMockRequest({ user: 'admin', privileges: 4 });
      const response = createMockResponse();
      const next = vi.fn();

      isExec(request, response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 403 when privileges < 4', () => {
      const request = createMockRequest({ user: 'charlie', privileges: 3 });
      const response = createMockResponse();
      const next = vi.fn();

      isExec(request, response, next);

      expect(next).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(403);
    });
  });
});

