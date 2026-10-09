/**
 * Front-end-only "First name" / "Last name" fields.
 *
 * The server only stores a single display name (users.alias), so the two
 * visible inputs are joined into a hidden `alias` input when the form is
 * submitted. Both inputs are required in the form markup (product
 * requirement); joining still tolerates an empty part.
 */

/**
 * Join name parts into one display name, ignoring empty parts.
 *
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export function combineNameParts(firstName, lastName) {
  return [firstName, lastName]
    .map(namePart => String(namePart == null ? '' : namePart).trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Fill the form's hidden alias input from its first/last name inputs on submit.
 *
 * @param {HTMLFormElement} formElement - Contains [data-name-part="first"],
 *   [data-name-part="last"] and input[name="alias"].
 */
export function attachNameCombiner(formElement) {
  const firstNameInput = formElement.querySelector('[data-name-part="first"]');
  const lastNameInput = formElement.querySelector('[data-name-part="last"]');
  const aliasInput = formElement.querySelector('input[name="alias"]');
  if (!firstNameInput || !lastNameInput || !aliasInput) return;

  formElement.addEventListener('submit', () => {
    aliasInput.value = combineNameParts(firstNameInput.value, lastNameInput.value);
  });
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('form[data-combine-name-fields]').forEach(attachNameCombiner);
}
