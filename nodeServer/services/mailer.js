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
  try {
    const mail = {
      from: config.EMAIL_FROM,
      to: config.ADMIN_EMAIL,
      subject: `New UBHub user created: ${newUserEmail}`,
      text: buildPlainText({newUserEmail, alias, institution, title, createdAt}),
    };

    return await transporter.sendMail(mail);
  } catch (sendMailError) {
    console.error('Error sending admin notification email:', sendMailError);
  }
}

export function buildMailingListSignupPlainText({ email, alias, institution, title, region, createdAt }) {
  return `Someone has signed up for the UBHub mailing list.\n\nEmail: ${email}\nName: ${alias || ''}\nInstitution: ${institution || ''}\nTitle: ${title || ''}\nRegion: ${region || ''}\nSigned Up At: ${createdAt || new Date().toISOString()}\n`;
}

export async function sendMailingListSignupNotification({ email, alias, institution, title, region, createdAt }) {
  try {
    const mail = {
      from: config.EMAIL_FROM,
      to: config.ADMIN_EMAIL,
      subject: `New UBHub mailing list signup: ${email}`,
      text: buildMailingListSignupPlainText({ email, alias, institution, title, region, createdAt }),
    };

    return await transporter.sendMail(mail);
  } catch (sendMailError) {
    console.error('Error sending mailing list signup notification email:', sendMailError);
  }
}

export function buildPrivacyRemovalRequestPlainText({ email, alias, removalRequestedAt }) {
  return `A UBHub account holder has requested GDPR removal of their personal data.\n\nEmail: ${email}\nName: ${alias || ''}\nRequested At: ${removalRequestedAt || new Date().toISOString()}\n\nThis address is now excluded from all bulk emails. Please delete their row from the users table (and any other personal data held about them) and confirm with them once done.\n`;
}

export async function sendPrivacyRemovalRequestNotification({ email, alias, removalRequestedAt }) {
  try {
    const mail = {
      from: config.EMAIL_FROM,
      to: config.ADMIN_EMAIL,
      subject: `GDPR removal requested: ${email}`,
      text: buildPrivacyRemovalRequestPlainText({ email, alias, removalRequestedAt }),
    };

    return await transporter.sendMail(mail);
  } catch (sendMailError) {
    console.error('Error sending privacy removal request notification email:', sendMailError);
  }
}
