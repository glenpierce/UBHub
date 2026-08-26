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

  const result = await response.json();
  console.log(`[Brevo] sent to ${recipientEmail} (messageId=${result && result.messageId})`);
  console.log(result);
  return result;
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

  console.log(`[Brevo] starting send for "${subject}" to ${recipients.length} recipient(s)`);
  if (!apiKey) {
    console.warn('[Brevo] BREVO_API_KEY is not configured — every send below will fail');
  }

  for (const recipientEmail of recipients) {
    try {
      console.log(`[Brevo] (${succeeded.length + failed.length + 1}/${recipients.length}) sending to ${recipientEmail}...`);
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
      console.error(`[Brevo] (${succeeded.length + failed.length + 1}/${recipients.length}) failed to send to ${recipientEmail}:`, error);
      failed.push({ email: recipientEmail, error: error.message || String(error) });
    }
  }

  console.log(`[Brevo] finished send for "${subject}": ${succeeded.length} succeeded, ${failed.length} failed`);

  return { succeeded, failed };
}
