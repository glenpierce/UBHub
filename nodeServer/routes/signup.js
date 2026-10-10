import express from 'express';
const router = express.Router();
import { makeDbCallAsPromise } from '../ConnectionPool.js';
import { createMailingListSignup } from '../services/mailingListSignupService.js';
import { sendMailingListSignupNotification } from '../services/mailer.js';
import { REGION_DEFINITIONS } from '../utils/validationUtils.js';
import { SIGNUP_INTEREST_DEFINITIONS } from '../services/tableMetadata.js';

// Hidden form field that humans never fill in; bots that auto-fill every
// input do. A filled honeypot gets the normal success page but no DB write.
const HONEYPOT_FIELD_NAME = 'website';

function renderSignupPage(response, { statusCode = 200, submitted = false, errorMessage = '', formValues = {} } = {}) {
  response.status(statusCode).render('signup', {
    regionDefinitions: REGION_DEFINITIONS,
    signupInterestDefinitions: SIGNUP_INTEREST_DEFINITIONS,
    honeypotFieldName: HONEYPOT_FIELD_NAME,
    submitted,
    errorMessage,
    formValues,
  });
}

router.get('/', function(request, response) {
  renderSignupPage(response);
});

router.post('/', async function(request, response) {
  const formValues = request.body || {};

  if (formValues[HONEYPOT_FIELD_NAME]) {
    console.log('Mailing list signup ignored: honeypot field was filled');
    renderSignupPage(response, { submitted: true });
    return;
  }

  try {
    const { created, signup } = await createMailingListSignup(makeDbCallAsPromise, formValues);

    // The same confirmation is shown whether or not the email was already on
    // file, so this public form can't be used to probe which emails exist.
    renderSignupPage(response, { submitted: true });

    if (created) {
      console.log('Mailing list signup created:', signup.email);
      sendMailingListSignupNotification({
        ...signup,
        selectedInterestLabels: SIGNUP_INTEREST_DEFINITIONS
          .filter(interestDefinition => signup.interests[interestDefinition.key])
          .map(interestDefinition => interestDefinition.formLabel),
        contactRequested: signup.interests.contactRequest === true,
        createdAt: new Date().toISOString(),
      });
    } else {
      console.log('Mailing list signup skipped, email already exists in users:', signup.email);
    }
  } catch (error) {
    if (error.code === 'INVALID_SIGNUP') {
      renderSignupPage(response, { statusCode: 400, errorMessage: error.message, formValues });
      return;
    }
    console.error('Error creating mailing list signup:', error);
    renderSignupPage(response, {
      statusCode: 500,
      errorMessage: 'Something went wrong while signing you up. Please try again later.',
      formValues,
    });
  }
});

export default router;
