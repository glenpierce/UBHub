import { TableManager } from './tableManager.js';
import { TableView } from './tableView.js';
import { ModalManager } from './modalManager.js';
import { Typeahead } from './typeahead.js';

export function initializeDataManagement(config = window.dataManagementConfigFromServer || {}) {
  const tables = config.tablesForUser || {};
  const editableColumns = config.editableColumns || {};
  const navigationMenu = config.navMenu || [];
  const currentUser = config.user || null;

  const tableManager = new TableManager({tables, editableColumns, navMenu: navigationMenu});
  tableManager.currentUser = currentUser;
  const tableView = new TableView(tableManager);
  const modalManager = new ModalManager(tableManager);

  // legacy global helpers
  window.closeModal = () => modalManager.close();
  window.openMyProfileModalFunction = () => modalManager.open('profile');
  window.closeMyProfileModalFunction = () => modalManager.close();
  window.addNewEntry = () => { if (!tableManager.selectedTable) { alert('Please select a table first.'); return; } modalManager.open('add', tableManager.selectedTable); };

  window.closeMapOverlay = () => {
    const mapContainer = document.getElementById('mapContainer');
    const mapIframe = document.getElementById('mapIframe');
    if (mapContainer) mapContainer.classList.add('hidden');
    if (mapIframe) { mapIframe.src = 'about:blank'; }
    try { tableView.showTable(); } catch (err) { /* ignore */ }
  };

  window.__dataManagement = {tableManager, tableView, modalManager};

  // Ensure modal manager cleans up listeners when the page is unloaded to avoid
  // dangling handlers in long-running single-page flows or when navigating away.
  try {
    window.addEventListener('beforeunload', () => {
      try { if (modalManager && typeof modalManager.destroy === 'function') modalManager.destroy(); } catch (_) {}
    });
  } catch (err) { /* ignore */ }

  tableView.renderNavMenu();

  try {
    if (tableManager && tableManager.actionHandlerMap && typeof tableManager.actionHandlerMap.openMap === 'function') {
      tableManager.actionHandlerMap.openMap();
    }
  } catch (err) {
    console.error('Failed to open map overlay by default:', err);
  }

  // Wire typeaheads for crossReference fields inside modal when modal is shown or built
  // We rely on elements existing at modal build time; ModalManager created them without attaching typeahead
  // We'll find inputs with id starting with 'search_' and attach a Typeahead with a default url.
  document.addEventListener('click', () => {
    // attach typeaheads lazily to avoid eager queries
    document.querySelectorAll('[id^="search_"]').forEach(elem => {
      const lookupColumn = elem.id.replace(/^search_/, '');
      const resultsElem = document.getElementById(`results_${lookupColumn}`);
      if (elem && resultsElem && !elem._typeaheadAttached) {
        new Typeahead({ inputElement: elem, resultsElement: resultsElem, searchUrl: '/dataManagement/location-search', onSelect: (item) => {
          elem.value = item.inst_title || item.title || item.name || '';
          const hidden = document.getElementById(lookupColumn);
          if (hidden) hidden.value = item.id;
        } });
        elem._typeaheadAttached = true;
      }
    });
  });

  return { tableManager, tableView, modalManager };
}

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeDataManagement());
} else {
  initializeDataManagement();
}
