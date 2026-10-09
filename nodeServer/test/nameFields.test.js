import { describe, it, expect } from 'vitest';
import { combineNameParts, attachNameCombiner } from '../public/javascripts/nameFields.js';

describe('combineNameParts', () => {
  it.each([
    ['Pat', 'Person', 'Pat Person'],
    ['  Pat ', ' Person  ', 'Pat Person'],
    ['Pat', '', 'Pat'],
    ['Pat', undefined, 'Pat'],
    ['', 'Person', 'Person'],
    ['', '   ', ''],
    ['María José', 'García López', 'María José García López'],
  ])('combines %j and %j into %j', (firstName, lastName, expectedName) => {
    expect(combineNameParts(firstName, lastName)).toBe(expectedName);
  });
});

describe('attachNameCombiner', () => {
  function buildForm() {
    document.body.innerHTML = `
      <form>
        <input data-name-part="first" value=" Pat ">
        <input data-name-part="last" value="Person">
        <input type="hidden" name="alias">
      </form>`;
    return document.querySelector('form');
  }

  it('fills the hidden alias input on submit', () => {
    const formElement = buildForm();
    attachNameCombiner(formElement);

    formElement.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(formElement.querySelector('input[name="alias"]').value).toBe('Pat Person');
  });

  it('uses only the first name when last name is empty', () => {
    const formElement = buildForm();
    formElement.querySelector('[data-name-part="last"]').value = '';
    attachNameCombiner(formElement);

    formElement.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(formElement.querySelector('input[name="alias"]').value).toBe('Pat');
  });
});
