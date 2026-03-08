import { formatDateTime } from './utils.js';

export class TableView {
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

    this.allowedAddTables = new Set(['mapButtons', 'locations', 'documents', 'participation']);

    this.filterContainers = {
      globalSearchContainer: document.querySelector('.globalSearchContainer'),
      rowControlsContainer: document.querySelector('.row-controls')
    };

    this._setFilterVisibility(false);

    this._wireGlobalControls();

    this.updateAddButtonVisibility(null);
  }

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

  _hideMapOverlay() {
    const mapContainer = document.getElementById('mapContainer');
    const mapIframe = document.getElementById('mapIframe');
    if (mapContainer) mapContainer.classList.add('hidden');
    if (mapIframe) mapIframe.src = 'about:blank';
  }

  showTable() {
    try { this._hideMapOverlay(); } catch (err) { /* ignore */ }
    try {
      const tableContainerElement = document.querySelector('.table-container');
      if (tableContainerElement && this.manager && this.manager.selectedTable) tableContainerElement.classList.remove('hidden');
    } catch (err) { /* ignore */ }

    if (this.manager && this.manager.selectedTable) {
      try { this._setFilterVisibility(true); } catch (err) { /* ignore */ }
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
  }

  onTableSelected(selectedTable) {
    if (!selectedTable) {
      this.clearTable();
      this.manager.selectedTable = null;
      this.updateAddButtonVisibility(null);
      this._setFilterVisibility(false);
      return Promise.resolve();
    }
    return this.manager.fetchTableData(selectedTable)
      .then(() => {
        this.tableTitleElement.textContent = this.manager.tables[selectedTable].displayName;
        this.manager.selectedTable = selectedTable;
        this.populateColumnPicker(selectedTable);
        this.updateAddButtonVisibility(selectedTable);
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
    if (!data || !data.length) { this.clearTable(); return; }
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
      // If this is the review button, don't render it for rows that are already approved or rejected
      const isReviewButton = (column.onClickFunction === 'openReviewModal') || (String(column.button).toLowerCase() === 'review');
      const statusRaw = (rowData && (rowData.status || '')) ? String(rowData.status) : '';
      const statusLower = statusRaw.toLowerCase();
      if (isReviewButton && (statusLower.includes('approve') || statusLower.includes('reject'))) {
        // Do not append a review button for rows that are approved or rejected
        return;
      }

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
    if (cellData === null || cellData === undefined) { tableCell.textContent = ''; return; }
    if (typeof cellData === 'object') { tableCell.textContent = JSON.stringify(cellData); return; }
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
    this.updateAddButtonVisibility(null);
    this._setFilterVisibility(false);
  }
}
