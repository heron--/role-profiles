import { describe, expect, it } from 'vitest'
import { importFromJson, parseImport } from './importUtils.js'
import { buildJson } from './exportUtils.js'
import {
  CATEGORIES,
  NOTE_FIELDS,
  NOTES_STORAGE_KEY,
  ROLES,
  STORAGE_KEY,
} from './data.js'

// ---------- helpers ----------

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  }
}

const emptyState = () => CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: [] }), {})
const emptyNotes = () => NOTE_FIELDS.reduce((acc, f) => ({ ...acc, [f.id]: '' }), {})

const sampleState = {
  'who-i-am': ['Healer', 'Child', 'Survivor'],
  'who-i-am-not': ['Tyrant', 'Perpetrator'],
  'not-sure': ['Critic', 'Fool/Simpleton'],
  'who-i-want-to-be': ['Wise One', 'Peacemaker', 'Spiritual Leader'],
}

const sampleNotes = {
  standout: '<p>The <strong>Healer</strong> stands out.</p>',
  surprised: '<p>The <em>Critic</em> surprised me.</p>',
  other: '<p>Nothing else.</p>',
}

// ---------- parseImport ----------

describe('parseImport', () => {
  it('accepts the JSON produced by buildJson and round-trips state and notes', () => {
    const exported = buildJson(sampleState, sampleNotes)
    const result = parseImport(exported)

    expect(result.ok).toBe(true)
    expect(result.state).toEqual(sampleState)
  })

  it('converts markdown notes back to HTML with bold and italic preserved', () => {
    // buildJson exports notes as markdown (e.g. "**Healer**"), so the import
    // must restore the same bold/italic markup the editor saved.
    const exported = buildJson(sampleState, sampleNotes)
    const result = parseImport(exported)

    expect(result.ok).toBe(true)
    expect(result.notes.standout.trim()).toBe(
      '<p>The <strong>Healer</strong> stands out.</p>',
    )
    expect(result.notes.surprised.trim()).toBe(
      '<p>The <em>Critic</em> surprised me.</p>',
    )
  })

  it('produces a complete state with every category id, even when the file is empty', () => {
    const result = parseImport(
      JSON.stringify({
        categories: CATEGORIES.reduce(
          (acc, c) => ({ ...acc, [c.id]: { title: c.title, roles: [] } }),
          {},
        ),
        notes: {},
      }),
    )

    expect(result.ok).toBe(true)
    expect(result.state).toEqual(emptyState())
    expect(result.notes).toEqual(emptyNotes())
  })

  it('fills in missing categories and notes as empty', () => {
    const result = parseImport(
      JSON.stringify({ categories: { 'who-i-am': { roles: ['Healer'] } } }),
    )

    expect(result.ok).toBe(true)
    expect(result.state['who-i-am']).toEqual(['Healer'])
    expect(result.state['who-i-want-to-be']).toEqual([])
    expect(result.notes).toEqual(emptyNotes())
  })

  it('filters unknown roles and drops duplicate role entries', () => {
    const result = parseImport(
      JSON.stringify({
        categories: {
          'who-i-am': { roles: ['Healer', 'Not A Real Role', 'Healer', 'Child'] },
        },
      }),
    )

    expect(result.ok).toBe(true)
    expect(result.state['who-i-am']).toEqual(['Healer', 'Child'])
    expect(() => result.state['who-i-am'].forEach((r) => expect(ROLES).toContain(r))).not.toThrow()
  })

  it('tolerates categories given as plain role arrays', () => {
    const result = parseImport(
      JSON.stringify({ categories: { 'who-i-am': ['Healer'] } }),
    )

    expect(result.ok).toBe(true)
    expect(result.state['who-i-am']).toEqual(['Healer'])
  })

  it('rejects non-JSON text', () => {
    const result = parseImport('this is not json {{{')

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not valid JSON/i)
  })

  it('rejects JSON that is not an object', () => {
    const result = parseImport('[1, 2, 3]')

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/object/i)
  })

  it('rejects a file with no categories', () => {
    const result = parseImport(JSON.stringify({ notes: {} }))

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/categories/i)
  })

  it('rejects a category whose roles are not an array', () => {
    const result = parseImport(
      JSON.stringify({ categories: { 'who-i-am': { roles: 'Healer' } } }),
    )

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/who-i-am/)
  })

  it('treats a non-string or empty note value as empty', () => {
    const result = parseImport(
      JSON.stringify({
        categories: {},
        notes: { standout: '  ', surprised: 42, other: null },
      }),
    )

    expect(result.ok).toBe(true)
    expect(result.notes).toEqual(emptyNotes())
  })
})

// ---------- importFromJson (localStorage repopulation) ----------

describe('importFromJson', () => {
  it('repopulates both localStorage keys from an exported file', () => {
    const store = memoryStorage()
    const exported = buildJson(sampleState, sampleNotes)

    const result = importFromJson(exported, store)

    expect(result.ok).toBe(true)

    const storedState = JSON.parse(store.getItem(STORAGE_KEY))
    const storedNotes = JSON.parse(store.getItem(NOTES_STORAGE_KEY))

    expect(storedState).toEqual(sampleState)
    expect(storedNotes.standout.trim()).toBe(
      '<p>The <strong>Healer</strong> stands out.</p>',
    )
    expect(storedNotes.surprised.trim()).toBe(
      '<p>The <em>Critic</em> surprised me.</p>',
    )
  })

  it('writes state the app can load back (loadState-compatible shape)', () => {
    const store = memoryStorage()
    const exported = buildJson(sampleState, sampleNotes)

    importFromJson(exported, store)

    // Mirrors the app's loadState(): only known roles survive, every
    // category key must exist.
    const raw = JSON.parse(store.getItem(STORAGE_KEY))
    const reloaded = emptyState()
    for (const c of CATEGORIES) {
      const roles = raw[c.id]
      expect(Array.isArray(roles)).toBe(true)
      reloaded[c.id] = roles.filter((r) => ROLES.includes(r))
    }
    expect(reloaded).toEqual(sampleState)
  })

  it('leaves localStorage untouched when the file is invalid', () => {
    const store = memoryStorage()

    const result = importFromJson('not json', store)

    expect(result.ok).toBe(false)
    expect(store.getItem(STORAGE_KEY)).toBeNull()
    expect(store.getItem(NOTES_STORAGE_KEY)).toBeNull()
  })

  it('overwrites previous localStorage contents on re-import', () => {
    const store = memoryStorage()
    store.setItem(STORAGE_KEY, JSON.stringify({ 'who-i-am': ['Tyrant'] }))
    store.setItem(NOTES_STORAGE_KEY, JSON.stringify({ standout: '<p>old</p>' }))

    const exported = buildJson(sampleState, sampleNotes)
    const result = importFromJson(exported, store)

    expect(result.ok).toBe(true)
    expect(JSON.parse(store.getItem(STORAGE_KEY))).toEqual(sampleState)
    expect(JSON.parse(store.getItem(NOTES_STORAGE_KEY)).standout).toContain('Healer')
  })

  it('round-trips a fully empty export', () => {
    const store = memoryStorage()
    const exported = buildJson(emptyState(), emptyNotes())

    const result = importFromJson(exported, store)

    expect(result.ok).toBe(true)
    expect(JSON.parse(store.getItem(STORAGE_KEY))).toEqual(emptyState())
    expect(JSON.parse(store.getItem(NOTES_STORAGE_KEY))).toEqual(emptyNotes())
  })
})
