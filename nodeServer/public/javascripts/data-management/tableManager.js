import { RendererRegistry } from './rendererRegistry.js';
import { fetchJson } from './utils.js';

export class TableManager {
  constructor({tables = {}, editableColumns = {}, navMenu = []}) {
    this.tables = tables;
    this.editableColumns = editableColumns;
    this.navMenu = navMenu;

    this.selectedTable = null;
    this.tableDataCache = {};

    this.globalSearchQuery = '';
    this.columnFilter = {columnName: null, filterValue: ''};
    this.sortState = {columnName: null, direction: 'asc'};

    this.tableView = null;
    this.modalManager = null;
    this.rendererRegistry = new RendererRegistry();

    this._registerBuiltInRenderers();

    this.actionHandlerMap = {
      openReviewModal: (rowData) => this.modalManager && this.modalManager.open('review', null, rowData),
      openEditUserModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'users', rowData),
      openEditProgramModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'mapButtons', rowData),
      openEditLocationModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'locations', rowData),
      openEditDocumentModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'documents', rowData),
      openEditProgramParticipationModal: (rowData) => this.modalManager && this.modalManager.open('edit', 'participation', rowData),
      openMyProfileModal: () => this.modalManager && this.modalManager.open('profile'),
      openMap: () => {
        const mapContainer = document.getElementById('mapContainer');
        const mapIframe = document.getElementById('mapIframe');
        if (mapIframe) mapIframe.src = '/map';
        if (mapContainer) mapContainer.classList.remove('hidden');
        try {
          const tableContainer = document.querySelector('.table-container');
          if (tableContainer) tableContainer.classList.add('hidden');
        } catch (err) { /* ignore */ }
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
          displayText = 'Contact';
          styleClass = 'contactRole';
          break;
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

  setTableView(tableView) { this.tableView = tableView; }
  setModalManager(modalManager) { this.modalManager = modalManager; }

  fetchTableData(tableName) {
    return fetchJson(`/dataManagement/table-data/${tableName}`)
      .then(data => {
        this.tableDataCache[tableName] = Array.isArray(data) ? data : [];
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
      if (this.globalSearchQuery && this.globalSearchQuery.trim()) {
        const normalizedQuery = this.globalSearchQuery.trim().toLowerCase();
        const isMatch = searchableColumns.some(column => {
          const cellText = this.getRowValueForColumn(row, column.name).toLowerCase();
          return cellText.indexOf(normalizedQuery) !== -1;
        });
        if (!isMatch) return false;
      }

      if (this.columnFilter.columnName && this.columnFilter.filterValue && this.columnFilter.filterValue.trim()) {
        const normalizedColumnQuery = this.columnFilter.filterValue.trim().toLowerCase();
        const cellText = this.getRowValueForColumn(row, this.columnFilter.columnName).toLowerCase();
        if (cellText.indexOf(normalizedColumnQuery) === -1) return false;
      }

      return true;
    });

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
    const keyMap = { mapButtons: 'part_name', locations: 'id', documents: 'id', participation: 'id', users: 'email' };
    const keyName = keyMap[this.selectedTable];
    const value = rowData && rowData[keyName];
    return {[keyName]: value};
  }
}
