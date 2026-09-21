// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { CATEGORIES, NOTE_FIELDS, NOTES_STORAGE_KEY, STORAGE_KEY } from './data.js'

const savedRoles = Object.fromEntries(
  CATEGORIES.map((category, index) => [category.id, index === 0 ? ['Healer'] : []]),
)
const savedNotes = Object.fromEntries(
  NOTE_FIELDS.map((field, index) => [field.id, index === 0 ? '<p>A private thought.</p>' : '']),
)

let container
let root

function seedResponses({ roles = true } = {}) {
  if (roles) localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoles))
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(savedNotes))
}

async function renderApp() {
  await act(async () => root.render(<App />))
}

function clearButton() {
  return [...container.querySelectorAll('button')].find(
    (button) => button.textContent === 'Clear local data',
  )
}

function firstEditor() {
  return container.querySelector('.rte__content').editor
}

async function click(button) {
  await act(async () => button.click())
}

function expectEmptyResponses() {
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()
  expect(container.querySelectorAll('.chip--placed-in-cat')).toHaveLength(0)
  for (const editor of container.querySelectorAll('.rte__content')) {
    expect(editor.textContent).toBe('')
  }
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('privacy and local data', () => {
  it('shows the privacy notice and clear action in the header', async () => {
    await renderApp()
    const notice = container.querySelector('.app__intro .privacy')
    expect(notice.textContent).toContain('Your responses stay on this device')
    expect(notice.textContent).toContain('This app never uploads or shares your responses.')
    expect(notice.textContent).toContain('may be able to see them')
    expect(notice.contains(clearButton())).toBe(true)
  })

  it('keeps all responses when clearing is cancelled', async () => {
    seedResponses()
    await renderApp()
    const editor = firstEditor()
    window.confirm.mockReturnValue(false)

    await click(clearButton())

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(savedRoles)
    expect(JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY))).toEqual(savedNotes)
    expect(container.querySelectorAll('.chip--placed-in-cat')).toHaveLength(1)
    expect(firstEditor()).toBe(editor)
    expect(editor.getText()).toBe('A private thought.')
  })

  it('removes only this app’s data and stays empty after remounting', async () => {
    seedResponses()
    localStorage.setItem('unrelated-app', 'keep me')
    await renderApp()

    await click(clearButton())

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('This cannot be undone.'))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(
      'Downloaded files, printed copies, and clipboard contents will not be removed.',
    ))
    expectEmptyResponses()
    expect(localStorage.getItem('unrelated-app')).toBe('keep me')

    await act(async () => root.unmount())
    root = createRoot(container)
    await renderApp()
    expectEmptyResponses()
  })

  it('destroys the editor undo history when clearing responses', async () => {
    seedResponses()
    await renderApp()
    const editor = firstEditor()
    await act(async () => editor.commands.insertContent('More private text. '))
    expect(editor.can().undo()).toBe(true)

    await click(clearButton())

    expect(firstEditor()).not.toBe(editor)
    expect(editor.isDestroyed).toBe(true)
    expect(firstEditor().can().undo()).toBe(false)
    await act(async () => firstEditor().commands.undo())
    expectEmptyResponses()
  })

  it('confirms clearing even when there are notes but no placed roles', async () => {
    seedResponses({ roles: false })
    await renderApp()

    await click(clearButton())

    expect(window.confirm).toHaveBeenCalledOnce()
    expectEmptyResponses()
  })

  it('also confirms Reset all before clearing notes-only responses', async () => {
    seedResponses({ roles: false })
    await renderApp()
    window.confirm.mockReturnValue(false)

    await click(container.querySelector('[aria-label="Reset all categories and notes"]'))

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(firstEditor().getText()).toBe('A private thought.')
    expect(JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY))).toEqual(savedNotes)
  })

  it('saves new notes normally after clearing', async () => {
    seedResponses()
    await renderApp()
    await click(clearButton())

    await act(async () => firstEditor().commands.insertContent('A new response.'))

    const notes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY))
    expect(notes[NOTE_FIELDS[0].id]).toBe('<p>A new response.</p>')
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).not.toContain('A private thought.')
  })

  it('does not restore an import that was still being read when data was cleared', async () => {
    await renderApp()
    let finishReading
    const file = { text: () => new Promise((resolve) => { finishReading = resolve }) }
    const input = container.querySelector('input[type="file"]')
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))

    await click(clearButton())
    await act(async () => finishReading(JSON.stringify({
      categories: savedRoles,
      notes: { [NOTE_FIELDS[0].id]: 'A pending private response.' },
    })))

    expect(window.confirm).toHaveBeenCalledOnce()
    expectEmptyResponses()
  })
})

describe('import button', () => {
  it('uses the FileUp icon', async () => {
    await renderApp()
    const button = container.querySelector('[aria-label="Import a saved JSON file"]')
    expect(button.querySelector('svg.lucide-file-up')).not.toBeNull()
  })
})

describe('reflection toolbar', () => {
  it('offers formatting without undo, redo, or a block-style dropdown', async () => {
    await renderApp()
    const toolbars = container.querySelectorAll('.rte__toolbar')
    expect(toolbars).toHaveLength(NOTE_FIELDS.length)
    for (const toolbar of toolbars) {
      expect(toolbar.querySelector('select')).toBeNull()
      expect([...toolbar.querySelectorAll('button')].map((button) => button.getAttribute('aria-label')))
        .toEqual(['Bold', 'Italic', 'Strikethrough', 'Bulleted list', 'Numbered list', 'Block quote', 'Clear formatting'])
    }
  })
})
