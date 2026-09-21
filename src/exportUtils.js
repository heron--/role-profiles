import TurndownService from 'turndown'
import { CATEGORIES, INTRO_TEXT, NOTE_FIELDS } from './data.js'

// HTML -> Markdown for the rich text note fields.
const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
})

turndown.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: (content) => `~~${content}~~`,
})

// TipTap emits `<p></p>` for an untouched field; treat that as empty.
function isEmptyHtml(html) {
  if (!html) return true
  const stripped = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return stripped === ''
}

function notesToMarkdownMap(notes) {
  const out = {}
  for (const field of NOTE_FIELDS) {
    const html = notes[field.id]
    out[field.id] = isEmptyHtml(html)
      ? ''
      : turndown.turndown(html).trim()
  }
  return out
}

export function buildMarkdown(state, notes) {
  const lines = []
  lines.push('# Role Profiles')
  lines.push('')
  lines.push(INTRO_TEXT)
  lines.push('')

  for (const category of CATEGORIES) {
    lines.push(`## ${category.title}`)
    lines.push('')
    const roles = state[category.id] || []
    if (roles.length === 0) {
      lines.push('_(no roles placed)_')
    } else {
      for (const role of roles) lines.push(`- ${role}`)
    }
    lines.push('')
  }

  const notesMd = notesToMarkdownMap(notes)
  lines.push('---')
  lines.push('')
  for (const field of NOTE_FIELDS) {
    lines.push(`## ${field.title}`)
    lines.push('')
    if (notesMd[field.id]) {
      lines.push(notesMd[field.id])
      lines.push('')
    }
    // Empty field: heading followed by just a blank line where the
    // content would be, so the section is still present.
  }

  return lines.join('\n').trim() + '\n'
}

export function buildJson(state, notes) {
  return JSON.stringify(
    {
      title: 'Role Profiles',
      exportedAt: new Date().toISOString(),
      categories: CATEGORIES.reduce((acc, c) => {
        acc[c.id] = { title: c.title, roles: state[c.id] || [] }
        return acc
      }, {}),
      notes: notesToMarkdownMap(notes),
    },
    null,
    2,
  )
}

export function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  // Legacy fallback for non-secure contexts.
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  ta.remove()
  return ok
}
