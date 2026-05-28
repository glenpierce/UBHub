import express from 'express';
const router = express.Router();
import { makeDbCallAsPromise } from '../ConnectionPool.js';
import { isAuthenticated, isContributor, isApprover } from '../middleware/authMiddleware.js';
import { isNonEmptyString } from '../utils/validationUtils.js';

// Allowed region codes for users.region
const ALLOWED_REGION_CODES = ['NA','LA','CAR','MECNA','AF','ESA','SA','EU','OC'];

function normalizeRegionInput(input) {
  // Accepts an array of codes, a comma-separated string, or null/undefined.
  if (input == null) return { ok: true, value: '' };
  let codes = [];
  if (Array.isArray(input)) {
    codes = input.map((s) => String(s || '').trim()).filter(Boolean);
  } else {
    codes = String(input).split(',').map((s) => String(s || '').trim()).filter(Boolean);
  }
  for (const code of codes) {
    if (!ALLOWED_REGION_CODES.includes(code)) return { ok: false, invalid: code };
  }
  return { ok: true, value: codes.join(',') };
}

/**
 * Render the contacts page.
 * This page is a CMS for all contacts (users with privileges = 0) and uses AJAX
 * to call the JSON endpoints below.
 */
function renderContactsPageHandler(request, response) {
  response.render('contacts', {
    user: request.session && request.session.user,
  });
}

// Exported for unit/integration tests
export { renderContactsPageHandler };

router.get('/', isAuthenticated, isContributor, renderContactsPageHandler);

// Return list of contacts (all users) as JSON.
// Fields are projected to the names used by the contacts view.
async function listContactsHandler(request, response) {
  try {
    const sql = 'SELECT email, alias, phone, title, institution, region, level, workingGroup, privileges FROM `users` ORDER BY alias';
    const rows = await makeDbCallAsPromise(sql);
    response.json(rows || []);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    response.status(500).json({ error: 'Database error' });
  }
}

export { listContactsHandler };

router.get('/list', isAuthenticated, isContributor, listContactsHandler);

/**
 * Render the contacts emails admin page (tiny UI for approvers to generate recipient lists).
 */
function renderEmailsPageHandler(request, response) {
  response.render('contactsEmails', { user: request.session && request.session.user });
}

export { renderEmailsPageHandler };

router.get('/emails-ui', isAuthenticated, isApprover, renderEmailsPageHandler);

// Return list of emails for given region codes as JSON
async function getEmailsHandler(request, response) {
  try {
    const regionsRaw = request.query && request.query.regions ? request.query.regions : null;
    if (!regionsRaw) {
      return response.status(400).json({error: 'regions query parameter is required'});
    }
    const normalized = normalizeRegionInput(regionsRaw);
    if (!normalized.ok) {
      return response.status(400).json({error: `Invalid region code: ${normalized.invalid}`});
    }
    const codes = normalized.value ? normalized.value.split(',') : [];
    if (codes.length === 0) {
      return response.status(400).json({error: 'No region codes provided'});
    }

    // Build SQL using FIND_IN_SET for each code to support comma-separated storage
    const conditions = codes.map(() => 'FIND_IN_SET(?, region)');
    const sql = `SELECT DISTINCT email FROM users WHERE (${conditions.join(' OR ')}) AND email IS NOT NULL AND TRIM(email) <> ''`;
    const rows = await makeDbCallAsPromise(sql, codes);
    const emails = (rows || []).map((r) => String(r.email || '').trim()).filter(Boolean);
    // unique
    const uniqueEmails = Array.from(new Set(emails));
    return response.json({ emails: uniqueEmails, count: uniqueEmails.length, copyText: uniqueEmails.join(', ') });
  } catch (error) {
    console.error('Error fetching emails for regions:', error);
    return response.status(500).json({ error: 'Database error' });
  }
}

export { getEmailsHandler };

router.get('/emails', isAuthenticated, isApprover, getEmailsHandler);

// Add a new contact to the users table with privileges = 0 (Contact) and no password.
async function addContactHandler(request, response) {
  try {
    const alias = request.body && request.body.alias ? String(request.body.alias).trim() : '';
    const email = request.body && request.body.email ? String(request.body.email).trim() : '';
    const phone = request.body && request.body.phone ? String(request.body.phone).trim() : '';
    const title = request.body && request.body.title ? String(request.body.title).trim() : '';
    const institution = request.body && request.body.institution ? String(request.body.institution).trim() : '';
    const regionRaw = request.body && Object.prototype.hasOwnProperty.call(request.body, 'region') ? request.body.region : null;
    const level = request.body.level ? String(request.body.level).trim() : '';
    const workingGroup = request.body.workingGroup ? String(request.body.workingGroup).trim() : '';

    if (!isNonEmptyString(alias)) {
      return response.status(400).json({ error: 'alias is required' });
    }
    if (!isNonEmptyString(email)) {
      return response.status(400).json({ error: 'email is required' });
    }
    // Normalize and validate region input (allows array or comma-separated string)
    const normalized = normalizeRegionInput(regionRaw);
    if (!normalized.ok) {
      return response.status(400).json({ error: `Invalid region code: ${normalized.invalid}` });
    }
    const region = normalized.value;

    const insertSql = 'INSERT INTO `users` (email, alias, phone, title, institution, region, level, workingGroup, createdBy, privileges) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)';
    const parameters = [email, alias, phone, title, institution, region, level, workingGroup, request.session && request.session.user ? request.session.user : null];

    await makeDbCallAsPromise(insertSql, parameters);

    response.status(201).json({ success: true, email });
  } catch (error) {
    console.error('Error adding contact:', error);
    response.status(500).json({ error: 'Database error' });
  }
}

export { addContactHandler };

router.post('/add', isAuthenticated, isContributor, addContactHandler);

// Edit an existing contact identified by email (the primary key of users).
async function editContactHandler(request, response) {
  try {
    const emailParam = request.params.email ? decodeURIComponent(request.params.email) : '';
    if (!isNonEmptyString(emailParam)) {
      return response.status(400).json({ error: 'Invalid email' });
    }

    const allowedFields = ['alias', 'phone', 'title', 'institution', 'region', 'level', 'workingGroup'];
    const updatesMap = {};
    allowedFields.forEach((fieldName) => {
      if (Object.prototype.hasOwnProperty.call(request.body, fieldName)) {
        // Preserve raw region input (could be array) so we can normalize it below
        if (fieldName === 'region') {
          updatesMap[fieldName] = request.body[fieldName];
        } else {
          updatesMap[fieldName] = String(request.body[fieldName] || '').trim();
        }
      }
    });

    if (Object.keys(updatesMap).length === 0) {
      return response.status(400).json({ error: 'No updatable fields provided' });
    }

    // If region is present in updates, normalize & validate it
    if (Object.prototype.hasOwnProperty.call(updatesMap, 'region')) {
      const norm = normalizeRegionInput(updatesMap.region);
      if (!norm.ok) return response.status(400).json({ error: `Invalid region code: ${norm.invalid}` });
      updatesMap.region = norm.value;
    }

    const setFragments = [];
    const params = [];
    Object.keys(updatesMap).forEach((columnName) => {
      setFragments.push(`${columnName} = ?`);
      params.push(updatesMap[columnName]);
    });
    params.push(emailParam);

    const updateSql = `UPDATE users SET ${setFragments.join(', ')} WHERE email = ?`;
    await makeDbCallAsPromise(updateSql, params);
    response.json({ success: true });
  } catch (error) {
    console.error('Error editing contact:', error);
    response.status(500).json({ error: 'Database error' });
  }
}

export { editContactHandler };

router.post('/edit/:email', isAuthenticated, isContributor, editContactHandler);

// Delete a contact by email (the primary key of users).
async function deleteContactHandler(request, response) {
  try {
    const emailParam = request.params.email ? decodeURIComponent(request.params.email) : '';
    if (!isNonEmptyString(emailParam)) {
      return response.status(400).json({ error: 'Invalid email' });
    }

    await makeDbCallAsPromise('DELETE FROM users WHERE email = ?', [emailParam]);
    response.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    response.status(500).json({ error: 'Database error' });
  }
}

export { deleteContactHandler };

router.post('/delete/:email', isAuthenticated, isContributor, deleteContactHandler);

export default router;
