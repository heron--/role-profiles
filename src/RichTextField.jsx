import { useCallback, useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// One open text field with a small Bold/Italic toolbar, backed by TipTap.
// Content is stored/exposed as HTML; consumers convert to Markdown on export.
export default function RichTextField({ field, value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: value || '',
    // Re-render on selection changes so the B/I toolbar reflects the cursor.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'rte__content',
        'aria-label': field.title,
      },
    },
    onUpdate: ({ editor }) => onChange(field.id, editor.getHTML()),
  })

  const handleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run()
  }, [editor])

  // Sync external value changes (e.g. Reset) back into the editor.
  // Normal typing round-trips identically, so this is a no-op then.
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', {
        emitUpdate: false,
      })
    }
  }, [editor, value])

  const handleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run()
  }, [editor])

  return (
    <div className="rte">
      <label className="rte__label">{field.title}</label>
      <div className="rte__frame">
        <div className="rte__toolbar" role="toolbar" aria-label="Text formatting">
          <button
            type="button"
            className={`rte__btn${editor?.isActive('bold') ? ' rte__btn--active' : ''}`}
            onClick={handleBold}
            disabled={!editor}
            aria-pressed={editor?.isActive('bold') ?? false}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={`rte__btn${editor?.isActive('italic') ? ' rte__btn--active' : ''}`}
            onClick={handleItalic}
            disabled={!editor}
            aria-pressed={editor?.isActive('italic') ?? false}
            title="Italic"
          >
            <em>I</em>
          </button>
        </div>
        <EditorContent editor={editor} className="rte__editor" />
      </div>
      <p className="rte__hint">Select text and use B / I to bold or italicize.</p>
    </div>
  )
}
