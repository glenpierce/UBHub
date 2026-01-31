export class FocusTrap {
  constructor() {
    this._previouslyFocusedElement = null;
    this._container = null;
    this._focusableSelector = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable]';
    this._focusableElements = [];
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  attach(containerElement) {
    this.detach();
    if (!containerElement) return;
    this._container = containerElement;
    try { this._previouslyFocusedElement = document.activeElement; } catch (err) { this._previouslyFocusedElement = null; }
    this._updateFocusableElements();
    document.addEventListener('keydown', this._onKeyDown);

    if (this._focusableElements.length > 0) {
      try { this._focusableElements[0].focus(); } catch (err) { /* ignore */ }
    } else {
      if (!containerElement.hasAttribute('tabindex')) containerElement.setAttribute('tabindex', '-1');
      try { containerElement.focus(); } catch (err) { /* ignore */ }
    }
  }

  detach() {
    document.removeEventListener('keydown', this._onKeyDown);
    try {
      if (this._previouslyFocusedElement && document.contains(this._previouslyFocusedElement)) {
        this._previouslyFocusedElement.focus();
      } else {
        document.body && document.body.focus && document.body.focus();
      }
    } catch (err) { /* ignore */ }
    this._previouslyFocusedElement = null;
    this._container = null;
    this._focusableElements = [];
  }

  _updateFocusableElements() {
    if (!this._container) { this._focusableElements = []; return; }
    const nodeList = this._container.querySelectorAll(this._focusableSelector);
    this._focusableElements = Array.from(nodeList).filter(el => {
      try { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); } catch (err) { return false; }
    });
  }

  _onKeyDown(event) {
    if (!event) return;
    if (event.key === 'Tab') {
      if (this._focusableElements.length === 0) {
        event.preventDefault();
        if (this._container && !this._container.hasAttribute('tabindex')) this._container.setAttribute('tabindex', '-1');
        try { this._container && this._container.focus(); } catch (err) { /* ignore */ }
        return;
      }

      const first = this._focusableElements[0];
      const last = this._focusableElements[this._focusableElements.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }
  }
}

export class ApiClient {
  async post(path, payload) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || 'Request failed');
    }
    try { return await response.json(); } catch (err) { return null; }
  }
}

export class ModalRenderer {
  // Responsible for creating DOM nodes for modal forms/review views.
  buildModalForTable(manager, tableName, fieldsContainer, titleElement) {
    if (!titleElement || !fieldsContainer) return;
    titleElement.textContent = `Add New Entry to ${manager.tables[tableName]?.displayName || tableName}`;
    fieldsContainer.innerHTML = '';

    if (!tableName || !manager.tables[tableName]) {
      fieldsContainer.innerHTML = '<div class="form-row">No fields available</div>';
      return;
    }

    const columns = manager.tables[tableName].columns || [];
    const formColumns = columns.filter(column => column.name !== 'id' && column.name !== undefined);
    if (formColumns.length === 0) {
      fieldsContainer.innerHTML = '<div class="form-row">No editable fields for this table.</div>';
      return;
    }

    formColumns.forEach(column => {
      const labelText = column.label || column.name;
      const rowDiv = document.createElement('div');
      rowDiv.className = 'form-row';

      let inputId = `field_${column.name}`;
      if (column.crossReferenceTable) inputId = `search_${column.lookupColumn}`;

      const label = document.createElement('label');
      label.setAttribute('for', inputId);
      label.textContent = labelText;
      rowDiv.appendChild(label);

      if (column.crossReferenceTable) {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = `search_${column.lookupColumn}`;
        searchInput.placeholder = `Search ${labelText}`;
        searchInput.autocomplete = 'off';
        searchInput.className = 'dataManagementInput';

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = `${column.lookupColumn}`;
        hiddenInput.name = column.lookupColumn;
        hiddenInput.setAttribute('data-col-name', column.lookupColumn);

        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'typeahead-results hidden';
        resultsDiv.id = `results_${column.lookupColumn}`;

        rowDiv.appendChild(searchInput);
        rowDiv.appendChild(hiddenInput);
        rowDiv.appendChild(resultsDiv);
      } else {
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.id = `${column.name}`;
        inputElement.name = column.name;
        inputElement.setAttribute('data-col-name', column.name);
        inputElement.placeholder = `Enter ${labelText}`;
        inputElement.className = 'dataManagementInput';
        rowDiv.appendChild(inputElement);
      }

      fieldsContainer.appendChild(rowDiv);
    });
  }

  buildModalForReview(titleElement, fieldsContainer, rowData) {
    if (!titleElement || !fieldsContainer) return;
    titleElement.textContent = `Review Submission - ${rowData.operation.charAt(0).toUpperCase() + rowData.operation.slice(1)}`;
    fieldsContainer.innerHTML = '';

    let dataObject = {};
    if (rowData && rowData.data) {
      try { dataObject = (typeof rowData.data === 'string') ? JSON.parse(rowData.data) : rowData.data; }
      catch (err) { dataObject = { data: rowData.data }; }
    }

    if (!dataObject || Object.keys(dataObject).length === 0) {
      fieldsContainer.innerHTML = '<div class="form-row">No data fields available</div>';
    } else {
      for (const [key, value] of Object.entries(dataObject)) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'form-row';
        const label = document.createElement('label');
        label.setAttribute('for', `field_${key}`);
        label.textContent = key;
        rowDiv.appendChild(label);
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `${key}`;
        input.name = key;
        input.value = (value === null || value === undefined) ? '' : (typeof value === 'object' ? JSON.stringify(value) : value);
        input.setAttribute('data-col-name', key);
        input.placeholder = `Enter ${key}`;
        input.disabled = true;
        rowDiv.appendChild(input);
        fieldsContainer.appendChild(rowDiv);
      }
    }

    const commentsRow = document.createElement('div');
    commentsRow.className = 'form-row';
    const commentsLabel = document.createElement('label');
    commentsLabel.textContent = 'Comments';
    commentsLabel.setAttribute('for', 'reviewComments');
    commentsRow.appendChild(commentsLabel);
    const comments = document.createElement('textarea');
    comments.id = 'reviewComments';
    comments.name = 'reviewComments';
    comments.placeholder = 'Enter review comments (optional)';
    commentsRow.appendChild(comments);
    fieldsContainer.appendChild(commentsRow);
  }

  populateEditValues(modalFormElement, rowData, manager, currentTable) {
    if (!modalFormElement || !rowData) return;
    modalFormElement.querySelectorAll('[data-col-name]').forEach(inputElement => {
      const inputElementId = inputElement.getAttribute('id');
      if (rowData.hasOwnProperty(inputElementId)) {
        inputElement.value = rowData[inputElementId];
      } else {
        inputElement.value = '';
      }
    });

    const columns = manager.tables[currentTable].columns || [];
    columns.forEach(column => {
      if (column.crossReferenceTable && column.lookupColumn && column.joinedColumn) {
        const searchInput = document.getElementById(`search_${column.lookupColumn}`);
        const hiddenInput = document.getElementById(column.lookupColumn);
        if (hiddenInput && hiddenInput.value) {
          const titleValue = rowData[column.joinedColumn] || '';
          if (searchInput) searchInput.value = titleValue;
        } else if (rowData[column.lookupColumn]) {
          if (hiddenInput) hiddenInput.value = rowData[column.lookupColumn];
          const titleValue = rowData[column.joinedColumn] || '';
          if (searchInput) searchInput.value = titleValue;
        }
      }
    });
  }
}

export class ModalManager {
  constructor(tableManager, { apiClient = null, focusTrap = null, renderer = null } = {}) {
    this.manager = tableManager;
    this.manager.setModalManager(this);

    // DOM references
    this.modalOverlayElement = document.getElementById('modalOverlay');
    this.modalFormElement = document.getElementById('modalForm');
    this.modalFieldsElement = document.getElementById('modalFields');
    this.modalTitleElement = document.getElementById('modalTitle');
    this.profileOverlayElement = document.getElementById('modalOverlayMyProfile');

    this.reviewOverlayElement = document.getElementById('modalOverlayReview');
    this.reviewFormElement = document.getElementById('modalFormReview');
    this.reviewTitleElement = document.getElementById('modalTitleReview');
    this.approveButtonElement = document.getElementById('approveReviewButton');
    this.rejectButtonElement = document.getElementById('rejectReviewButton');
    this.closeReviewButtonElement = document.getElementById('closeReviewButton');

    // collaborators (allow injection for testing)
    this.apiClient = apiClient || new ApiClient();
    this.focusTrap = focusTrap || new FocusTrap();
    this.renderer = renderer || new ModalRenderer();

    // state
    this._currentMode = null;
    this._currentRow = null;

    // bound handlers so we can remove them in destroy()
    this._boundOnSubmit = (e) => this._onSubmit(e);
    this._boundOnOverlayClick = (event) => {
      try {
        if (event && event.target) {
          if (this.modalOverlayElement && event.target === this.modalOverlayElement) {
            this.close();
          } else if (this.profileOverlayElement && event.target === this.profileOverlayElement) {
            this.close();
          } else if (this.reviewOverlayElement && event.target === this.reviewOverlayElement) {
            this.close();
          }
        }
      } catch (err) { /* ignore */ }
    };
    this._boundOnEscapeKeyDown = (event) => {
      try {
        if (!event) return;
        const key = event.key || event.keyIdentifier || '';
        if (key === 'Escape' || key === 'Esc') {
          const modalVisible = this.modalOverlayElement && !this.modalOverlayElement.classList.contains('hidden');
          const profileVisible = this.profileOverlayElement && !this.profileOverlayElement.classList.contains('hidden');
          const reviewVisible = this.reviewOverlayElement && !this.reviewOverlayElement.classList.contains('hidden');
          if (modalVisible || profileVisible || reviewVisible) {
            event.preventDefault();
            this.close();
          }
        }
      } catch (err) { /* ignore */ }
    };

    this._boundApproveClick = () => this._submitReview('Approve');
    this._boundRejectClick = () => this._submitReview('Reject');
    this._boundCloseReviewClick = () => this.close();

    // wire form submits
    if (this.modalFormElement) {
      this.modalFormElement.addEventListener('submit', this._boundOnSubmit);
    }
    if (this.reviewFormElement) {
      this.reviewFormElement.addEventListener('submit', (e) => e.preventDefault());
    }

    if (this.approveButtonElement) {
      this.approveButtonElement.addEventListener('click', this._boundApproveClick);
    }
    if (this.rejectButtonElement) {
      this.rejectButtonElement.addEventListener('click', this._boundRejectClick);
    }
    if (this.closeReviewButtonElement) {
      this.closeReviewButtonElement.addEventListener('click', this._boundCloseReviewClick);
    }

    // overlay click handling
    if (this.modalOverlayElement) this.modalOverlayElement.addEventListener('click', this._boundOnOverlayClick);
    if (this.profileOverlayElement) this.profileOverlayElement.addEventListener('click', this._boundOnOverlayClick);
    if (this.reviewOverlayElement) this.reviewOverlayElement.addEventListener('click', this._boundOnOverlayClick);

    // add ARIA attributes to modal containers
    if (this.modalOverlayElement) {
      const modalContainer = this.modalOverlayElement.querySelector('.modal');
      if (modalContainer) {
        modalContainer.setAttribute('role', 'dialog');
        modalContainer.setAttribute('aria-modal', 'true');
        if (this.modalTitleElement && this.modalTitleElement.id) {
          modalContainer.setAttribute('aria-labelledby', this.modalTitleElement.id);
        }
      }
    }
    if (this.profileOverlayElement) {
      const profileModalContainer = this.profileOverlayElement.querySelector('.modal');
      if (profileModalContainer) {
        profileModalContainer.setAttribute('role', 'dialog');
        profileModalContainer.setAttribute('aria-modal', 'true');
        profileModalContainer.setAttribute('aria-label', 'My profile');
      }
    }
    if (this.reviewOverlayElement) {
      const reviewModalContainer = this.reviewOverlayElement.querySelector('.modal');
      if (reviewModalContainer) {
        reviewModalContainer.setAttribute('role', 'dialog');
        reviewModalContainer.setAttribute('aria-modal', 'true');
        if (this.reviewTitleElement && this.reviewTitleElement.id) {
          reviewModalContainer.setAttribute('aria-labelledby', this.reviewTitleElement.id);
        }
      }
    }

    // only handle Escape here; Tab is handled by FocusTrap when attached
    document.addEventListener('keydown', this._boundOnEscapeKeyDown);
  }

  open(mode = 'add', tableName = null, rowData = null) {
    this.modalFormElement?.reset?.();
    this.modalTitleElement && (this.modalTitleElement.textContent = '');
    this.modalFieldsElement && (this.modalFieldsElement.innerHTML = '');
    this._currentMode = mode;
    this._currentRow = rowData;

    if (mode === 'profile') {
      this.profileOverlayElement && this.profileOverlayElement.classList.remove('hidden');
      const profileModal = this.profileOverlayElement && this.profileOverlayElement.querySelector('.modal');
      if (profileModal && !profileModal.hasAttribute('aria-labelledby')) {
        const userNameEl = profileModal.querySelector('.userNameContainer');
        if (userNameEl && userNameEl.id) profileModal.setAttribute('aria-labelledby', userNameEl.id);
      }
      this.focusTrap.attach(profileModal || this.profileOverlayElement);
    } else if (mode === 'review') {
      if (this.modalOverlayElement) this.modalOverlayElement.classList.add('hidden');
      if (this.profileOverlayElement) this.profileOverlayElement.classList.add('hidden');

      // preserve existing behavior: review content is built into the main modal fields/title
      this.renderer.buildModalForReview(this.modalTitleElement, this.modalFieldsElement, rowData);
      this.reviewOverlayElement && this.reviewOverlayElement.classList.remove('hidden');
      const mainModal = this.reviewOverlayElement && this.reviewOverlayElement.querySelector('.modal');
      this.focusTrap.attach(mainModal || this.reviewOverlayElement);
    } else if (mode === 'add') {
      if (this.reviewOverlayElement) this.reviewOverlayElement.classList.add('hidden');
      if (this.profileOverlayElement) this.profileOverlayElement.classList.add('hidden');

      this.renderer.buildModalForTable(this.manager, tableName, this.modalFieldsElement, this.modalTitleElement);
      this.modalOverlayElement && this.modalOverlayElement.classList.remove('hidden');
      const mainModal = this.modalOverlayElement && this.modalOverlayElement.querySelector('.modal');
      this.focusTrap.attach(mainModal || this.modalOverlayElement);
    } else if (mode === 'edit') {
      if (this.reviewOverlayElement) this.reviewOverlayElement.classList.add('hidden');
      if (this.profileOverlayElement) this.profileOverlayElement.classList.add('hidden');

      this.renderer.buildModalForTable(this.manager, tableName, this.modalFieldsElement, this.modalTitleElement);
      this.renderer.populateEditValues(this.modalFormElement || document, rowData, this.manager, tableName);
      this.modalOverlayElement && this.modalOverlayElement.classList.remove('hidden');
      const mainModal = this.modalOverlayElement && this.modalOverlayElement.querySelector('.modal');
      this.focusTrap.attach(mainModal || this.modalOverlayElement);
    }
  }

  close() {
    this.modalOverlayElement && this.modalOverlayElement.classList.add('hidden');
    this.profileOverlayElement && this.profileOverlayElement.classList.add('hidden');
    this.reviewOverlayElement && this.reviewOverlayElement.classList.add('hidden');
    this.focusTrap.detach();
  }

  // Remove event listeners and release references to avoid memory leaks
  destroy() {
    try {
      if (this.modalFormElement) this.modalFormElement.removeEventListener('submit', this._boundOnSubmit);
      if (this.reviewFormElement) this.reviewFormElement.removeEventListener('submit', (e) => e.preventDefault());
      if (this.approveButtonElement) this.approveButtonElement.removeEventListener('click', this._boundApproveClick);
      if (this.rejectButtonElement) this.rejectButtonElement.removeEventListener('click', this._boundRejectClick);
      if (this.closeReviewButtonElement) this.closeReviewButtonElement.removeEventListener('click', this._boundCloseReviewClick);

      if (this.modalOverlayElement) this.modalOverlayElement.removeEventListener('click', this._boundOnOverlayClick);
      if (this.profileOverlayElement) this.profileOverlayElement.removeEventListener('click', this._boundOnOverlayClick);
      if (this.reviewOverlayElement) this.reviewOverlayElement.removeEventListener('click', this._boundOnOverlayClick);

      document.removeEventListener('keydown', this._boundOnEscapeKeyDown);
      this.focusTrap.detach();
      // clear manager reference
      try { if (this.manager && typeof this.manager.setModalManager === 'function') this.manager.setModalManager(null); } catch (_) { /* ignore */ }
    } catch (err) { console.error('Error destroying ModalManager', err); }
  }

  async _onSubmit(event) {
    event.preventDefault();
    if (this._currentMode === 'review') {
      alert('Please use the Approve or Reject buttons to submit a review.');
      return;
    }

    if (this._currentMode === 'add' || this._currentMode === 'edit') {
      if (!this.manager.selectedTable) { alert('No table selected.'); return; }
      const payload = {
        tableName: this.manager.selectedTable,
        rowKey: this._currentMode === 'add' ? {} : this.manager.getPrimaryKeyForSelectedTable(this._currentRow),
        operation: this._currentMode === 'add' ? 'insert' : 'update',
        data: {}
      };

      this.modalFormElement.querySelectorAll('[data-col-name]').forEach(inputElement => {
        const col = inputElement.getAttribute('data-col-name');
        payload.data[col] = inputElement.value;
      });

      try {
        await this.apiClient.post(`/dataManagement/pending-change`, payload);
        this.close();
        if (this.manager.selectedTable) await this.manager.fetchTableData(this.manager.selectedTable).then(() => this.manager.applyFiltersAndSort(this.manager.selectedTable));
      } catch (err) {
        console.error(err);
        alert('Submit error: ' + err.message);
      }

      return;
    }

    alert('Unknown modal mode: ' + this._currentMode);
  }

  async _submitReview(decision) {
    if (!this._currentRow) { alert('No review row specified.'); return; }
    const comments = document.getElementById('reviewComments')?.value || '';
    const payload = { id: this._currentRow.id, decision, comments };
    try {
      await this.apiClient.post(`/dataManagement/pending-change/review`, payload);
      this.close();
      if (this.manager.selectedTable) await this.manager.fetchTableData(this.manager.selectedTable).then(() => this.manager.applyFiltersAndSort(this.manager.selectedTable));
    } catch (err) {
      console.error(err);
      alert('Review submit error: ' + err.message);
    }
  }
}
