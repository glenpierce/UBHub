import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import config from '../config.js';

async function sendWithSes(payload) {
  const params = {
    Destination: { ToAddresses: [config.ADMIN_EMAIL] },
    Message: {
      Body: {
        Text: {
          Data: buildPlainText(payload),
        },
      },
      Subject: { Data: `New UBHub user created: ${payload.newUserEmail}` },
    },
    Source: config.EMAIL_FROM,
  };

  const command = new SendEmailCommand(params);
  await new SESClient({ region: config.SES_REGION }).send(command);
}

function buildPlainText({ newUserEmail, alias, institution, title, createdAt }) {
  return `A new user has been created in UBHub.\n\nEmail: ${newUserEmail}\nAlias: ${alias || ''}\nInstitution: ${institution || ''}\nTitle: ${title || ''}\nCreated At: ${createdAt || new Date().toISOString()}\n`;
}

async function createSmtpTransport() {
  if (config.EMAIL_PROVIDER === 'ethereal') {
    // createTestAccount will be used in tests; here we handle it defensively
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: Boolean(config.SMTP_SECURE),
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  });
}

async function sendWithSmtp(payload) {
  const transporter = await createSmtpTransport();

  const mail = {
    from: config.EMAIL_FROM,
    to: config.ADMIN_EMAIL,
    subject: `New UBHub user created: ${payload.newUserEmail}`,
    text: buildPlainText(payload),
  };

  const info = await transporter.sendMail(mail);

  // If using Ethereal, log the preview URL
  if (nodemailer.getTestMessageUrl) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Ethereal preview URL for admin notification:', previewUrl);
    }
  }
}

export async function sendAdminNotification({ newUserEmail, alias, institution, title, createdAt }) {
  const payload = { newUserEmail, alias, institution, title, createdAt };

  try {
    if (config.EMAIL_PROVIDER === 'ses') {
      await sendWithSes(payload);
      console.log('Admin notification sent via SES for', newUserEmail);
      return;
    }

    // default to SMTP/provider
    await sendWithSmtp(payload);
    console.log('Admin notification sent via SMTP for', newUserEmail);
  } catch (error) {
    console.error('Failed to send admin notification for', newUserEmail, error);
  }
}
