/**
 * GDPR privacy-removal (erasure) requests.
 *
 * An authenticated account holder can flag their own email address for
 * removal. Flagging only sets users.removalRequestedAt: from that moment the
 * address is excluded from every bulk send, and a human later deletes the row
 * by hand. Nothing here deletes data.
 *
 * Requests are only accepted for the address of the logged-in session, so no
 * one can flag an address they haven't proven they own.
 */

/**
 * Throw a typed 'USER_NOT_FOUND' error.
 *
 * @param {string} email
 */
function throwUserNotFound(email) {
  const error = new Error(`No user found for ${email}`);
  error.code = 'USER_NOT_FOUND';
  throw error;
}

/**
 * Flag the given (already authenticated) email address for removal.
 * Idempotent: repeating the request keeps the original timestamp.
 *
 * @param {function(string, Array): Promise<*>} executeQuery - e.g. makeDbCallAsPromise.
 * @param {string} authenticatedEmail - The session's email address, never request input.
 * @returns {Promise<{newlyRequested: boolean, removalRequestedAt: Date|string}>}
 * @throws {Error} with code 'USER_NOT_FOUND' when no users row matches.
 */
export async function requestPrivacyRemoval(executeQuery, authenticatedEmail) {
  const email = String(authenticatedEmail || '').trim();
  if (!email) {
    throwUserNotFound(email);
  }

  const updateResult = await executeQuery(
    'UPDATE users SET removalRequestedAt = NOW() WHERE email = ? AND removalRequestedAt IS NULL',
    [email],
  );
  const newlyRequested = Boolean(updateResult && updateResult.affectedRows > 0);

  const rows = await executeQuery('SELECT removalRequestedAt FROM users WHERE email = ?', [email]);
  if (!Array.isArray(rows) || rows.length === 0) {
    throwUserNotFound(email);
  }

  return { newlyRequested, removalRequestedAt: rows[0].removalRequestedAt };
}

/**
 * Re-check a recipient list against the users table immediately before
 * sending. Only addresses that still exist in users and have not requested
 * removal are sendable. This catches removal requests (and rows deleted by a
 * human) made after a bulk-email request snapshotted its recipients.
 *
 * @param {function(string, Array): Promise<*>} executeQuery - e.g. makeDbCallAsPromise.
 * @param {string[]} recipients
 * @returns {Promise<{sendable: string[], excluded: string[]}>}
 */
export async function filterSendableRecipients(executeQuery, recipients) {
  const uniqueRecipients = Array.from(new Set((recipients || []).map(recipient => String(recipient).trim()).filter(Boolean)));
  if (uniqueRecipients.length === 0) {
    return { sendable: [], excluded: [] };
  }

  const rows = await executeQuery(
    'SELECT email FROM users WHERE email IN (?) AND removalRequestedAt IS NULL',
    [uniqueRecipients],
  );
  // MySQL's default collation compares case-insensitively; match the same way here.
  const sendableAddresses = new Set((rows || []).map(row => String(row.email).trim().toLowerCase()));

  const sendable = [];
  const excluded = [];
  for (const recipient of uniqueRecipients) {
    if (sendableAddresses.has(recipient.toLowerCase())) {
      sendable.push(recipient);
    } else {
      excluded.push(recipient);
    }
  }
  return { sendable, excluded };
}
