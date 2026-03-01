import express from 'express';
const router = express.Router();
import { makeDbCallAsPromise } from '../ConnectionPool.js';
import { comparePassword, generatePasswordHash } from '../services/passwordUtils.js';

// Return current user profile data (JSON). Uses session email to query users table.
router.post('/me', async function (request, response) {
  try {
    if (!request.session || !request.session.email) return response.status(401).send({ error: 'Not authenticated' });
    const userRows = await makeDbCallAsPromise('select alias, email, userAddress, title, institution, whatsAppNumber, primaryContact from users where email = ?', [request.session.email]);
    if (!userRows || userRows.length === 0) return response.status(404).send({ error: 'User not found' });
    // return first row as JSON
    return response.json(userRows[0]);
  } catch (unexpectedError) {
    console.error('Error fetching profile for /account/me', unexpectedError);
    return response.status(500).send({ error: 'Server error' });
  }
});

// Update profile fields (alias, userAddress, title, institution, whatsAppNumber, primaryContact)
router.post('/update', async function (request, response) {
  try {
    if (!request.session || !request.session.email) {
      return response.status(401).send({ error: 'Not authenticated' });
    }

    // Only accept expected fields to avoid accidental updates
    const allowedProfileFields = ['alias','userAddress','title','institution','whatsAppNumber','primaryContact'];
    const updatesMap = {};
    allowedProfileFields.forEach(fieldName => {
      if (Object.prototype.hasOwnProperty.call(request.body, fieldName)) updatesMap[fieldName] = String(request.body[fieldName] || '');
    });

    if (Object.keys(updatesMap).length === 0) return response.status(400).send({ error: 'No updatable fields provided' });

    // Build SET clause safely
    const setClauseFragments = [];
    const queryParams = [];
    Object.keys(updatesMap).forEach(columnName => {
      setClauseFragments.push(`${columnName} = ?`);
      queryParams.push(updatesMap[columnName]);
    });
    queryParams.push(request.session.email);

    const updateQueryString = `UPDATE users SET ${setClauseFragments.join(', ')} WHERE email = ?`;
    try {
      // Use the shared helper for DB calls which returns a promise and handles the pool internally
      await makeDbCallAsPromise(updateQueryString, queryParams);
      // If alias was updated, reflect in session username used by templates
      if (updatesMap.alias && request.session) {
        request.session.user = updatesMap.alias;
      }
      return response.json({ success: true });
    } catch (databaseUpdateError) {
      console.error('Error updating profile:', databaseUpdateError);
      return response.status(500).send({ error: 'Update failed' });
    }
  } catch (unexpectedError) {
    console.error('Unexpected error in /account/update', unexpectedError);
    return response.status(500).send({ error: 'Server error' });
  }
});

router.post('/resetPassword', async function (request, response) {
  try {
    if (!request.session || !request.session.email) return response.status(401).send(false);

    // Basic validation of provided passwords
    const currentPassword = request.body && request.body.oldPassword ? String(request.body.oldPassword) : '';
    const desiredNewPassword = request.body && request.body.newPassword ? String(request.body.newPassword) : '';
    if (!currentPassword || !desiredNewPassword) return response.send(false);

    const loginRows = await makeDbCallAsPromise('CALL login(?)', [request.session.email]);

    if (loginRows && loginRows.length > 0) {
      const storedHash = loginRows[0].hashedPassword;

      const passwordsMatch = await comparePassword(currentPassword, storedHash);

      if (passwordsMatch) {
        const newHash = generatePasswordHash(desiredNewPassword, request.session.email);

        const passwordUpdateQuery = 'UPDATE users SET hashedPassword = ? WHERE email = ?';
        try {
          await makeDbCallAsPromise(passwordUpdateQuery, [newHash, request.session.email]);
          return response.send(true);
        } catch (updateError) {
          console.error('Error updating password:', updateError);
          return response.send(false);
        }
      } else {
        return response.send(false);
      }
    } else {
      console.log('Error while performing password reset login Query.');
      return response.send(false);
    }
  } catch (connectionError) {
    console.error(connectionError);
    return response.send(false);
  }
});

router.get('/logout', function (request, response) {
  request.session.reset();
  response.render('home');
});

export default router;
