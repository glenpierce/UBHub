/**
 * Reusable Express middleware for authentication and role-based authorization.
 *
 * Privilege levels:
 *   0 = Contact (no password, cannot authenticate)
 *   1 = User    (authenticated, read-only access)
 *   2 = Contributor
 *   3 = Approver
 *   4 = Executive
 */

/**
 * Require an authenticated session. Responds 401 when the session has no user.
 *
 * @param {import('express').Request}  request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 */
export function isAuthenticated(request, response, next) {
  if (request.session && request.session.user) {
    return next();
  }
  response.status(401).json({ error: 'Not authenticated' });
}

/**
 * Require a minimum privilege level of 2 (Contributor).
 *
 * @param {import('express').Request}  request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 */
export function isContributor(request, response, next) {
  if (request.session.user && request.session.privileges >= 2) {
    return next();
  }
  response.status(403).json({ error: 'Not authorized' });
}

/**
 * Require a minimum privilege level of 3 (Approver).
 *
 * @param {import('express').Request}  request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 */
export function isApprover(request, response, next) {
  if (request.session.user && request.session.privileges >= 3) {
    return next();
  }
  response.status(403).json({ error: 'Not authorized' });
}

/**
 * Require a minimum privilege level of 4 (Executive).
 *
 * @param {import('express').Request}  request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 */
export function isExec(request, response, next) {
  if (request.session.user && request.session.privileges >= 4) {
    return next();
  }
  response.status(403).json({ error: 'Not authorized' });
}

