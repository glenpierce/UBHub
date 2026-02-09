import nodemailer from 'nodemailer';
import config from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: Boolean(config.SMTP_SECURE),
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

function buildPlainText({ newUserEmail, alias, institution, title, createdAt }) {
  return `A new user has been created in UBHub.\n\nEmail: ${newUserEmail}\nAlias: ${alias || ''}\nInstitution: ${institution || ''}\nTitle: ${title || ''}\nCreated At: ${createdAt || new Date().toISOString()}\n`;
}

export async function sendAdminNotification({ newUserEmail, alias, institution, title, createdAt }) {
  const mail = {
    from: config.EMAIL_FROM,
    to: config.ADMIN_EMAIL,
    subject: `New UBHub user created: ${newUserEmail}`,
    text: buildPlainText({ newUserEmail, alias, institution, title, createdAt }),
  };

  return transporter.sendMail(mail);
}
