# Mailer service (admin notifications)

This project includes a mailer service used to notify the admin when a new user is created.

Configuration (environment variables)

- ADMIN_EMAIL: destination address for admin notifications (required in production)
- EMAIL_FROM: From header for outgoing mail (should be the same as ADMIN_EMAIL for Gmail)
- EMAIL_PROVIDER: 'smtp'
- SMTP_HOST: hostname for SMTP server (default: smtp.gmail.com)
- SMTP_PORT: port for SMTP server (default: 587)
- SMTP_USER: SMTP username (your Gmail address)
- SMTP_PASS: SMTP password (use a Google App Password)
- SMTP_SECURE: 'true' or 'false' (optional)

Gmail setup (quick)

1. Use the Google account as both the sending address and the admin address.
2. Enable 2-Step Verification for the account.
3. Create an App Password in Google Account > Security > App passwords. Use that App Password as `SMTP_PASS`.

Example production environment variables (do NOT commit these to source control)

- NODE_ENV=production
- EMAIL_PROVIDER=smtp
- ADMIN_EMAIL=ubhubAdmin@gmail.com
- EMAIL_FROM=ubhubAdmin@gmail.com
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER=ubhubAdmin@gmail.com
- SMTP_PASS=<your-app-password-here>
- SMTP_SECURE=false

Security

- Store the Gmail App Password in a secure secret store. Do not commit it to source control.
- App Passwords require 2-Step Verification and are recommended for this simple setup.
