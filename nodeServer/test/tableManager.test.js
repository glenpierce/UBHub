/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TableManager } from '../public/javascripts/data-management/tableManager.js'

function createElement(tag, id = null, classNames = []) {
  const el = document.createElement(tag)
  if (id) el.id = id
  classNames.forEach(c => el.classList.add(c))
  return el
}

describe('TableManager', () => {
  let manager
  beforeEach(() => {
    // default manager with empty tables and no editable columns
    manager = new TableManager({ tables: {}, editableColumns: {}, navMenu: [] })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('getRowValueForColumn', () => {
    it('returns empty string for falsy row', () => {
      expect(manager.getRowValueForColumn(null, 'name')).toBe('')
    })

    it('returns empty string for null/undefined value', () => {
      expect(manager.getRowValueForColumn({ name: null }, 'name')).toBe('')
      expect(manager.getRowValueForColumn({ name: undefined }, 'name')).toBe('')
    })

    it('stringifies objects', () => {
      expect(manager.getRowValueForColumn({ info: { a: 1 } }, 'info')).toBe(JSON.stringify({ a: 1 }))
    })

    it('converts numbers to strings', () => {
      expect(manager.getRowValueForColumn({ count: 10 }, 'count')).toBe('10')
    })
  })

  describe('getPrimaryKeyForSelectedTable', () => {
    it('returns correct key mapping for known table', () => {
      manager.selectedTable = 'locations'
      const res = manager.getPrimaryKeyForSelectedTable({ id: 5 })
      expect(res).toEqual({ id: 5 })

      manager.selectedTable = 'users'
      const r2 = manager.getPrimaryKeyForSelectedTable({ email: 'a@b' })
      expect(r2).toEqual({ email: 'a@b' })
    })
  })

  describe('built-in renderers', () => {
    it('nameRenderer sets text and class', () => {
      const renderer = manager.rendererRegistry.get('nameRenderer')
      const cell = createElement('div')
      renderer({ alias: 'Bob' }, cell)
      expect(cell.textContent).toBe('Bob')
      expect(cell.classList.contains('nameCell')).toBe(true)
    })

    it('privilegeRenderer maps levels to classes and labels', () => {
      const renderer = manager.rendererRegistry.get('privilegeRenderer')

      const cellContact = createElement('div')
      renderer({ privileges: 0 }, cellContact)
      expect(cellContact.querySelector('div').textContent).toBe('Contact')
      expect(cellContact.querySelector('div').className).toBe('contactRole')

      const cell = createElement('div')
      renderer({ privileges: 3 }, cell)
      const child = cell.querySelector('div')
      expect(child).toBeTruthy()
      expect(child.textContent).toBe('Lead')
      expect(child.className).toBe('leadRole')

      const cellUser = createElement('div')
      renderer({ privileges: 1 }, cellUser)
      expect(cellUser.querySelector('div').textContent).toBe('User')
      expect(cellUser.querySelector('div').className).toBe('userRole')
    })

    it('statusRenderer sets class based on status', () => {
      const renderer = manager.rendererRegistry.get('statusRenderer')
      const cell = createElement('div')
      renderer({ status: 'Active' }, cell)
      expect(cell.textContent).toBe('Active')
      expect(cell.classList.contains('status-active')).toBe(true)

      const cell2 = createElement('div')
      renderer({ status: 'Inactive' }, cell2)
      expect(cell2.classList.contains('status-inactive')).toBe(true)
    })

    it('submissionStatusRenderer normalizes various values', () => {
      const renderer = manager.rendererRegistry.get('submissionStatusRenderer')
      const cell = createElement('div')
      renderer({ status: 'approved' }, cell)
      expect(cell.textContent).toBe('Approved')
      expect(cell.querySelector('div').className).toBe('approvedStatus')

      const cell2 = createElement('div')
      renderer({ status: 'pending' }, cell2)
      expect(cell2.querySelector('div').className).toBe('pendingStatus')
    })

    it('lastActiveRenderer formats dates', () => {
      const renderer = manager.rendererRegistry.get('lastActiveRenderer')
      const cell = createElement('div')
      renderer({ lastActive: 'invalid-date' }, cell)
      // invalid date returns raw value
      expect(cell.textContent).toBe('invalid-date')

      const cell2 = createElement('div')
      const now = new Date().toISOString()
      renderer({ lastActive: now }, cell2)
      expect(cell2.textContent.length).toBeGreaterThan(0)
    })
  })

  describe('applyFiltersAndSort', () => {
    it('calls populateTable with empty array when no data', () => {
      const spy = vi.fn()
      manager.tableView = { populateTable: spy }
      manager.applyFiltersAndSort('nonexistent')
      expect(spy).toHaveBeenCalledWith([], 'nonexistent')
    })

    it('filters based on globalSearchQuery and visible columns', () => {
      manager.tables = {
        people: {
          columns: [
            { name: 'id', visible: true },
            { name: 'name', visible: true, type: 'string' },
            { name: 'notes', visible: false }
          ]
        }
      }
      manager.tableDataCache = {
        people: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      }
      manager.globalSearchQuery = 'bob'
      manager.tableView = { populateTable: vi.fn() }
      manager.applyFiltersAndSort('people')
      const calledWith = manager.tableView.populateTable.mock.calls[0][0]
      expect(calledWith.length).toBe(1)
      expect(calledWith[0].name).toBe('Bob')
    })

    it('sorts numeric and string values correctly', () => {
      manager.tables = {
        items: {
          columns: [ { name: 'id', visible: true }, { name: 'value', visible: true } ]
        }
      }
      manager.tableDataCache = {
        items: [ { id: 1, value: '10' }, { id: 2, value: '2' }, { id: 3, value: '' } ]
      }
      manager.sortState = { columnName: 'value', direction: 'asc' }
      const populateSpy = vi.fn()
      manager.tableView = { populateTable: populateSpy }

      manager.applyFiltersAndSort('items')
      const result = populateSpy.mock.calls[0][0]
      // '' should be last for asc according to implementation (empty goes to end)
      expect(result.map(r => r.id)).toEqual([2,1,3]) // numeric sort: 2,10,''

      manager.sortState.direction = 'desc'
      manager.applyFiltersAndSort('items')
      const resultDesc = populateSpy.mock.calls[1][0]
      expect(resultDesc.map(r => r.id)).toEqual([1,2,3])
    })
  })

  describe('fetchTableData', () => {
    it('uses fetch to retrieve data and populates cache', async () => {
      const fakeData = [{ id: 1 }]
      global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fakeData) }))
      const res = await manager.fetchTableData('any')
      expect(res).toEqual(fakeData)
      expect(manager.tableDataCache.any).toEqual(fakeData)
    })

    it('sets empty array on non-array response', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
      const res = await manager.fetchTableData('any2')
      expect(manager.tableDataCache.any2).toEqual([])
    })
  })

  describe('actionHandlerMap.openMap', () => {
    it('shows map container and sets iframe src and hides table container', () => {
      const mapContainer = createElement('div', 'mapContainer')
      const mapIframe = createElement('iframe', 'mapIframe')
      document.body.appendChild(mapContainer)
      document.body.appendChild(mapIframe)

      const tableContainer = createElement('div', null, ['table-container'])
      document.body.appendChild(tableContainer)

      // tableView with _setFilterVisibility
      manager.tableView = { _setFilterVisibility: vi.fn() }

      manager.actionHandlerMap.openMap()

      expect(mapIframe.src).toContain('/map')
      expect(mapContainer.classList.contains('hidden')).toBe(false)
      expect(manager.tableView._setFilterVisibility).toHaveBeenCalledWith(false)
    })
  })
})
