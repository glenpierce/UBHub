// javascript
// #!/usr/bin/env node
// File: `decode-session.js`
// Usage: node decode-session.js '<cookie>' '<secret>'
//   or: COOKIE='<cookie>' SECRET='<secret>' node decode-session.js

const clientSessions = require('client-sessions');

const rawArg = process.argv[2] || process.env.COOKIE;
const secret = process.argv[3] || process.env.SECRET;

if (!rawArg || !secret) {
  console.error('Usage: node decode-session.js <cookie> <secret>  OR  COOKIE=<cookie> SECRET=<secret> node decode-session.js');
  process.exit(2);
}

// Normalize cookie value: accept raw value or full cookie header
let cookieVal = String(rawArg).trim();
if (cookieVal.includes(';')) {
  const parts = cookieVal.split(';').map(p => p.trim());
  const found = parts.find(p => p.startsWith('session='));
  if (found) cookieVal = found.split('session=')[1];
}
if (cookieVal.startsWith('session=')) cookieVal = cookieVal.split('session=')[1];
cookieVal = cookieVal.replace(/^"|"$/g, ''); // strip surrounding quotes

const middleware = clientSessions({
  cookieName: 'session',
  secret,
  duration: 24 * 60 * 60 * 1000,
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: false, sameSite: 'lax' }
});

// Build a minimal fake request/response for the middleware
const req = { headers: { cookie: `session=${cookieVal}` }, connection: {}, url: '/', method: 'GET' };
const res = {};
middleware(req, res, () => {
  if (!req.session) {
    console.error('Failed to decode session or session is empty.');
    process.exit(1);
  }
  try {
    console.log(JSON.stringify(req.session, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error serializing decoded session:', err.message);
    process.exit(1);
  }
});