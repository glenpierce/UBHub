/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ModalRenderer, ModalManager } from '../public/javascripts/data-management/modalManager.js'

function createElementWithId(tag, id, classNames = []) {
  const el = document.createElement(tag)
  if (id) el.id = id
  classNames.forEach(c => el.classList.add(c))
  return el
}

describe('ModalRenderer', () => {
  it('builds form fields for table with regular and cross-reference columns', () => {
    const renderer = new ModalRenderer()
    const manager = {
      tables: {
        users: {
          displayName: 'Users',
          columns: [
            { name: 'id' },
            { name: 'name', label: 'Full Name' },
            { name: 'org', crossReferenceTable: true, lookupColumn: 'org_id', joinedColumn: 'org_name', label: 'Organization' }
          ]
        }
      }
    }

    const titleEl = document.createElement('div')
    const fieldsContainer = document.createElement('div')

    renderer.buildModalForTable(manager, 'users', fieldsContainer, titleEl)

    expect(titleEl.textContent).toBe('Add New Entry to Users')
    // Should have two form rows (excluding id)
    const rows = fieldsContainer.querySelectorAll('.form-row')
    expect(rows.length).toBe(2)

    // Check that name field exists
    const nameInput = fieldsContainer.querySelector('input[data-col-name="name"]')
    expect(nameInput).toBeTruthy()
    expect(nameInput.placeholder).toContain('Full Name')

    // Check cross-reference inputs
    const searchInput = fieldsContainer.querySelector('#search_org_id')
    const hiddenInput = fieldsContainer.querySelector('#org_id')
    const resultsDiv = fieldsContainer.querySelector('#results_org_id')
    expect(searchInput).toBeTruthy()
    expect(hiddenInput).toBeTruthy()
    expect(resultsDiv).toBeTruthy()
    expect(resultsDiv.classList.contains('typeahead-results')).toBe(true)
  })

  it('shows message when no editable fields', () => {
    const renderer = new ModalRenderer()
    const manager = {
      tables: {
        onlyId: { displayName: 'OnlyId', columns: [{ name: 'id' }] }
      }
    }
    const titleEl = document.createElement('div')
    const fieldsContainer = document.createElement('div')

    renderer.buildModalForTable(manager, 'onlyId', fieldsContainer, titleEl)
    expect(fieldsContainer.textContent).toContain('No editable fields for this table')
  })

  it('renders review view with current and pending values and marks changes', () => {
    const renderer = new ModalRenderer()
    const manager = {
      tables: {
        users: {
          columns: [ { name: 'id' }, { name: 'name', label: 'Name' }, { name: 'age' } ]
        }
      },
      tableDataCache: {
        users: [ { id: 1, name: 'Alice', age: 30 } ]
      }
    }

    const titleEl = document.createElement('div')
    const fieldsContainer = document.createElement('div')
    const rowData = {
      table_name: 'users',
      operation: 'update',
      data: JSON.stringify({ name: 'Alice Updated', age: 30 }),
      row_key: JSON.stringify({ id: 1 })
    }

    renderer.buildModalForReview(manager, titleEl, fieldsContainer, rowData)

    expect(titleEl.textContent).toContain('Review Submission')

    // header row + 3 fields + comments => at least 5 nodes
    expect(fieldsContainer.querySelector('.review-header')).toBeTruthy()

    // name should be marked changed
    const pendingName = fieldsContainer.querySelector('#pending_name')
    expect(pendingName).toBeTruthy()
    const pendingNameContainer = pendingName.parentElement
    expect(pendingNameContainer.classList.contains('changed')).toBe(true)

    // comments textarea present
    expect(fieldsContainer.querySelector('#reviewComments')).toBeTruthy()
  })
})

describe('ModalManager', () => {
  let managerMock
  let focusTrapMock
  let rendererMock

  beforeEach(() => {
    // Create DOM skeleton elements referenced by ModalManager constructor
    const modalOverlay = createElementWithId('div', 'modalOverlay')
    const modal = createElementWithId('div', null, ['modal'])
    modalOverlay.appendChild(modal)
    document.body.appendChild(modalOverlay)

    const modalForm = createElementWithId('form', 'modalForm')
    document.body.appendChild(modalForm)

    const modalFields = createElementWithId('div', 'modalFields')
    document.body.appendChild(modalFields)

    const modalTitle = createElementWithId('div', 'modalTitle')
    document.body.appendChild(modalTitle)

    const profileOverlay = createElementWithId('div', 'modalOverlayMyProfile')
    const profileModal = createElementWithId('div', null, ['modal'])
    const userNameContainer = createElementWithId('div', 'userName')
    profileModal.appendChild(userNameContainer)
    profileOverlay.appendChild(profileModal)
    document.body.appendChild(profileOverlay)

    const reviewOverlay = createElementWithId('div', 'modalOverlayReview')
    const reviewModal = createElementWithId('div', null, ['modal'])
    reviewOverlay.appendChild(reviewModal)
    const reviewTitle = createElementWithId('div', 'modalTitleReview')
    document.body.appendChild(reviewTitle)
    document.body.appendChild(reviewOverlay)

    const reviewForm = createElementWithId('form', 'modalFormReview')
    document.body.appendChild(reviewForm)

    const approveBtn = createElementWithId('button', 'approveReviewButton')
    const rejectBtn = createElementWithId('button', 'rejectReviewButton')
    const closeReviewBtn = createElementWithId('button', 'closeReviewButton')
    document.body.appendChild(approveBtn)
    document.body.appendChild(rejectBtn)
    document.body.appendChild(closeReviewBtn)

    managerMock = {
      setModalManager: vi.fn(),
      tables: {},
      tableDataCache: {},
      selectedTable: null,
      getPrimaryKeyForSelectedTable: vi.fn(),
      fetchTableData: vi.fn().mockResolvedValue(),
      applyFiltersAndSort: vi.fn()
    }

    focusTrapMock = { attach: vi.fn(), detach: vi.fn() }
    rendererMock = { buildModalForTable: vi.fn(), buildModalForReview: vi.fn(), populateEditValues: vi.fn() }
  })

  afterEach(() => {
    // clean up DOM
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('wires manager and sets aria attributes on modal containers', () => {
    const mm = new ModalManager(managerMock, { apiClient: null, focusTrap: focusTrapMock, renderer: rendererMock })
    expect(managerMock.setModalManager).toHaveBeenCalledWith(mm)

    const modalContainer = document.querySelector('#modalOverlay .modal')
    expect(modalContainer.getAttribute('role')).toBe('dialog')
    expect(modalContainer.getAttribute('aria-modal')).toBe('true')
  })

  it('submits a review via _submitReview and hides overlays on success', async () => {
    const apiClientMock = { post: vi.fn().mockResolvedValue({}) }
    const mm = new ModalManager(managerMock, { apiClient: apiClientMock, focusTrap: focusTrapMock, renderer: rendererMock })

    // set current row and review comment
    mm._currentRow = { id: 42 }
    const comments = createElementWithId('textarea', 'reviewComments')
    comments.value = 'Looks good'
    document.body.appendChild(comments)

    await mm._submitReview('Approve')

    expect(apiClientMock.post).toHaveBeenCalledWith('/dataManagement/pending-change/review', { id: 42, decision: 'Approve', comments: 'Looks good' })
    // overlays should be hidden
    expect(document.getElementById('modalOverlay').classList.contains('hidden')).toBe(true)
    expect(document.getElementById('modalOverlayReview').classList.contains('hidden')).toBe(true)
  })

  it('handles add submit via _onSubmit and posts payload', async () => {
    const apiClientMock = { post: vi.fn().mockResolvedValue({}) }
    managerMock.selectedTable = 'users'
    managerMock.getPrimaryKeyForSelectedTable.mockReturnValue({ id: 0 })

    const mm = new ModalManager(managerMock, { apiClient: apiClientMock, focusTrap: focusTrapMock, renderer: rendererMock })

    // add two inputs to modalForm
    const input1 = createElementWithId('input', 'name')
    input1.setAttribute('data-col-name', 'name')
    input1.value = 'Bob'
    const input2 = createElementWithId('input', 'email')
    input2.setAttribute('data-col-name', 'email')
    input2.value = 'bob@example.com'
    document.getElementById('modalForm').appendChild(input1)
    document.getElementById('modalForm').appendChild(input2)

    mm._currentMode = 'add'
    // simulate submit event
    const submitEvent = new Event('submit', { cancelable: true })
    document.getElementById('modalForm').dispatchEvent(submitEvent)

    // wait a tick for async handlers
    await new Promise(r => setTimeout(r, 10))

    expect(apiClientMock.post).toHaveBeenCalled()
    const callArgs = apiClientMock.post.mock.calls[0]
    expect(callArgs[0]).toBe('/dataManagement/pending-change')
    expect(callArgs[1]).toBeDefined()
    expect(callArgs[1].data.name).toBe('Bob')
    expect(callArgs[1].data.email).toBe('bob@example.com')

    // overlays should be hidden
    expect(document.getElementById('modalOverlay').classList.contains('hidden')).toBe(true)
  })
})
