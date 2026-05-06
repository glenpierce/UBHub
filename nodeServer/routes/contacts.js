import express from 'express';
const router = express.Router();
import { makeDbCallAsPromise } from '../ConnectionPool.js';
import { isAuthenticated, isContributor } from '../middleware/authMiddleware.js';
import { isNonEmptyString } from '../utils/validationUtils.js';

/**
 * Render the contacts page.
 * This page is a simple CMS for contacts and uses AJAX to call the JSON endpoints below.
 */
function renderContactsPageHandler(request, response) {
  response.render('contacts', {
    user: request.session && request.session.user,
  });
}

// Exported for unit/integration tests
export { renderContactsPageHandler };

router.get('/', isAuthenticated, isContributor, renderContactsPageHandler);

// Return list of contacts as JSON
async function listContactsHandler(request, response) {
  try {
    const sql = 'SELECT id, fullName, email, phone, title, organization, region, level, workingGroup FROM `contacts` ORDER BY fullName';
    const rows = await makeDbCallAsPromise(sql);
    response.json(rows || []);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    response.status(500).json({ error: 'Database error' });
  }
}

export { listContactsHandler };

router.get('/list', isAuthenticated, isContributor, listContactsHandler);

// Add a new contact
async function addContactHandler(request, response) {
  try {
    const fullName = request.body && request.body.fullName ? String(request.body.fullName).trim() : '';
    const email = request.body && request.body.email ? String(request.body.email).trim() : '';
    const phone = request.body && request.body.phone ? String(request.body.phone).trim() : '';
    const title = request.body && request.body.title ? String(request.body.title).trim() : '';
    const organization = request.body && request.body.organization ? String(request.body.organization).trim() : '';
    const region = request.body && request.body.region ? String(request.body.region).trim() : '';
    const level = request.body.level ? String(request.body.level).trim() : '';
    const workingGroup = request.body.workingGroup ? String(request.body.workingGroup).trim() : '';

    if (!isNonEmptyString(fullName)) {
      return response.status(400).json({ error: 'fullName is required' });
    }
    if (!isNonEmptyString(email)) {
      return response.status(400).json({ error: 'email is required' });
    }

    const insertSql = 'INSERT INTO `contacts` (fullName, email, phone, title, organization, region, level, workingGroup, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const parameters = [fullName, email, phone, title, organization, region, level, workingGroup, request.session && request.session.user ? request.session.user : null];

    const result = await makeDbCallAsPromise(insertSql, parameters);

    // result for INSERT should contain insertId
    const insertedId = result && result.insertId ? result.insertId : null;
    response.status(201).json({ success: true, id: insertedId });
  } catch (error) {
    console.error('Error adding contact:', error);
    response.status(500).json({ error: 'Database error' });
  }
}

export { addContactHandler };

router.post('/add', isAuthenticated, isContributor, addContactHandler);

// Edit an existing contact
async function editContactHandler(request, response) {
  try {
    const numericId = parseInt(request.params.id, 10);
    if (Number.isNaN(numericId) || numericId <= 0) {
      return response.status(400).json({ error: 'Invalid id' });
    }

    const allowedFields = ['fullName', 'email', 'phone', 'title', 'organization', 'region', 'level', 'workingGroup'];
    const updatesMap = {};
    allowedFields.forEach((fieldName) => {
      if (Object.prototype.hasOwnProperty.call(request.body, fieldName)) {
        updatesMap[fieldName] = String(request.body[fieldName] || '').trim();
      }
    });

    if (Object.keys(updatesMap).length === 0) {
      return response.status(400).json({ error: 'No updatable fields provided' });
    }

    const setFragments = [];
    const params = [];
    Object.keys(updatesMap).forEach((columnName) => {
      setFragments.push(`${columnName} = ?`);
      params.push(updatesMap[columnName]);
    });
    params.push(numericId);

    const updateSql = `UPDATE contacts SET ${setFragments.join(', ')} WHERE id = ?`;
    await makeDbCallAsPromise(updateSql, params);
    response.json({ success: true });
  } catch (error) {
    console.error('Error editing contact:', error);
    response.status(500).json({ error: 'Database error' });
  }
}

export { editContactHandler };

router.post('/edit/:id', isAuthenticated, isContributor, editContactHandler);

// Delete a contact
async function deleteContactHandler(request, response) {
  try {
    const numericId = parseInt(request.params.id, 10);
    if (Number.isNaN(numericId) || numericId <= 0) {
      return response.status(400).json({ error: 'Invalid id' });
    }

    await makeDbCallAsPromise('DELETE FROM contacts WHERE id = ?', [numericId]);
    response.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    response.status(500).json({ error: 'Database error' });
  }
}

export { deleteContactHandler };

router.post('/delete/:id', isAuthenticated, isContributor, deleteContactHandler);

export default router;


