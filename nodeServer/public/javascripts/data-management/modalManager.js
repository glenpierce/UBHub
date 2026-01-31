export class ModalManager {
  constructor(tableManager) {
    this.manager = tableManager;
    this.manager.setModalManager(this);
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

    this._previouslyFocusedElement = null;
    this._focusableSelectors = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable]';
    this._focusableElements = [];

    if (this.modalFormElement) {
      this.modalFormElement.addEventListener('submit', (e) => this._onSubmit(e));
    }

    if (this.reviewFormElement) {
      this.reviewFormElement.addEventListener('submit', (e) => e.preventDefault());
    }
    if (this.approveButtonElement) {
      this.approveButtonElement.addEventListener('click', () => this._submitReview('Approve'));
    }
    if (this.rejectButtonElement) {
      this.rejectButtonElement.addEventListener('click', () => this._submitReview('Reject'));
    }
    if (this.closeReviewButtonElement) {
      this.closeReviewButtonElement.addEventListener('click', () => this.close());
    }

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

    this._boundOnKeyDown = (event) => {
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
          return;
        }

        if (key === 'Tab') {
          const activeOverlay = (this.modalOverlayElement && !this.modalOverlayElement.classList.contains('hidden')) ? this.modalOverlayElement
                                : (this.profileOverlayElement && !this.profileOverlayElement.classList.contains('hidden')) ? this.profileOverlayElement
                                : (this.reviewOverlayElement && !this.reviewOverlayElement.classList.contains('hidden')) ? this.reviewOverlayElement
                                : null;
          if (!activeOverlay) return;

          const modalElement = activeOverlay.querySelector('.modal');
          if (!modalElement) return;

          this._updateFocusableElements(modalElement);
          if (this._focusableElements.length === 0) {
            event.preventDefault();
            if (!modalElement.hasAttribute('tabindex')) modalElement.setAttribute('tabindex', '-1');
            modalElement.focus();
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
      } catch (err) { /* ignore */ }
    };

    if (this.modalOverlayElement) {
      this.modalOverlayElement.addEventListener('click', this._boundOnOverlayClick);
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
      this.profileOverlayElement.addEventListener('click', this._boundOnOverlayClick);
      const profileModalContainer = this.profileOverlayElement.querySelector('.modal');
      if (profileModalContainer) {
        profileModalContainer.setAttribute('role', 'dialog');
        profileModalContainer.setAttribute('aria-modal', 'true');
        profileModalContainer.setAttribute('aria-label', 'My profile');
      }
    }

    if (this.reviewOverlayElement) {
      this.reviewOverlayElement.addEventListener('click', this._boundOnOverlayClick);
      const reviewModalContainer = this.reviewOverlayElement.querySelector('.modal');
      if (reviewModalContainer) {
        reviewModalContainer.setAttribute('role', 'dialog');
        reviewModalContainer.setAttribute('aria-modal', 'true');
        if (this.reviewTitleElement && this.reviewTitleElement.id) {
          reviewModalContainer.setAttribute('aria-labelledby', this.reviewTitleElement.id);
        }
      }
    }

    document.addEventListener('keydown', this._boundOnKeyDown);
  }

  _updateFocusableElements(modalElement) {
    if (!modalElement) { this._focusableElements = []; return; }
    const nodeList = modalElement.querySelectorAll(this._focusableSelectors);
    this._focusableElements = Array.from(nodeList).filter(el => {
      try { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); } catch (err) { return false; }
    });
  }

  _savePreviouslyFocused() { try { this._previouslyFocusedElement = document.activeElement; } catch (err) { this._previouslyFocusedElement = null; } }
  _restoreFocus() {
    try {
      if (this._previouslyFocusedElement && document.contains(this._previouslyFocusedElement)) {
        this._previouslyFocusedElement.focus();
      } else {
        document.body && document.body.focus && document.body.focus();
      }
    } catch (err) { /* ignore */ }
    this._previouslyFocusedElement = null;
  }

  _focusFirstElementIn(modalElement) {
    if (!modalElement) return;
    this._updateFocusableElements(modalElement);
    if (this._focusableElements.length > 0) {
      try { this._focusableElements[0].focus(); } catch (err) { /* ignore */ }
    } else {
      if (!modalElement.hasAttribute('tabindex')) modalElement.setAttribute('tabindex', '-1');
      try { modalElement.focus(); } catch (err) { /* ignore */ }
    }
  }

  open(mode = 'add', tableName = null, rowData = null) {
    this.modalFormElement?.reset?.();
    this.modalTitleElement && (this.modalTitleElement.textContent = '');
    this.modalFieldsElement && (this.modalFieldsElement.innerHTML = '');
    this._currentMode = mode;
    this._currentTable = tableName;
    this._currentRow = rowData;

    this._savePreviouslyFocused();

    if (mode === 'profile') {
      this.profileOverlayElement && this.profileOverlayElement.classList.remove('hidden');
      const profileModal = this.profileOverlayElement && this.profileOverlayElement.querySelector('.modal');
      if (profileModal && !profileModal.hasAttribute('aria-labelledby')) {
        const userNameEl = profileModal.querySelector('.userNameContainer');
        if (userNameEl && userNameEl.id) profileModal.setAttribute('aria-labelledby', userNameEl.id);
      }
      this._focusFirstElementIn(profileModal || this.profileOverlayElement);
    } else if (mode === 'review') {
      if (this.modalOverlayElement) this.modalOverlayElement.classList.add('hidden');
      if (this.profileOverlayElement) this.profileOverlayElement.classList.add('hidden');

      this.buildModalForReview(rowData);
      this.reviewOverlayElement && this.reviewOverlayElement.classList.remove('hidden');
      const mainModal = this.reviewOverlayElement && this.reviewOverlayElement.querySelector('.modal');
      this._focusFirstElementIn(mainModal || this.reviewOverlayElement);
    } else if (mode === 'add') {
      if (this.reviewOverlayElement) this.reviewOverlayElement.classList.add('hidden');
      if (this.profileOverlayElement) this.profileOverlayElement.classList.add('hidden');

      this.buildModalForTable(tableName);
      this.modalOverlayElement && this.modalOverlayElement.classList.remove('hidden');
      const mainModal = this.modalOverlayElement && this.modalOverlayElement.querySelector('.modal');
      this._focusFirstElementIn(mainModal || this.modalOverlayElement);
    } else if (mode === 'edit') {
      if (this.reviewOverlayElement) this.reviewOverlayElement.classList.add('hidden');
      if (this.profileOverlayElement) this.profileOverlayElement.classList.add('hidden');

      this.buildModalForTable(tableName);
      this._populateEditValues(rowData);
      this.modalOverlayElement && this.modalOverlayElement.classList.remove('hidden');
      const mainModal = this.modalOverlayElement && this.modalOverlayElement.querySelector('.modal');
      this._focusFirstElementIn(mainModal || this.modalOverlayElement);
    }
  }

  close() {
    this.modalOverlayElement && this.modalOverlayElement.classList.add('hidden');
    this.profileOverlayElement && this.profileOverlayElement.classList.add('hidden');
    this.reviewOverlayElement && this.reviewOverlayElement.classList.add('hidden');
    this._restoreFocus();
  }

  _populateEditValues(rowData) {
    if (!this.modalFormElement || !rowData) return;
    this.modalFormElement.querySelectorAll('[data-col-name]').forEach(inputElement => {
      const inputElementId = inputElement.getAttribute('id');
      if (rowData.hasOwnProperty(inputElementId)) {
        inputElement.value = rowData[inputElementId];
      } else {
        inputElement.value = '';
      }
    });

    const columns = this.manager.tables[this._currentTable].columns || [];
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

  buildModalForReview(rowData) {
    if (!this.modalTitleElement || !this.modalFieldsElement) return;
    this.modalTitleElement.textContent = `Review Submission - ${rowData.operation.charAt(0).toUpperCase() + rowData.operation.slice(1)}`;
    this.modalFieldsElement.innerHTML = '';

    let dataObject = {};
    if (rowData && rowData.data) {
      try { dataObject = (typeof rowData.data === 'string') ? JSON.parse(rowData.data) : rowData.data; }
      catch (err) { dataObject = {data: rowData.data}; }
    }

    if (!dataObject || Object.keys(dataObject).length === 0) {
      this.modalFieldsElement.innerHTML = '<div class="form-row">No data fields available</div>';
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
        this.modalFieldsElement.appendChild(rowDiv);
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
    this.modalFieldsElement.appendChild(commentsRow);
  }

  buildModalForTable(tableName) {
    if (!this.modalTitleElement || !this.modalFieldsElement) return;
    this.modalTitleElement.textContent = `Add New Entry to ${this.manager.tables[tableName]?.displayName || tableName}`;
    this.modalFieldsElement.innerHTML = '';
    this._currentTable = tableName;
    this._currentMode = 'add';

    if (!tableName || !this.manager.tables[tableName]) {
      this.modalFieldsElement.innerHTML = '<div class="form-row">No fields available</div>';
      return;
    }

    const columns = this.manager.tables[tableName].columns || [];
    const formColumns = columns.filter(column => column.name !== 'id' && column.name !== undefined);
    if (formColumns.length === 0) {
      this.modalFieldsElement.innerHTML = '<div class="form-row">No editable fields for this table.</div>';
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

        // setup typeahead will be wired by init layer
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

      this.modalFieldsElement.appendChild(rowDiv);
    });
  }

  _onSubmit(event) {
    event.preventDefault();
    if (this._currentMode === 'review') {
      // Reviews should be submitted via the Approve/Reject buttons.
      // Prevent accidental form submissions and avoid using an undefined `decision` variable.
      alert('Please use the Approve or Reject buttons to submit a review.');
      return;
    }

    if (this._currentMode === 'add' || this._currentMode === 'edit') {
      if (!this.manager.selectedTable) { alert('No table selected.'); return; }
      const payload = { tableName: this.manager.selectedTable, rowKey: this._currentMode === 'add' ? {} : this.manager.getPrimaryKeyForSelectedTable(this._currentRow), operation: this._currentMode === 'add' ? 'insert' : 'update', data: {} };
      this.modalFormElement.querySelectorAll('[data-col-name]').forEach(inputElement => {
        payload.data[inputElement.dataset.colName] = inputElement.value;
      });

      fetch(`/dataManagement/pending-change`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) })
        .then(response => { if (!response.ok) throw new Error('Submit failed'); return response.json(); })
        .then(() => { this.close(); if (this.manager.selectedTable) this.manager.fetchTableData(this.manager.selectedTable).then(() => this.manager.applyFiltersAndSort(this.manager.selectedTable)); })
        .catch(err => { console.error(err); alert('Submit error: ' + err.message); });

      return;
    }

    alert('Unknown modal mode: ' + this._currentMode);
  }

  _submitReview(decision) {
    if (!this._currentRow) { alert('No review row specified.'); return; }
    const comments = document.getElementById('reviewComments')?.value || '';
    const payload = { id: this._currentRow.id, decision, comments };
    fetch(`/dataManagement/pending-change/review`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
    }).then(response => {
      if (!response.ok) throw new Error('Review submit failed');
      return response.json();
    }).then(() => {
      this.close();
      if (this.manager.selectedTable) this.manager.fetchTableData(this.manager.selectedTable).then(() => this.manager.applyFiltersAndSort(this.manager.selectedTable));
    }).catch(err => { console.error(err); alert('Review submit error: ' + err.message); });
  }
}
