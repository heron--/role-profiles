import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import RichTextField from './RichTextField.jsx'
import { ClipboardCopy, Check, FileDown, FileJson, Printer, Upload } from 'lucide-react'
import {
  CATEGORIES,
  ROLES,
  INTRO_TEXT,
  NOTE_FIELDS,
  STORAGE_KEY,
  NOTES_STORAGE_KEY,
} from './data.js'
import {
  buildJson,
  buildMarkdown,
  copyText,
  downloadText,
} from './exportUtils.js'
import { importFromJson } from './importUtils.js'

const emptyNotes = () =>
  NOTE_FIELDS.reduce((acc, f) => ({ ...acc, [f.id]: '' }), {})

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return emptyNotes()
    const parsed = JSON.parse(raw)
    const base = emptyNotes()
    for (const f of NOTE_FIELDS) {
      if (typeof parsed[f.id] === 'string') base[f.id] = parsed[f.id]
    }
    return base
  } catch {
    return emptyNotes()
  }
}

const emptyState = () =>
  CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: [] }), {})

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    // Merge onto a fresh empty state so any new/renamed category is handled
    // gracefully and only known roles survive a data change.
    const base = emptyState()
    for (const c of CATEGORIES) {
      if (Array.isArray(parsed[c.id])) {
        base[c.id] = parsed[c.id].filter((r) => ROLES.includes(r))
      }
    }
    return base
  } catch {
    return emptyState()
  }
}

// A role chip living in the role bank — draggable source.
function BankRole({ role, placedCount }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `bank:${role}`,
    data: { role },
  })
  return (
    <button
      ref={setNodeRef}
      className={`chip chip--bank${isDragging ? ' chip--dragging' : ''}${
        placedCount > 0 ? ' chip--placed' : ''
      }`}
      {...listeners}
      {...attributes}
      title={placedCount > 0 ? `Placed in ${placedCount} categor${placedCount === 1 ? 'y' : 'ies'}` : 'Drag into a category'}
    >
      <span className="chip__label">{role}</span>
      {placedCount > 0 && <span className="chip__badge">{placedCount}</span>}
    </button>
  )
}

// A role chip that has been placed in a category — removable.
function PlacedRole({ role, categoryId, onRemove }) {
  return (
    <span className="chip chip--placed-in-cat">
      <span className="chip__label">{role}</span>
      <button
        className="chip__remove"
        aria-label={`Remove ${role} from this category`}
        onClick={() => onRemove(categoryId, role)}
      >
        ×
      </button>
    </span>
  )
}

function CategoryColumn({ category, roles, onRemove, isOver, setNodeRef }) {
  return (
    <section
      ref={setNodeRef}
      className={`column${isOver ? ' column--over' : ''}`}
      aria-label={category.title}
    >
      <header className="column__header">
        <h2 className="column__title">{category.title}</h2>
        <span className="column__count">{roles.length}</span>
      </header>
      <div className="column__body">
        {roles.length === 0 ? (
          <p className="column__empty">Drag roles here</p>
        ) : (
          <div className="chip-wrap">
            {roles.map((role) => (
              <PlacedRole
                key={role}
                role={role}
                categoryId={category.id}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// Wrapper so each column can register its own droppable node.
function DroppableColumn(props) {
  const { setNodeRef, isOver } = useDroppable({ id: props.category.id })
  return <CategoryColumn {...props} setNodeRef={setNodeRef} isOver={isOver} />
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [activeRole, setActiveRole] = useState(null)
  const [notes, setNotes] = useState(loadNotes)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  // Stable identity so each editor's onUpdate closure never goes stale.
  const handleNoteChange = useCallback((id, html) => {
    setNotes((prev) => ({ ...prev, [id]: html }))
  }, [])

  const placedCounts = useMemo(() => {
    const counts = {}
    for (const roles of Object.values(state)) {
      for (const role of roles) counts[role] = (counts[role] || 0) + 1
    }
    return counts
  }, [state])

  const totalPlaced = useMemo(
    () => Object.values(state).reduce((n, r) => n + r.length, 0),
    [state],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  )

  function handleDragStart(event) {
    setActiveRole(event.active.data.current?.role ?? null)
  }

  function handleDragEnd(event) {
    setActiveRole(null)
    const { active, over } = event
    if (!over) return
    const role = active.data.current?.role
    const categoryId = over.id
    if (!role || !state[categoryId]) return
    setState((prev) => {
      if (prev[categoryId].includes(role)) return prev // already there, no dupes
      return { ...prev, [categoryId]: [...prev[categoryId], role] }
    })
  }

  function handleRemove(categoryId, role) {
    setState((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].filter((r) => r !== role),
    }))
  }

  function handleReset() {
    if (
      totalPlaced === 0 ||
      window.confirm(
        'Clear every category and all notes and start over? This cannot be undone.',
      )
    ) {
      setState(emptyState())
      setNotes(emptyNotes())
    }
  }

  async function handleCopyMarkdown() {
    const ok = await copyText(buildMarkdown(state, notes))
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleDownloadMarkdown() {
    downloadText('role-profiles.md', buildMarkdown(state, notes), 'text/markdown')
  }

  function handleDownloadJson() {
    downloadText('role-profiles.json', buildJson(state, notes), 'application/json')
  }

  const fileInputRef = useRef(null)

  const hasAnyData = useMemo(
    () =>
      totalPlaced > 0 ||
      Object.values(notes).some((n) => n && n.replace(/<[^>]+>/g, '').trim()),
    [totalPlaced, notes],
  )

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-importing the same file
    if (!file) return
    file.text().then((text) => {
      if (
        hasAnyData &&
        !window.confirm(
          'Replace your current roles and notes with the imported file?',
        )
      ) {
        return
      }
      const result = importFromJson(text)
      if (!result.ok) {
        window.alert(`Could not import: ${result.error}`)
        return
      }
      setState(result.state)
      setNotes(result.notes)
    })
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveRole(null)}
    >
      <div className="app">
        <header className="app__intro">
          <div className="app__intro-inner">
            <div className="app__intro-top">
              <p className="app__eyebrow">
                A drama therapy self-reflection exercise
              </p>
              <div
                className="app__actions"
                role="toolbar"
                aria-label="Import, export, and print"
              >
                <button
                  type="button"
                  className="btn--icon"
                  data-tooltip="Import from JSON file"
                  aria-label="Import from JSON file"
                  onClick={handleImportClick}
                >
                  <Upload size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn--icon"
                  data-tooltip={copied ? 'Copied as Markdown' : 'Copy content as Markdown'}
                  aria-label={copied ? 'Copied as Markdown' : 'Copy content as Markdown'}
                  onClick={handleCopyMarkdown}
                >
                  {copied ? <Check size={16} aria-hidden="true" /> : <ClipboardCopy size={16} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="btn--icon"
                  data-tooltip="Download content as Markdown"
                  aria-label="Download content as Markdown"
                  onClick={handleDownloadMarkdown}
                >
                  <FileDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn--icon"
                  data-tooltip="Download content as JSON"
                  aria-label="Download content as JSON"
                  onClick={handleDownloadJson}
                >
                  <FileJson size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn--icon"
                  data-tooltip="Print (4 columns)"
                  aria-label="Print"
                  onClick={() => window.print()}
                >
                  <Printer size={16} aria-hidden="true" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
                aria-hidden="true"
                tabIndex={-1}
              />
            </div>
            <h1 className="app__title">Role Profiles</h1>
            <p className="app__instruction">{INTRO_TEXT}</p>
          </div>
        </header>

        <main className="app__main">
          <aside className="bank">
            <div className="bank__header">
              <h2 className="bank__title">Role Bank</h2>
              <button className="btn btn--ghost" onClick={handleReset}>
                Reset
              </button>
            </div>
            <p className="bank__hint">
              Drag a role into any category. The same role can live in several
              categories at once.
            </p>
            <div className="chip-wrap bank__chips">
              {ROLES.map((role) => (
                <BankRole
                  key={role}
                  role={role}
                  placedCount={placedCounts[role] || 0}
                />
              ))}
            </div>
          </aside>

          <div className="board">
            {CATEGORIES.map((category) => (
              <DroppableColumn
                key={category.id}
                category={category}
                roles={state[category.id]}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </main>

        <section className="notes" aria-label="Open reflection notes">
          <h2 className="notes__title">Reflections</h2>
          <p className="notes__hint">
            Free-write below. Your notes are saved in this browser and are
            included when you copy, download, or print.
          </p>
          <div className="notes__fields">
            {NOTE_FIELDS.map((field) => (
              <RichTextField
                key={field.id}
                field={field}
                value={notes[field.id]}
                onChange={handleNoteChange}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Print-only view: 4 columns, one per category, vertical role lists. */}
      <div className="print-view" aria-hidden="true">
        <h1 className="print-view__title">Role Profiles</h1>
        <div className="print-view__grid">
          {CATEGORIES.map((category) => (
            <div className="print-view__col" key={category.id}>
              <h2 className="print-view__col-title">{category.title}</h2>
              {(state[category.id] || []).length > 0 ? (
                <ul className="print-view__list">
                  {(state[category.id] || []).map((role) => (
                    <li key={role}>{role}</li>
                  ))}
                </ul>
              ) : (
                <p className="print-view__empty">&mdash;</p>
              )}
            </div>
          ))}
        </div>
        {NOTE_FIELDS.some((f) => notes[f.id] && notes[f.id].replace(/<[^>]+>/g, '').trim()) && (
          <div className="print-view__notes">
            {NOTE_FIELDS.map((f) => {
              const html = notes[f.id]
              if (!html || !html.replace(/<[^>]+>/g, '').trim()) return null
              return (
                <div className="print-view__note" key={f.id}>
                  <h2 className="print-view__note-title">{f.title}</h2>
                  <div
                    className="print-view__note-body"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeRole ? (
          <span className="chip chip--overlay">
            <span className="chip__label">{activeRole}</span>
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
