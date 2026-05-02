import express from 'express';
const router = express.Router();
import { makeDbCallAsPromise } from '../ConnectionPool.js';
import { isAuthenticated, isContributor } from '../middleware/authMiddleware.js';
import { isNonEmptyString } from '../utils/validationUtils.js';

/**
 * Render the contacts page.
 * This page is a simple CMS for contacts and uses AJAX to call the JSON endpoints below.
 */
router.get('/', isAuthenticated, isContributor, function (request, response) {
  response.render('contacts', {
    user: request.session && request.session.user,
  });
});

// Return list of contacts as JSON
router.get('/list', isAuthenticated, isContributor, async (request, response) => {
  try {
    const sql = 'SELECT id, fullName, email, phone, title, organization FROM `contacts` ORDER BY fullName';
    const rows = await makeDbCallAsPromise(sql);
    response.json(rows || []);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    response.status(500).json({ error: 'Database error' });
  }
});

// Add a new contact
router.post('/add', isAuthenticated, isContributor, async (request, response) => {
  try {
    const fullName = request.body && request.body.fullName ? String(request.body.fullName).trim() : '';
    const email = request.body && request.body.email ? String(request.body.email).trim() : '';
    const phone = request.body && request.body.phone ? String(request.body.phone).trim() : '';
    const title = request.body && request.body.title ? String(request.body.title).trim() : '';
    const organization = request.body && request.body.organization ? String(request.body.organization).trim() : '';

    if (!isNonEmptyString(fullName)) {
      return response.status(400).json({ error: 'fullName is required' });
    }
    if (!isNonEmptyString(email)) {
      return response.status(400).json({ error: 'email is required' });
    }

    const insertSql = 'INSERT INTO `contacts` (fullName, email, phone, title, organization, createdBy) VALUES (?, ?, ?, ?, ?, ?)';
    const parameters = [fullName, email, phone, title, organization, request.session && request.session.user ? request.session.user : null];

    const result = await makeDbCallAsPromise(insertSql, parameters);

    // result for INSERT should contain insertId
    const insertedId = result && result.insertId ? result.insertId : null;
    response.status(201).json({ success: true, id: insertedId });
  } catch (error) {
    console.error('Error adding contact:', error);
    response.status(500).json({ error: 'Database error' });
  }
});

// Edit an existing contact
router.post('/edit/:id', isAuthenticated, isContributor, async (request, response) => {
  try {
    const numericId = parseInt(request.params.id, 10);
    if (Number.isNaN(numericId) || numericId <= 0) {
      return response.status(400).json({ error: 'Invalid id' });
    }

    const allowedFields = ['fullName', 'email', 'phone', 'title', 'organization'];
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
});

// Delete a contact
router.post('/delete/:id', isAuthenticated, isContributor, async (request, response) => {
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
});

export default router;


