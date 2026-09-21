import { marked } from 'marked'
import {
  CATEGORIES,
  ROLES,
  NOTE_FIELDS,
  STORAGE_KEY,
  NOTES_STORAGE_KEY,
} from './data.js'

// Import the JSON produced by buildJson(): validates the file, normalizes
// it into the app's state shape, and repopulates localStorage.
//
// Notes are stored as Markdown in the exported JSON, so they are converted
// back to HTML here (via marked) for the rich text editors.
//
// Returns { ok: true, state, notes } on success or { ok: false, error }.

const mdToHtml = (md) =>
  typeof md === 'string' && md.trim()
    ? marked.parse(md, { async: false }).trim()
    : ''

function parseCategory(entry, categoryId) {
  // Missing category -> empty (a fresh board for that column).
  if (entry === undefined || entry === null) return []

  // Tolerate both shapes: { roles: [...] } (our export) and [ ... ].
  const roles = Array.isArray(entry) ? entry : entry?.roles

  if (!Array.isArray(roles)) {
    return {
      error: `"categories.${categoryId}" must be an array or an object with a "roles" array.`,
    }
  }

  // Only keep roles the app knows about; drop duplicates (keep first).
  return [...new Set(roles.filter((r) => typeof r === 'string' && ROLES.includes(r)))]
}

export function parseImport(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' }
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'Expected a JSON object at the top level.' }
  }

  if (
    typeof data.categories !== 'object' ||
    data.categories === null ||
    Array.isArray(data.categories)
  ) {
    return { ok: false, error: 'Missing or invalid "categories".' }
  }

  const state = {}
  for (const category of CATEGORIES) {
    const result = parseCategory(data.categories[category.id], category.id)
    if (result.error) return { ok: false, error: result.error }
    state[category.id] = result
  }

  const notes = {}
  const rawNotes =
    typeof data.notes === 'object' && data.notes !== null && !Array.isArray(data.notes)
      ? data.notes
      : {}
  for (const field of NOTE_FIELDS) {
    const raw = rawNotes[field.id]
    notes[field.id] = mdToHtml(raw)
  }

  return { ok: true, state, notes }
}

// Parse + repopulate the app's localStorage keys. `storage` is injectable so
// tests can pass a mock; defaults to the real localStorage.
export function importFromJson(text, storage = globalThis.localStorage) {
  const result = parseImport(text)
  if (!result.ok) return result
  if (!storage) return { ok: false, error: 'No storage available.' }
  storage.setItem(STORAGE_KEY, JSON.stringify(result.state))
  storage.setItem(NOTES_STORAGE_KEY, JSON.stringify(result.notes))
  return result
}
