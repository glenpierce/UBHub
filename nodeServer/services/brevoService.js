/**
 * Thin client for Brevo's transactional email API.
 *
 * Sends are always one recipient per API call — never multiple recipients in
 * a single `to` array — so that recipients of a bulk email never see each
 * other's addresses (Brevo exposes every address in `to` to every other
 * recipient in that same call).
 */

const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send one transactional email to a single recipient via Brevo.
 *
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.senderEmail
 * @param {string} [params.senderName]
 * @param {string} params.recipientEmail
 * @param {string} params.subject
 * @param {string} params.htmlContent
 * @returns {Promise<{messageId: string}>}
 * @throws {Error} when the Brevo API responds with a non-2xx status.
 */
export async function sendSingleTransactionalEmail({
  apiKey,
  senderEmail,
  senderName,
  recipientEmail,
  subject,
  htmlContent,
}) {
  const response = await fetch(BREVO_SEND_EMAIL_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName || undefined },
      to: [{ email: recipientEmail }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Brevo API error (${response.status}): ${errorBody || response.statusText}`);
  }

  return response.json();
}

/**
 * Send the same email to every recipient, one Brevo API call each. Never
 * throws — every outcome (success or failure) is captured in the returned
 * summary so a caller can always record a result for the batch.
 *
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.senderEmail
 * @param {string} [params.senderName]
 * @param {string[]} params.recipients
 * @param {string} params.subject
 * @param {string} params.htmlContent
 * @returns {Promise<{succeeded: string[], failed: Array<{email: string, error: string}>}>}
 */
export async function sendToAllRecipientsIndividually({
  apiKey,
  senderEmail,
  senderName,
  recipients,
  subject,
  htmlContent,
}) {
  const succeeded = [];
  const failed = [];

  for (const recipientEmail of recipients) {
    try {
      await sendSingleTransactionalEmail({
        apiKey,
        senderEmail,
        senderName,
        recipientEmail,
        subject,
        htmlContent,
      });
      succeeded.push(recipientEmail);
    } catch (error) {
      console.error(`Error sending email to ${recipientEmail}:`, error);
      failed.push({ email: recipientEmail, error: error.message || String(error) });
    }
  }

  return { succeeded, failed };
}
