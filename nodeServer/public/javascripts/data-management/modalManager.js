import {fetchJson} from "./utils.js";

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
    // Exclude direct lookup columns (for example a plain `inst_id` column)
    // when a crossReference column references them via `lookupColumn`.
    // This prevents creating duplicate inputs with the same id/name (one visible and one hidden)
    // which caused the typeahead's document.getElementById lookup to target the wrong element.
    const formColumns = columns.filter(column => {
      if (!column || column.name === undefined) return false;
      if (column.name === 'id') return false;
      // If some other column is a cross-reference that uses this column as its lookupColumn,
      // skip this plain column so only the cross-reference controls (search + hidden) are built.
      const isLookupForCrossRef = columns.some(c => c && c.crossReferenceTable && c.lookupColumn === column.name);
      if (isLookupForCrossRef) return false;
      return true;
    });
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
        // Special-case document URL field: provide a text input that will hold the final
        // document URL and an adjacent file input + upload button for PDFs. The text
        // input uses `data-col-name` so existing form submission logic picks it up.
        if (column.name === 'doc_url') {
          const urlInput = document.createElement('input');
          urlInput.type = 'text';
          urlInput.id = `${column.name}`;
          urlInput.name = column.name;
          urlInput.setAttribute('data-col-name', column.name);
          urlInput.placeholder = `Enter ${labelText} or upload a PDF`;
          urlInput.className = 'dataManagementInput';
          rowDiv.appendChild(urlInput);

          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'application/pdf';
          fileInput.id = `file_${column.name}`;
          fileInput.className = 'dataManagementFileInput';
          rowDiv.appendChild(fileInput);

          const uploadButton = document.createElement('button');
          uploadButton.type = 'button';
          uploadButton.textContent = 'Upload PDF';
          uploadButton.className = 'primary';
          rowDiv.appendChild(uploadButton);

          const statusSpan = document.createElement('span');
          statusSpan.id = `status_${column.name}`;
          statusSpan.className = 'upload-status';
          statusSpan.style.marginLeft = '8px';
          rowDiv.appendChild(statusSpan);

          // Upload handler: POST to /uploads as multipart/form-data and set the returned URL
          uploadButton.addEventListener('click', async () => {
            try {
              statusSpan.textContent = '';
              if (!fileInput.files || fileInput.files.length === 0) {
                statusSpan.textContent = 'No file selected';
                return;
              }
              const file = fileInput.files[0];
              // Basic client-side validation for PDF
              const nameLower = (file.name || '').toLowerCase();
              if (!(file.type === 'application/pdf' || nameLower.endsWith('.pdf'))) {
                statusSpan.textContent = 'Only PDF files are allowed';
                return;
              }

              uploadButton.disabled = true;
              statusSpan.textContent = 'Uploading...';

              const formData = new FormData();
              formData.append('file', file);

              const uploadUrl = '/uploads';

              const resp = await fetch(uploadUrl, { method: 'POST', body: formData });
              if (!resp.ok) {
                const text = await resp.text().catch(() => 'Upload failed');
                throw new Error(text || ('HTTP ' + resp.status));
              }

              const body = await resp.json().catch(() => null);
              if (!body || !body.url) {
                throw new Error('No URL returned from upload');
              }

              // Populate the URL input so it's included in the pending-change payload
              urlInput.value = body.url;
              statusSpan.textContent = 'Uploaded';
            } catch (err) {
              console.error('Upload error:', err);
              try { statusSpan.textContent = 'Upload failed: ' + (err.message || ''); } catch (_) {}
            } finally {
              uploadButton.disabled = false;
            }
          });
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
      }

      fieldsContainer.appendChild(rowDiv);
    });
  }

  buildModalForReview(manager, titleElement, fieldsContainer, rowData) {
    // Show a side-by-side read-only comparison between the current row in the referenced
    // table and the pending change stored in `row_versions` (rowData).
    if (!titleElement || !fieldsContainer || !rowData) return;

    const operationText = String(rowData.operation || '').charAt(0).toUpperCase() + String(rowData.operation || '').slice(1);
    titleElement.textContent = `Review Submission - ${operationText}`;
    fieldsContainer.innerHTML = '';

    // Parse pending data and row key
    let pendingData = {};
    try { pendingData = (typeof rowData.data === 'string') ? JSON.parse(rowData.data) : (rowData.data || {}); }
    catch (err) { pendingData = { data: rowData.data }; }

    let rowKeyObject = {};
    try { rowKeyObject = (typeof rowData.row_key === 'string') ? JSON.parse(rowData.row_key) : (rowData.row_key || {}); }
    catch (err) { rowKeyObject = { row_key: rowData.row_key }; }

    const tableName = rowData.table_name;

    // Attempt to find the current row in the manager cache
    let currentRow = null;
    try {
      const cache = (manager && manager.tableDataCache && manager.tableDataCache[tableName]) || [];
      if (Array.isArray(cache) && Object.keys(rowKeyObject).length > 0) {
        currentRow = cache.find(r => {
          try {
            return Object.keys(rowKeyObject).every(k => {
              const a = (r && r[k] !== undefined && r[k] !== null) ? String(r[k]) : '';
              const b = (rowKeyObject[k] !== undefined && rowKeyObject[k] !== null) ? String(rowKeyObject[k]) : '';
              return a === b;
            });
          } catch (err) { return false; }
        }) || null;
      }
    } catch (err) { currentRow = null; }

    // Determine which field names to show. Prefer client-side meta if available, otherwise
    // union of keys from currentRow and pendingData.
    let fieldKeys = [];
    if (manager && manager.tables && manager.tables[tableName] && Array.isArray(manager.tables[tableName].columns)) {
      fieldKeys = manager.tables[tableName].columns
        .filter(c => c && c.name)
        .map(c => c.name);
    }

    if (!fieldKeys || fieldKeys.length === 0) {
      // fall back to keys present in data objects
      const keySet = new Set();
      if (currentRow) Object.keys(currentRow).forEach(k => keySet.add(k));
      Object.keys(pendingData || {}).forEach(k => keySet.add(k));
      fieldKeys = Array.from(keySet);
    }

    if (!fieldKeys || fieldKeys.length === 0) {
      fieldsContainer.innerHTML = '<div class="form-row">No data fields available</div>';
      return;
    }

    // Header row indicating Current vs Pending
    const headerRow = document.createElement('div');
    headerRow.className = 'form-row review-header';
    const blankHeader = document.createElement('label');
    blankHeader.className = 'review-field-label';
    blankHeader.textContent = '';
    headerRow.appendChild(blankHeader);
    const currentHeader = document.createElement('div');
    currentHeader.className = 'review-column-header';
    currentHeader.textContent = 'Current';
    headerRow.appendChild(currentHeader);
    const pendingHeader = document.createElement('div');
    pendingHeader.className = 'review-column-header';
    pendingHeader.textContent = 'Pending';
    headerRow.appendChild(pendingHeader);
    fieldsContainer.appendChild(headerRow);

    // For each field, render a label + two read-only inputs and highlight differences
    fieldKeys.forEach(key => {
      const labelText = (manager && manager.tables && manager.tables[tableName])
        ? ((manager.tables[tableName].columns || []).find(c => c && c.name === key)?.label || key)
        : key;

      const rowDiv = document.createElement('div');
      rowDiv.className = 'form-row review-compare-row';

      const label = document.createElement('label');
      label.setAttribute('for', `review_field_${key}`);
      label.textContent = labelText;
      label.className = 'review-field-label';
      rowDiv.appendChild(label);

      // Current value
      const currentValueContainer = document.createElement('div');
      currentValueContainer.className = 'review-value review-current';
      const currentInput = document.createElement('input');
      currentInput.type = 'text';
      currentInput.disabled = true;
      currentInput.id = `current_${key}`;
      const curValRaw = currentRow && Object.prototype.hasOwnProperty.call(currentRow, key) ? currentRow[key] : null;
      const currentDisplay = (curValRaw === null || curValRaw === undefined) ? '' : (typeof curValRaw === 'object' ? JSON.stringify(curValRaw) : String(curValRaw));
      currentInput.value = currentDisplay;
      currentValueContainer.appendChild(currentInput);
      rowDiv.appendChild(currentValueContainer);

      // Pending value
      const pendingValueContainer = document.createElement('div');
      pendingValueContainer.className = 'review-value review-pending';
      const pendingInput = document.createElement('input');
      pendingInput.type = 'text';
      pendingInput.disabled = true;
      pendingInput.id = `pending_${key}`;
      // pendingData may include only changed keys. If not present, for update show current value as pending (no change).
      const pendingRaw = Object.prototype.hasOwnProperty.call(pendingData, key) ? pendingData[key] : undefined;
      let pendingDisplay;
      if (pendingRaw === undefined) {
        // No change present in pending data. For delete operation, show a marker. For insert, pending contains values.
        if (rowData.operation === 'delete') {
          pendingDisplay = '(will be deleted)';
        } else {
          pendingDisplay = currentDisplay;
        }
      } else {
        pendingDisplay = (pendingRaw === null || pendingRaw === undefined) ? '' : (typeof pendingRaw === 'object' ? JSON.stringify(pendingRaw) : String(pendingRaw));
      }
      pendingInput.value = pendingDisplay;
      pendingValueContainer.appendChild(pendingInput);
      rowDiv.appendChild(pendingValueContainer);

      // Highlight if different
      const normalize = v => (v === null || v === undefined) ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      const currentNorm = normalize(curValRaw);
      const pendingNorm = normalize(pendingRaw === undefined ? (rowData.operation === 'delete' ? '(will be deleted)' : curValRaw) : pendingRaw);
      if (currentNorm !== pendingNorm) {
        pendingValueContainer.classList.add('changed');
        pendingInput.classList.add('changed');
        // mark the entire row as changed for row-level highlighting/alignment
        rowDiv.classList.add('changed');
      }

      fieldsContainer.appendChild(rowDiv);

      if (key === 'inst_id' && pendingRaw) {
        fetchJson(`/dataManagement/getLocationById/${pendingRaw}`)
          .then(data => {
            console.log(data);
            const instTitle = data.inst_title;
            if (instTitle) {
              const titleSpan = document.createElement('span');
              titleSpan.className = 'related-record-title';
              titleSpan.textContent = ` (${instTitle})`;
              pendingValueContainer.appendChild(titleSpan);
            }
        });
      }
    });

    // Comments area (editable for reviewer)
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
    this.profileFormElement = document.getElementById('modalFormMyProfile');

    this.reviewOverlayElement = document.getElementById('modalOverlayReview');
    this.reviewFormElement = document.getElementById('modalFormReview');
    this.reviewTitleElement = document.getElementById('modalTitleReview');
    // Capture the review-specific fields container so review rendering goes into the correct DOM node
    this.reviewFieldsElement = document.getElementById('modalFieldsReview');
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
    this._boundOnProfileSubmit = (e) => this._onProfileSubmit(e);
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
    // Use a bound no-op submit handler for the review form so we can remove it later in destroy()
    this._boundReviewFormSubmit = (e) => { e.preventDefault(); };

    // wire form submits
    if (this.modalFormElement) {
      this.modalFormElement.addEventListener('submit', this._boundOnSubmit);
    }
    if (this.profileFormElement) {
      this.profileFormElement.addEventListener('submit', this._boundOnProfileSubmit);
    }
    if (this.reviewFormElement) {
      this.reviewFormElement.addEventListener('submit', this._boundReviewFormSubmit);
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

  async open(mode = 'add', tableName = null, rowData = null) {
    this.modalFormElement?.reset?.();
    this.modalTitleElement && (this.modalTitleElement.textContent = '');
    this.modalFieldsElement && (this.modalFieldsElement.innerHTML = '');
    this._currentMode = mode;
    this._currentRow = rowData;

    if (mode === 'profile') {
      this.profileOverlayElement && this.profileOverlayElement.classList.remove('hidden');
      const profileModal = this.profileOverlayElement && this.profileOverlayElement.querySelector('.modal');
      // Populate profile form fields from server-provided config or by fetching current user data
      try {
        // Prefer config on window if available
        const cfg = window.dataManagementConfigFromServer || {};
        const currentUser = cfg.user || null;
        if (this.profileFormElement && currentUser) {
          // common field ids: alias, userAddress, title, institution, whatsAppNumber, primaryContact
          ['alias','userAddress','title','institution','whatsAppNumber','primaryContact'].forEach(id => {
            try { const el = document.getElementById(id); if (el) el.value = currentUser[id] || '';} catch(_) {}
          });
        } else if (this.profileFormElement && this.apiClient) {
          // attempt to fetch profile from server
          try {
            const profile = await this.apiClient.post('/account/me', {});
            if (profile) {
              ['alias','userAddress','title','institution','whatsAppNumber','primaryContact'].forEach(id => {
                try { const el = document.getElementById(id); if (el) el.value = profile[id] || '';} catch(_) {}
              });
            }
          } catch (err) { /* ignore fetch error, form stays blank */ }
        }
      } catch (err) { /* ignore */ }

      this.focusTrap.attach(profileModal || this.profileOverlayElement);
    } else if (mode === 'review') {
      if (this.modalOverlayElement) this.modalOverlayElement.classList.add('hidden');
      if (this.profileOverlayElement) this.profileOverlayElement.classList.add('hidden');

      // Ensure we have up-to-date rows for the referenced table so we can show current values
      try {
        const targetTable = rowData && rowData.table_name ? rowData.table_name : tableName;
        if (targetTable && this.manager && typeof this.manager.fetchTableData === 'function') {
          const cached = this.manager.tableDataCache && this.manager.tableDataCache[targetTable];
          if (!Array.isArray(cached) || cached.length === 0) {
            await this.manager.fetchTableData(targetTable);
          }
        }
      } catch (err) { /* ignore fetch errors, we'll still render what we can */ }

      // Build review UI into the review-specific title/fields when available. Fall back to main modal nodes
      // to preserve backward compatibility with older templates.
      this.renderer.buildModalForReview(
        this.manager,
        this.reviewTitleElement || this.modalTitleElement,
        this.reviewFieldsElement || this.modalFieldsElement,
        rowData
      );

      // Hide approve/reject buttons if this submission has already been decided (approved or rejected).
      // Check a few possible indicators: explicit `status` (non-pending), or presence of approved_by/approved_at.
      try {
        const statusRaw = rowData && Object.prototype.hasOwnProperty.call(rowData, 'status') ? rowData.status : null;
        const statusNormalized = statusRaw ? String(statusRaw).trim().toLowerCase() : '';
        const alreadyDecided = (statusNormalized && statusNormalized !== 'pending') || !!(rowData && (rowData.approved_by || rowData.approved_at));
        if (this.approveButtonElement) {
          if (alreadyDecided) this.approveButtonElement.classList.add('hidden'); else this.approveButtonElement.classList.remove('hidden');
        }
        if (this.rejectButtonElement) {
          if (alreadyDecided) this.rejectButtonElement.classList.add('hidden'); else this.rejectButtonElement.classList.remove('hidden');
        }
      } catch (err) { /* ignore UI toggling errors */ }

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
      if (this.profileFormElement) this.profileFormElement.removeEventListener('submit', this._boundOnProfileSubmit);
      if (this.reviewFormElement) this.reviewFormElement.removeEventListener('submit', this._boundReviewFormSubmit);
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
        if (this.manager && this.manager.selectedTable) await this.manager.fetchTableData(this.manager.selectedTable).then(() => this.manager.applyFiltersAndSort(this.manager.selectedTable));
      } catch (err) {
        console.error(err);
        alert('Submit error: ' + err.message);
      }

      return;
    }

    alert('Unknown modal mode: ' + this._currentMode);
  }

  async _onProfileSubmit(event) {
    event.preventDefault();
    if (!this.profileFormElement) return;
    const payload = {};
    ['alias','userAddress','title','institution','whatsAppNumber','primaryContact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) payload[id] = el.value;
    });

    try {
      await this.apiClient.post('/account/update', payload);
      this.close();
      // Refresh user display alias if present on the page
      try {
        const aliasEl = document.getElementById('userAlias');
        if (aliasEl && payload.alias) aliasEl.textContent = 'Hello, ' + payload.alias;
      } catch (err) { /* ignore */ }
    } catch (err) {
      console.error('Profile update failed', err);
      alert('Profile update failed: ' + err.message);
    }
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
