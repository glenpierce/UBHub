import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import pug from 'pug';
import { REGION_DEFINITIONS } from '../utils/validationUtils.js';

const viewPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'views', 'signup.pug');

function renderSignupView(locals) {
  return pug.renderFile(viewPath, {
    regionDefinitions: REGION_DEFINITIONS,
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
      formValues: { alias: 'Pat', email: 'pat@example.org', region: ['EU'] },
    });
    expect(html).toContain('value="Pat"');
    expect(html).toContain('value="pat@example.org"');
    expect(html).toContain('<option value="EU" selected');
    expect(html).not.toContain('<script>bad</script>');
  });

  it('shows the confirmation instead of the form once submitted', () => {
    const html = renderSignupView({ submitted: true });
    expect(html).toContain('Thank you for signing up');
    expect(html).not.toContain('<form');
  });
});
