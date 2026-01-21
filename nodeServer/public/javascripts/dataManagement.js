/*
  dataManagement.js
  ES module that implements a class-based refactor of the data-management frontend.
  - No build step. Loaded via <script type="module"> from the pug view.
  - Reads server-provided `window.dataManagementConfigFromServer` object.

  Classes:
  - TableManager: holds state and performs fetches, filtering, sorting.
  - TableView: renders DOM and wires UI controls.
  - ModalManager: builds modals for add/edit/review and handles submits.
  - Typeahead: small reusable debounced typeahead for cross-reference fields.
  - RendererRegistry: register and look up renderers by name.

  This file aims to preserve existing behavior and server endpoints.
*/

// Small utilities
function fetchJson(url, options = {}) {
  return fetch(url, options).then(response => {
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
    return response.json();
  });
}

function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function zeroPad(number, length = 2) {
  return String(number).padStart(length, '0');
}

function formatDateTime(date) {
  if (!(date instanceof Date)) return '';
  const timestamp = date.getTime();
  if (isNaN(timestamp)) return '';
  const year = date.getFullYear();
  const month = zeroPad(date.getMonth() + 1);
  const day = zeroPad(date.getDate());
  const hours = zeroPad(date.getHours());
  const minutes = zeroPad(date.getMinutes());
  const seconds = zeroPad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Renderer registry
class RendererRegistry {
  constructor() {
    this.registryMap = new Map();
  }
  register(name, rendererFunction) {
    this.registryMap.set(name, rendererFunction);
  }
  get(name) {
    return this.registryMap.get(name);
  }
}

// Typeahead helper for cross-reference search inputs
class Typeahead {
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

// TableManager: state + data operations
class TableManager {
  constructor({tables = {}, navMenu = []}) {
    this.tables = tables;
    this.navMenu = navMenu;

    this.selectedTable = null;
    this.tableDataCache = {}; // raw rows by tableName

    this.globalSearchQuery = '';
    this.columnFilter = {columnName: null, filterValue: ''};
    this.sortState = {columnName: null, direction: 'asc'};

    // will be set after view/modal created
    this.tableView = null;
    this.modalManager = null;
    this.rendererRegistry = new RendererRegistry();

    // register default renderers
    this._registerBuiltInRenderers();

    // action handler map (string keys from server -> function)
    this.actionHandlerMap = {
      openReviewModal: (rowData) => this.modalManager && this.modalManager.open('review', null, rowData),
      openEditUserModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'users', rowData),
      openEditProgramModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'mapButtons', rowData),
      openEditLocationModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'locations', rowData),
      openEditDocumentModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'documents', rowData),
      openEditProgramParticipationModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'participation', rowData),
      openMyProfileModal: () => this.modalManager && this.modalManager.open('profile'),
      // open the map overlay iframe so users remain on the data-management page
      openMap: () => {
        const mapContainer = document.getElementById('mapContainer');
        const mapIframe = document.getElementById('mapIframe');
        // set src only when opening to avoid unnecessary loads
        if (mapIframe) mapIframe.src = '/map';
        // show the map overlay
        if (mapContainer) mapContainer.classList.remove('hidden');
        // hide the main table area so the map takes focus
        try {
          const tableContainer = document.querySelector('.table-container');
          if (tableContainer) tableContainer.classList.add('hidden');
        } catch (err) { /* ignore */ }
        // ensure filters are hidden while map is open
        if (this.tableView && typeof this.tableView._setFilterVisibility === 'function') {
          this.tableView._setFilterVisibility(false);
        }
      }
    };
  }

  _registerBuiltInRenderers() {
    this.rendererRegistry.register('nameRenderer', (rowData, tableCell) => {
      tableCell.textContent = rowData.alias || '';
      tableCell.classList.add('nameCell');
    });

    this.rendererRegistry.register('privilegeRenderer', (rowData, tableCell) => {
      let privilegeLevel = Number(rowData.privileges);
      let styleClass;
      let displayText;
      switch (privilegeLevel) {
        case 0:
        case 1:
          displayText = 'User';
          styleClass = 'userRole';
          break;
        case 2:
          displayText = 'Contributor';
          styleClass = 'contributorRole';
          break;
        case 3:
          displayText = 'Lead';
          styleClass = 'leadRole';
          break;
        case 4:
          displayText = 'Executive';
          styleClass = 'executiveRole';
          break;
        default:
          displayText = 'User';
          styleClass = 'userRole';
      }
      const label = document.createElement('div');
      label.className = styleClass;
      label.textContent = displayText;
      tableCell.appendChild(label);
    });

    this.rendererRegistry.register('statusRenderer', (rowData, tableCell) => {
      const status = rowData.status;
      tableCell.textContent = status || 'Unknown';
      tableCell.classList.remove('status-active', 'status-inactive');
      if (status === 'Active') tableCell.classList.add('status-active');
      else if (status === 'Inactive') tableCell.classList.add('status-inactive');
    });

    this.rendererRegistry.register('submissionStatusRenderer', (rowData, tableCell) => {
      const statusRaw = (rowData.status || '').toString();
      const status = statusRaw.trim();
      let styleClass = 'unknownStatus';
      let displayText = status || 'Unknown';

      const lower = status.toLowerCase();
      if (lower === 'approved' || lower === 'approve') {
        styleClass = 'approvedStatus';
        displayText = 'Approved';
      } else if (lower === 'rejected' || lower === 'reject') {
        styleClass = 'rejectedStatus';
        displayText = 'Rejected';
      } else if (lower === 'pending' || lower === 'submitted' || lower === 'awaiting') {
        styleClass = 'pendingStatus';
        displayText = 'Pending';
      } else if (status) {
        displayText = status.charAt(0).toUpperCase() + status.slice(1);
      }

      const label = document.createElement('div');
      label.className = styleClass;
      label.textContent = displayText;
      tableCell.appendChild(label);
    });

    this.rendererRegistry.register('assignRenderer', (rowData, tableCell) => {
      const assignedTo = rowData.assignedTo;
      tableCell.textContent = assignedTo || 'Unassigned';
    });

    this.rendererRegistry.register('lastActiveRenderer', (rowData, tableCell) => {
      const lastActive = rowData.lastActive;
      if (lastActive) {
        const date = new Date(lastActive);
        tableCell.textContent = isNaN(date.getTime()) ? lastActive : date.toLocaleDateString();
      } else {
        tableCell.textContent = 'Never';
      }
    });
  }

  setTableView(tableView) {
    this.tableView = tableView;
  }
  setModalManager(modalManager) {
    this.modalManager = modalManager;
  }

  // fetch raw rows for a table and store them
  fetchTableData(tableName) {
    return fetchJson(`/dataManagement/table-data/${tableName}`)
      .then(data => {
        this.tableDataCache[tableName] = Array.isArray(data) ? data : [];
        // reset filters/sort when switching
        this.columnFilter = {columnName: null, filterValue: ''};
        this.globalSearchQuery = '';
        this.sortState = {columnName: null, direction: 'asc'};
        return data;
      });
  }

  getRowValueForColumn(rowData, columnName) {
    if (!rowData) return '';
    const value = rowData[columnName];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  applyFiltersAndSort(tableName) {
    const allRowsForTable = (this.tableDataCache[tableName] || []).slice();
    if (!allRowsForTable || !allRowsForTable.length) {
      this.tableView.populateTable([], tableName);
      return;
    }

    const tableColumns = (this.tables[tableName] && this.tables[tableName].columns) || [];
    const searchableColumns = tableColumns.filter(column => column.visible && column.name && column.type !== 'date');

    const filteredRows = allRowsForTable.filter(row => {
      // Global search across searchable columns
      if (this.globalSearchQuery && this.globalSearchQuery.trim()) {
        const normalizedQuery = this.globalSearchQuery.trim().toLowerCase();
        const isMatch = searchableColumns.some(column => {
          const cellText = this.getRowValueForColumn(row, column.name).toLowerCase();
          return cellText.indexOf(normalizedQuery) !== -1;
        });
        if (!isMatch) return false;
      }

      // Column-specific filter
      if (this.columnFilter.columnName && this.columnFilter.filterValue && this.columnFilter.filterValue.trim()) {
        const normalizedColumnQuery = this.columnFilter.filterValue.trim().toLowerCase();
        const cellText = this.getRowValueForColumn(row, this.columnFilter.columnName).toLowerCase();
        if (cellText.indexOf(normalizedColumnQuery) === -1) return false;
      }

      return true;
    });

    // Sorting
    if (this.sortState.columnName) {
      const sortColumnName = this.sortState.columnName;
      const sortDirectionMultiplier = this.sortState.direction === 'desc' ? -1 : 1;
      filteredRows.sort((rowA, rowB) => {
        const valueA = this.getRowValueForColumn(rowA, sortColumnName);
        const valueB = this.getRowValueForColumn(rowB, sortColumnName);

        const numericA = Number(valueA);
        const numericB = Number(valueB);

        const valueAIsEmpty = valueA === '';
        const valueBIsEmpty = valueB === '';
        if (valueAIsEmpty && valueBIsEmpty) return 0;
        if (valueAIsEmpty) return 1;
        if (valueBIsEmpty) return -1;

        if (!Number.isNaN(numericA) && !Number.isNaN(numericB)) {
          return (numericA - numericB) * sortDirectionMultiplier;
        }

        const stringA = valueA.toLowerCase();
        const stringB = valueB.toLowerCase();
        if (stringA < stringB) return -1 * sortDirectionMultiplier;
        if (stringA > stringB) return 1 * sortDirectionMultiplier;
        return 0;
      });
    }

    this.tableView.populateTable(filteredRows, tableName);
  }

  getPrimaryKeyForSelectedTable(rowData) {
    const keyMap = {
      mapButtons: 'part_name',
      locations: 'id',
      documents: 'id',
      participation: 'id',
      users: 'email'
    };
    const keyName = keyMap[this.selectedTable];
    const value = rowData && rowData[keyName];
    return {[keyName]: value};
  }

}

// TableView: render DOM and wire events
class TableView {
  constructor(tableManager, selectors = {}) {
    this.manager = tableManager;
    this.manager.setTableView(this);
    this.selectors = Object.assign({
      navContainer: '#navigationMenu',
      headerRow: '#headerRow',
      tableBody: '#tableBody',
      tableTitle: '#tableTitle',
      addButton: '#addButton',
      globalSearch: '#globalSearch',
      columnPicker: '#columnPicker',
      columnFilter: '#columnFilter',
      clearFilters: '#clearFilters'
    }, selectors);

    this.navigationContainer = document.querySelector(this.selectors.navContainer);
    this.headerRowElement = document.querySelector(this.selectors.headerRow);
    this.tableBodyElement = document.querySelector(this.selectors.tableBody);
    this.tableTitleElement = document.querySelector(this.selectors.tableTitle);
    this.addButtonElement = document.querySelector(this.selectors.addButton);
    this.globalSearchInputElement = document.querySelector(this.selectors.globalSearch);
    this.columnPickerElement = document.querySelector(this.selectors.columnPicker);
    this.columnFilterInputElement = document.querySelector(this.selectors.columnFilter);
    this.clearFiltersButtonElement = document.querySelector(this.selectors.clearFilters);

    // Only these table keys are allowed to show the Add New Entry button.
    // Programs -> mapButtons, Locations -> locations, Documents -> documents, Participations -> participation
    this.allowedAddTables = new Set(['mapButtons', 'locations', 'documents', 'participation']);

    // filter containers (toggled based on whether a table is selected)
    this.filterContainers = {
      globalSearchContainer: document.querySelector('.globalSearchContainer'),
      rowControlsContainer: document.querySelector('.row-controls')
    };

    // ensure filters are hidden when no table selected initially
    this._setFilterVisibility(false);

    this._wireGlobalControls();

    // Ensure initial visibility is correct (no table selected yet).
    this.updateAddButtonVisibility(null);
  }

  // Show or hide the global filters area
  _setFilterVisibility(show) {
    const globalSearchContainerElement = this.filterContainers.globalSearchContainer;
    const rowControlsContainerElement = this.filterContainers.rowControlsContainer;
    if (globalSearchContainerElement) {
      if (show) globalSearchContainerElement.classList.remove('hidden'); else globalSearchContainerElement.classList.add('hidden');
    }
    if (rowControlsContainerElement) {
      if (show) rowControlsContainerElement.classList.remove('hidden'); else rowControlsContainerElement.classList.add('hidden');
    }
  }

  // Hide the inline map overlay and clear the iframe src to stop active scripts
  _hideMapOverlay() {
    const mapContainer = document.getElementById('mapContainer');
    const mapIframe = document.getElementById('mapIframe');
    if (mapContainer) mapContainer.classList.add('hidden');
    if (mapIframe) mapIframe.src = 'about:blank';
  }

  // Show the main table area and filters when a table is selected (used after closing the map overlay
  // or when a table is selected). This centralizes DOM updates so the logic isn't duplicated.
  showTable() {
    // Ensure the inline map overlay is hidden and any active iframe scripts are stopped
    try {
      this._hideMapOverlay();
    } catch (err) { /* ignore */ }

    // Show the main table container only if a table is selected
    try {
      const tableContainerElement = document.querySelector('.table-container');
      if (tableContainerElement && this.manager && this.manager.selectedTable) tableContainerElement.classList.remove('hidden');
    } catch (err) { /* ignore */ }

    // Show global filters and row controls only when a table is selected
    if (this.manager && this.manager.selectedTable) {
      try {
        this._setFilterVisibility(true);
      } catch (err) { /* ignore */ }
    }
  }

  updateAddButtonVisibility(tableName) {
    if (!this.addButtonElement) return;
    const shouldShow = tableName && this.allowedAddTables.has(tableName);
    this.addButtonElement.style.display = shouldShow ? '' : 'none';
  }

  renderNavMenu() {
    const container = this.navigationContainer;
    if (!container) return;
    container.innerHTML = '';
    (this.manager.navMenu || []).forEach(menuItem => {
      const navItemElement = document.createElement('div');
      navItemElement.className = 'clickable';
      if (menuItem.onClick) {
        navItemElement.onclick = () => {
          const handlerFunction = this.manager.actionHandlerMap[menuItem.onClick];
          if (handlerFunction && typeof handlerFunction === 'function') {
            handlerFunction();
          }
        };
      } else if (menuItem.tableKey) {
        navItemElement.onclick = () => this.onTableSelected(menuItem.tableKey);
      }
      if (menuItem.icon) {
        const imageElement = document.createElement('img');
        imageElement.className = 'nav-icon';
        imageElement.src = menuItem.icon;
        imageElement.alt = menuItem.label + ' icon';
        navItemElement.appendChild(imageElement);
      }
      const textNodeElement = document.createTextNode(' ' + (menuItem.label || menuItem.tableKey));
      navItemElement.appendChild(textNodeElement);
      container.appendChild(navItemElement);
    });
  }

  _wireGlobalControls() {
    if (this.addButtonElement) {
      this.addButtonElement.addEventListener('click', () => {
        if (!this.manager.selectedTable) { alert('Please select a table first.'); return; }
        this.manager.modalManager.open('add', this.manager.selectedTable);
      });
    }

    if (this.globalSearchInputElement) {
      this.globalSearchInputElement.addEventListener('input', (event) => {
        this.manager.globalSearchQuery = event.target.value;
        if (this.manager.selectedTable) this.manager.applyFiltersAndSort(this.manager.selectedTable);
      });
    }

    if (this.columnPickerElement) {
      this.columnPickerElement.addEventListener('change', (event) => {
        this.manager.columnFilter.columnName = event.target.value || null;
        this.columnFilterInputElement.value = '';
        this.manager.columnFilter.filterValue = '';
        if (this.manager.selectedTable) this.manager.applyFiltersAndSort(this.manager.selectedTable);
      });
    }

    if (this.columnFilterInputElement) {
      this.columnFilterInputElement.addEventListener('input', (event) => {
        this.manager.columnFilter.filterValue = event.target.value;
        if (this.manager.selectedTable) this.manager.applyFiltersAndSort(this.manager.selectedTable);
      });
    }

    if (this.clearFiltersButtonElement) {
      this.clearFiltersButtonElement.addEventListener('click', () => {
        this.manager.globalSearchQuery = '';
        this.manager.columnFilter = {columnName: null, filterValue: ''};
        if (this.globalSearchInputElement) this.globalSearchInputElement.value = '';
        if (this.columnPickerElement) this.columnPickerElement.value = '';
        if (this.columnFilterInputElement) this.columnFilterInputElement.value = '';
        if (this.manager.selectedTable) this.manager.applyFiltersAndSort(this.manager.selectedTable);
      });
    }

    // form submit will be handled by ModalManager via event delegation when ModalManager is set
  }

  onTableSelected(selectedTable) {
    if (!selectedTable) {
      this.clearTable();
      this.manager.selectedTable = null;
      this.updateAddButtonVisibility(null);
      // hide filters when no table selected
      this._setFilterVisibility(false);
      return Promise.resolve();
    }
    return this.manager.fetchTableData(selectedTable)
      .then(() => {
        this.tableTitleElement.textContent = this.manager.tables[selectedTable].displayName;
        this.manager.selectedTable = selectedTable;
        this.populateColumnPicker(selectedTable);
        // Update add button visibility based on selected table
        this.updateAddButtonVisibility(selectedTable);
        // hide inline map overlay when a table is opened and show filters
        // use the centralized helper to show the table area and filters
        this.showTable();
        this.manager.applyFiltersAndSort(selectedTable);
      })
      .catch(err => { console.error('Error fetching data', err); alert('Error: ' + err.message); });
  }

  populateColumnPicker(tableName) {
    const columnPickerElement = this.columnPickerElement;
    if (!columnPickerElement) return;
    columnPickerElement.innerHTML = '';
    const emptyOptionElement = document.createElement('option');
    emptyOptionElement.value = '';
    emptyOptionElement.textContent = '-- Column filter --';
    columnPickerElement.appendChild(emptyOptionElement);
    const columns = (this.manager.tables[tableName] && this.manager.tables[tableName].columns) || [];
    columns.forEach(column => {
      if (column.visible && column.name && column.type !== 'date') {
        const optionElement = document.createElement('option');
        optionElement.value = column.name;
        optionElement.textContent = column.label || column.name;
        columnPickerElement.appendChild(optionElement);
      }
    });
  }

  populateTable(data, tableName) {
    if (!data || !data.length) {
      this.clearTable();
      return;
    }
    const headerRowElement = this.headerRowElement;
    const tableBodyElement = this.tableBodyElement;
    headerRowElement.innerHTML = '';
    tableBodyElement.innerHTML = '';

    const columns = this.manager.tables[tableName].columns;
    columns.forEach(column => {
      if (column.visible) {
        const tableHeaderCellElement = document.createElement('th');
        tableHeaderCellElement.textContent = column.label || column.name || '';
        if (column.name) {
          tableHeaderCellElement.setAttribute('data-col-name', column.name);
          tableHeaderCellElement.className = 'sortable';
          const sortIndicatorElement = document.createElement('span');
          sortIndicatorElement.className = 'sortIndicator';
          if (this.manager.sortState.columnName === column.name) {
            sortIndicatorElement.textContent = this.manager.sortState.direction === 'asc' ? ' ▲' : ' ▼';
          }
          tableHeaderCellElement.appendChild(sortIndicatorElement);

          tableHeaderCellElement.onclick = () => {
            if (this.manager.sortState.columnName === column.name) {
              this.manager.sortState.direction = this.manager.sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
              this.manager.sortState.columnName = column.name;
              this.manager.sortState.direction = 'asc';
            }
            this.manager.applyFiltersAndSort(tableName);
          };
        }
        headerRowElement.appendChild(tableHeaderCellElement);
      }
    });

    data.forEach(rowData => {
      const tableRowElement = document.createElement('tr');
      columns.forEach(column => {
        if (column.name === 'data') {
          const tableDataCellElement = document.createElement('td');
          tableDataCellElement.textContent = JSON.stringify(rowData.data?.part_name || rowData.data?.inst_title || rowData.data?.doc_title || '');
          tableRowElement.appendChild(tableDataCellElement);
        } else {
          if (column.visible) {
            const tableDataCellElement = document.createElement('td');
            this._populateCell(rowData, column, tableDataCellElement);
            tableRowElement.appendChild(tableDataCellElement);
          }
        }
      });
      tableBodyElement.appendChild(tableRowElement);
    });
  }

  _populateCell(rowData, column, tableCell) {
    if (column.button) {
      const button = document.createElement('button');
      button.textContent = column.label || column.button;
      if (column.onClickFunction && typeof column.onClickFunction === 'string') {
        const clickFunctionName = column.onClickFunction;
        button.onclick = () => {
          const handler = this.manager.actionHandlerMap[clickFunctionName];
          if (handler) handler(rowData);
        };
      }
      tableCell.appendChild(button);
      return;
    }

    if (column.renderFunction && typeof column.renderFunction === 'string') {
      const renderFunctionName = column.renderFunction;
      const renderFunction = this.manager.rendererRegistry.get(renderFunctionName);
      if (renderFunction && typeof renderFunction === 'function') {
        renderFunction(rowData, tableCell);
        return;
      }
    }

    const cellData = rowData[column.name];
    if (cellData === null || cellData === undefined) {
      tableCell.textContent = '';
      return;
    }
    if (typeof cellData === 'object') {
      tableCell.textContent = JSON.stringify(cellData);
      return;
    }
    if (column.type === 'date') {
      const date = new Date(cellData);
      const formatted = formatDateTime(date);
      tableCell.textContent = formatted || cellData;
      return;
    }
    tableCell.textContent = cellData;
  }

  clearTable() {
    if (this.headerRowElement) this.headerRowElement.innerHTML = '';
    if (this.tableBodyElement) this.tableBodyElement.innerHTML = '';
    // hide Add New Entry button when no table selected
    this.updateAddButtonVisibility(null);
    // hide filters when clearing table
    this._setFilterVisibility(false);
  }
}

// ModalManager: builds and handles modals
class ModalManager {
  constructor(tableManager) {
    this.manager = tableManager;
    this.manager.setModalManager(this);
    this.modalOverlayElement = document.getElementById('modalOverlay');
    this.modalFormElement = document.getElementById('modalForm');
    this.modalFieldsElement = document.getElementById('modalFields');
    this.modalTitleElement = document.getElementById('modalTitle');
    this.profileOverlayElement = document.getElementById('modalOverlayMyProfile');

    if (this.modalFormElement) {
      this.modalFormElement.addEventListener('submit', (e) => this._onSubmit(e));
    }

    // Dismiss modal when clicking on the overlay (outside the modal content)
    // and when pressing the Escape key.
    // Use bound handlers so they can be removed later if needed.
    this._boundOnOverlayClick = (event) => {
      try {
        if (event && event.target) {
          if (this.modalOverlayElement && event.target === this.modalOverlayElement) {
            this.close();
          } else if (this.profileOverlayElement && event.target === this.profileOverlayElement) {
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
          if (modalVisible || profileVisible) {
            this.close();
          }
        }
      } catch (err) { /* ignore */ }
    };

    if (this.modalOverlayElement) {
      this.modalOverlayElement.addEventListener('click', this._boundOnOverlayClick);
    }
    if (this.profileOverlayElement) {
      this.profileOverlayElement.addEventListener('click', this._boundOnOverlayClick);
    }

    // Listen for Escape key to close modals
    document.addEventListener('keydown', this._boundOnKeyDown);
  }

  open(mode = 'add', tableName = null, rowData = null) {
    this.modalFormElement?.reset?.();
    this.modalTitleElement && (this.modalTitleElement.textContent = '');
    this.modalFieldsElement && (this.modalFieldsElement.innerHTML = '');
    this._currentMode = mode;
    this._currentTable = tableName;
    this._currentRow = rowData;

    if (mode === 'profile') {
      this.profileOverlayElement && this.profileOverlayElement.classList.remove('hidden');
    } else if (mode === 'review') {
      this.buildModalForReview(rowData);
      this.modalOverlayElement && this.modalOverlayElement.classList.remove('hidden');
    } else if (mode === 'add') {
      this.buildModalForTable(tableName);
      this.modalOverlayElement && this.modalOverlayElement.classList.remove('hidden');
    } else if (mode === 'edit') {
      this.buildModalForTable(tableName);
      this._populateEditValues(rowData);
      this.modalOverlayElement && this.modalOverlayElement.classList.remove('hidden');
    }
  }

  close() {
    this.modalOverlayElement && this.modalOverlayElement.classList.add('hidden');
    this.profileOverlayElement && this.profileOverlayElement.classList.add('hidden');
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

    // populate search inputs for crossRef columns
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

    // decision & comments
    const decisionRow = document.createElement('div');
    decisionRow.className = 'form-row';
    const decisionLabel = document.createElement('label');
    decisionLabel.textContent = 'Decision';
    decisionLabel.setAttribute('for', 'reviewDecision');
    decisionRow.appendChild(decisionLabel);
    const decisionSelect = document.createElement('select');
    decisionSelect.id = 'reviewDecision';
    decisionSelect.name = 'reviewDecision';
    ['Approve', 'Reject'].forEach(optionValue => {
      const optionElement = document.createElement('option');
      optionElement.value = optionValue;
      optionElement.text = optionValue;
      decisionSelect.appendChild(optionElement);
    });
    decisionRow.appendChild(decisionSelect);
    this.modalFieldsElement.appendChild(decisionRow);

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

        // setup typeahead
        new Typeahead({
          inputElement: searchInput,
          resultsElement: resultsDiv,
          searchUrl: '/dataManagement/location-search',
          onSelect: (item) => {
            searchInput.value = item.inst_title || item.title || item.name || '';
            hiddenInput.value = item.id;
          }
        });

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
      if (!this._currentRow) { alert('No review row specified.'); return; }
      const decision = document.getElementById('reviewDecision')?.value || '';
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
}

// Initialize on DOMContentLoaded using server-provided config
document.addEventListener('DOMContentLoaded', () => {
  const configuration = window.dataManagementConfigFromServer || {};
  const tables = configuration.tablesForUser || {};
  const navigationMenu = configuration.navMenu || [];
  const currentUser = configuration.user || null;

  const tableManager = new TableManager({tables, navMenu: navigationMenu});
  tableManager.currentUser = currentUser;
  const tableView = new TableView(tableManager);
  const modalManager = new ModalManager(tableManager);

  window.closeModal = () => modalManager.close();
  window.openMyProfileModalFunction = () => modalManager.open('profile');
  window.closeMyProfileModalFunction = () => modalManager.close();
  window.addNewEntry = () => { if (!tableManager.selectedTable) { alert('Please select a table first.'); return; } modalManager.open('add', tableManager.selectedTable); };

  window.closeMapOverlay = () => {
    const mapContainer = document.getElementById('mapContainer');
    const mapIframe = document.getElementById('mapIframe');
    if (mapContainer) mapContainer.classList.add('hidden');
    if (mapIframe) {
      mapIframe.src = 'about:blank'; // clear src to stop active scripts and free resources
    }
    // centralize showing the table area & filters via the tableView helper
    try { tableView.showTable(); } catch (err) { /* ignore */ }
  };

  // expose a few objects for debugging in console
  window.__dataManagement = {tableManager, tableView, modalManager};

  // initial render of nav menu
  tableView.renderNavMenu();

  // open map overlay by default on initial page load (invokes the existing handler)
  try {
    if (tableManager && tableManager.actionHandlerMap && typeof tableManager.actionHandlerMap.openMap === 'function') {
      tableManager.actionHandlerMap.openMap();
    }
  } catch (err) {
    console.error('Failed to open map overlay by default:', err);
  }

  // Wire up nav clicks: nav items with tableKey call tableView.onTableSelected
  // Already wired in renderNavMenu
});
