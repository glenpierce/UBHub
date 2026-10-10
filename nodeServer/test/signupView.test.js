import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import pug from 'pug';
import { REGION_DEFINITIONS } from '../utils/validationUtils.js';
import { SIGNUP_INTEREST_DEFINITIONS } from '../services/tableMetadata.js';

const viewPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'views', 'signup.pug');

function renderSignupView(locals) {
  return pug.renderFile(viewPath, {
    regionDefinitions: REGION_DEFINITIONS,
    signupInterestDefinitions: SIGNUP_INTEREST_DEFINITIONS,
    honeypotFieldName: 'website',
    submitted: false,
    errorMessage: '',
    formValues: {},
    ...locals,
  });
}

describe('signup view', () => {
  it('renders the form with every region option', () => {
    const html = renderSignupView();
    expect(html).toContain('action="/signup"');
    for (const regionDefinition of REGION_DEFINITIONS) {
      expect(html).toContain(`value="${regionDefinition.code}"`);
    }
  });

  it('re-fills submitted values and escapes the error message', () => {
    const html = renderSignupView({
      errorMessage: '<script>bad</script>',
      formValues: { firstName: 'Pat', lastName: 'Person', alias: 'Pat Person', email: 'pat@example.org', region: ['EU'] },
    });
    expect(html).toMatch(/id="firstName"[^>]*value="Pat"/);
    expect(html).toMatch(/id="lastName"[^>]*value="Person"/);
    expect(html).toContain('value="pat@example.org"');
    expect(html).toContain('<option value="EU" selected');
    expect(html).not.toContain('<script>bad</script>');
  });

  it('shows the GDPR privacy notice with a required, unticked consent checkbox', () => {
    const html = renderSignupView()
    expect(html).toContain('How we use your information')
    expect(html).toContain('only to send you UBHub news and updates')
    expect(html).toContain('withdraw your consent, at any time')
    const consentCheckbox = html.match(/<input[^>]*name="privacyConsent"[^>]*>/)[0]
    expect(consentCheckbox).toContain('type="checkbox"')
    expect(consentCheckbox).toContain('value="yes"')
    expect(consentCheckbox).toContain('required')
    expect(consentCheckbox).not.toContain('checked')
  });

  it('shows the three interest checkboxes, unticked, under the PM heading', () => {
    const html = renderSignupView()
    expect(html).toContain('<legend>In addition to being added to the mailing list:</legend>')
    expect(html).toContain('I am interested in partnership and collaboration opportunities as an organization.')
    expect(html).toContain('I would like to be a part of the UBHub network as an individual.')
    expect(html).toContain('I have a specific request. Please contact me.')
    const interestCheckboxes = html.match(/<input[^>]*name="interests"[^>]*>/g)
    expect(interestCheckboxes).toHaveLength(3)
    interestCheckboxes.forEach(checkbox => expect(checkbox).not.toContain('checked'))
  });

  it('keeps interest checkboxes ticked when the form is re-shown after an error', () => {
    const html = renderSignupView({ formValues: { interests: ['contactRequest'] } })
    expect(html).toMatch(/<input[^>]*value="contactRequest"[^>]*checked/)
    expect(html).not.toMatch(/<input[^>]*value="partnershipCollaboration"[^>]*checked/)
  });

  it('shows the confirmation instead of the form once submitted', () => {
    const html = renderSignupView({ submitted: true });
    expect(html).toContain('Thank you for signing up');
    expect(html).not.toContain('<form');
  });
});
