import { useCallback, useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Undo2,
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
    const current = editor.getHTML()
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', {
        emitUpdate: false,
      })
    }
  }, [editor, value])

  const handleTextStyle = useCallback(
    (style) => {
      if (!editor) return
      const chain = editor.chain().focus()
      if (style === 'paragraph') {
        chain.setParagraph().run()
        return
      }
      chain.setHeading({ level: Number(style) }).run()
    },
    [editor],
  )

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

  const handleUndo = useCallback(() => {
    editor?.chain().focus().undo().run()
  }, [editor])

  const handleRedo = useCallback(() => {
    editor?.chain().focus().redo().run()
  }, [editor])

  const textStyle = editor?.isActive('heading', { level: 1 })
    ? '1'
    : editor?.isActive('heading', { level: 2 })
      ? '2'
      : editor?.isActive('heading', { level: 3 })
        ? '3'
        : 'paragraph'

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
              label="Undo"
              onClick={handleUndo}
              disabled={!editor?.can().undo()}
            >
              <Undo2 size={16} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label="Redo"
              onClick={handleRedo}
              disabled={!editor?.can().redo()}
            >
              <Redo2 size={16} aria-hidden="true" />
            </ToolbarButton>
          </div>

          <div className="rte__toolbar-group">
            <label className="rte__select-label">
              <span className="sr-only">Text style</span>
              <select
                className="rte__select"
                value={textStyle}
                onChange={(event) => handleTextStyle(event.target.value)}
                disabled={!editor}
                aria-label="Text style"
              >
                <option value="paragraph">Paragraph</option>
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
              </select>
            </label>
          </div>

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
        Add headings, lists, quotes, and emphasis with the formatting toolbar.
      </p>
    </div>
  )
}
