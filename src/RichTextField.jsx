import { useCallback, useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Strikethrough,
} from 'lucide-react'

function ToolbarButton({
  label,
  onClick,
  children,
  active = false,
  toggle = false,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`rte__btn${active ? ' rte__btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={toggle ? active : undefined}
      title={label}
    >
      {children}
    </button>
  )
}

// An open reflection field backed by TipTap. Content is stored as HTML and
// converted to Markdown when it is exported.
export default function RichTextField({ field, value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: value || '',
    // Re-render on selection changes so the toolbar reflects the cursor.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'rte__content',
        'aria-label': field.title,
      },
    },
    onUpdate: ({ editor }) => onChange(field.id, editor.getHTML()),
  })

  // Sync external value changes (e.g. Reset) back into the editor.
  // Normal typing round-trips identically, so this is a no-op then.
  useEffect(() => {
    if (!editor) return
    const content = value || ''
    if (content === editor.getHTML() || (!content && editor.isEmpty)) return
    editor.commands.setContent(content, {
      emitUpdate: false,
    })
  }, [editor, value])

  const handleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run()
  }, [editor])

  const handleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run()
  }, [editor])

  const handleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run()
  }, [editor])

  const handleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run()
  }, [editor])

  const handleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run()
  }, [editor])

  const handleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run()
  }, [editor])

  const handleClearFormatting = useCallback(() => {
    editor?.chain().focus().unsetAllMarks().clearNodes().run()
  }, [editor])

  return (
    <div className="rte">
      <label className="rte__label">{field.title}</label>
      <div className="rte__frame">
        <div
          className="rte__toolbar"
          role="toolbar"
          aria-label={`Text formatting for ${field.title}`}
        >
          <div className="rte__toolbar-group">
            <ToolbarButton
              label="Bold"
              onClick={handleBold}
              active={editor?.isActive('bold') ?? false}
              toggle
              disabled={!editor}
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              label="Italic"
              onClick={handleItalic}
              active={editor?.isActive('italic') ?? false}
              toggle
              disabled={!editor}
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              label="Strikethrough"
              onClick={handleStrike}
              active={editor?.isActive('strike') ?? false}
              toggle
              disabled={!editor}
            >
              <Strikethrough size={16} aria-hidden="true" />
            </ToolbarButton>
          </div>

          <div className="rte__toolbar-group">
            <ToolbarButton
              label="Bulleted list"
              onClick={handleBulletList}
              active={editor?.isActive('bulletList') ?? false}
              toggle
              disabled={!editor}
            >
              <List size={16} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label="Numbered list"
              onClick={handleOrderedList}
              active={editor?.isActive('orderedList') ?? false}
              toggle
              disabled={!editor}
            >
              <ListOrdered size={16} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label="Block quote"
              onClick={handleBlockquote}
              active={editor?.isActive('blockquote') ?? false}
              toggle
              disabled={!editor}
            >
              <Quote size={16} aria-hidden="true" />
            </ToolbarButton>
          </div>

          <div className="rte__toolbar-group">
            <ToolbarButton
              label="Clear formatting"
              onClick={handleClearFormatting}
              disabled={!editor}
            >
              <RemoveFormatting size={16} aria-hidden="true" />
            </ToolbarButton>
          </div>
        </div>
        <EditorContent editor={editor} className="rte__editor" />
      </div>
      <p className="rte__hint">
        Use the toolbar to format your notes with emphasis, lists, and block quotes.
      </p>
    </div>
  )
}
