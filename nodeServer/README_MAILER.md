# Mailer service (admin notifications)

This project includes a mailer service used to notify the admin when a new user is created.

Configuration (environment variables)

- ADMIN_EMAIL: destination address for admin notifications (required in production)
- EMAIL_FROM: From header for outgoing mail (should be a verified identity in SES). Defaults to ADMIN_EMAIL or 'no-reply@example.com'
- EMAIL_PROVIDER: 'ses' | 'smtp' | 'ethereal' (default 'ethereal' for local development)
- SES_REGION: AWS SES region (e.g., 'us-east-1' or 'ca-central-1')
- SMTP_HOST: hostname for SMTP server
- SMTP_PORT: port for SMTP server
- SMTP_USER: SMTP username (optional)
- SMTP_PASS: SMTP password (optional)
- SMTP_SECURE: 'true' or 'false' (optional)

AWS SES notes

- In production use `EMAIL_PROVIDER=ses` and set `SES_REGION`.
- Ensure the sender specified in `EMAIL_FROM` is verified in SES (email address or domain).
- If your SES account is in the sandbox, either verify the destination address or request production access.

Example minimal IAM policy for SES SendEmail (attach to the instance role or service principal):

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}

Local testing

- Default mode is `ethereal` which uses nodemailer test accounts and prints a preview URL to the console.
- To run tests locally (from nodeServer/):

  npm install
  npm test

Deployment environment variables (example)

- ADMIN_EMAIL=admin@yourdomain.com
- EMAIL_FROM=no-reply@yourdomain.com
- EMAIL_PROVIDER=ses
- SES_REGION=us-east-1
- AWS_ACCESS_KEY_ID=...
- AWS_SECRET_ACCESS_KEY=...

Security

- Store AWS credentials in a secure secret store or use an instance role.
- Verify your sender identity in SES before sending production mail.

