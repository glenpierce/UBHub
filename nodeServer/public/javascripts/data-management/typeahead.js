import { fetchJson, debounce } from './utils.js';

export class Typeahead {
  constructor({inputElement, resultsElement, searchUrl, onSelect}) {
    this.inputElement = inputElement;
    this.resultsElement = resultsElement;
    this.searchUrl = searchUrl;
    this.onSelect = onSelect;
    this.initialize();
  }
  initialize() {
    this.inputElement.addEventListener('input', debounce((event) => this.onInput(event), 200));
  }
  onInput(event) {
    const queryValue = event.target.value;
    if (!queryValue || queryValue.length < 2) {
      this.resultsElement.classList.add('hidden');
      this.resultsElement.innerHTML = '';
      return;
    }
    const encodedQuery = encodeURIComponent(queryValue);
    fetchJson(`${this.searchUrl}?query=${encodedQuery}`)
      .then(list => {
        this.resultsElement.innerHTML = '';
        if (!list || !list.length) {
          this.resultsElement.classList.add('hidden');
          return;
        }
        list.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'typeahead-item';
          itemDiv.textContent = item.inst_title || item.doc_title || item.title || item.name || item.id;
          itemDiv.addEventListener('click', () => {
            this.onSelect(item);
            this.resultsElement.classList.add('hidden');
          });
          this.resultsElement.appendChild(itemDiv);
        });
        this.resultsElement.classList.remove('hidden');
      })
      .catch(err => console.error('Typeahead search failed', err));
  }
}
