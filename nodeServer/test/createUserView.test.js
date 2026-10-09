import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import pug from 'pug';

const viewPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'views', 'createUser.pug');

function renderCreateUserView(locals) {
  return pug.renderFile(viewPath, { errorFromServer: false, ...locals });
}

describe('createUser view', () => {
  it('shows the account privacy notice with a required, unticked consent checkbox', () => {
    const html = renderCreateUserView();
    expect(html).toContain('How we use your information');
    expect(html).toContain('to run your account');
    expect(html).toContain('request removal from your account');
    const consentCheckbox = html.match(/<input[^>]*name="privacyConsent"[^>]*>/)[0];
    expect(consentCheckbox).toContain('required');
    expect(consentCheckbox).not.toContain('checked');
  });

  it('alerts the server error message, escaped for the inline script', () => {
    const html = renderCreateUserView({ errorFromServer: true, errorMessage: 'Bad </script><script>alert(1)' });
    expect(html).toContain('const errorMessageFromServer = "Bad \\u003c/script>\\u003cscript>alert(1)"');
    expect(html).not.toContain('</script><script>alert(1)');
  });
});
