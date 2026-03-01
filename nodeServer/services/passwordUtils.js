import bcrypt from 'bcryptjs';
import config from '../config.js';

// generatePasswordHash: synchronous helper that reproduces existing app behavior
// (uses bcrypt.genSaltSync and appends the lowercased email + app salt to the salt string)
export function generatePasswordHash(plainPassword, userEmail) {
  const normalizedEmail = String(userEmail || '').toLowerCase();
  const salt = bcrypt.genSaltSync(10) + normalizedEmail + config.salt;
  return bcrypt.hashSync(String(plainPassword), salt);
}

// comparePassword: returns Promise<boolean> to match async usage in routes
export function comparePassword(plainPassword, storedHash) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(String(plainPassword), storedHash, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });
}
