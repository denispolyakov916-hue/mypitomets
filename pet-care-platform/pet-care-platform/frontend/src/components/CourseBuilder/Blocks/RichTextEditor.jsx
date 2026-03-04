/**
 * RichTextEditor - WYSIWYG text editor powered by TipTap.
 *
 * Extensions: StarterKit, Image, Link, TextAlign, CharacterCount.
 * Includes toolbar with formatting, alignment, media insertion and undo/redo.
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import { useState, useCallback } from 'react'
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2,
  List, ListOrdered, Quote,
  Undo, Redo,
  Image as ImageIcon, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react'

function ToolbarButton({ onClick, isActive, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
      className={`
        p-1.5 rounded hover:bg-gray-100 transition-colors
        ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  )
}

function UrlModal({ title, initialUrl, onSubmit, onClose }) {
  const [url, setUrl] = useState(initialUrl || '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-4 w-96" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') { onSubmit(url); onClose() } }}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">Отмена</button>
          <button
            onClick={() => { onSubmit(url); onClose() }}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >Вставить</button>
        </div>
      </div>
    </div>
  )
}

function RichTextEditor({ content, onChange, placeholder = "Введите текст..." }) {
  const [showImageModal, setShowImageModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded-lg' } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 hover:text-blue-800 underline' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CharacterCount,
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3',
      },
    },
  })

  const addImage = useCallback((url) => {
    if (url && editor) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const setLink = useCallback((url) => {
    if (!editor) return
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return <div className="animate-pulse bg-gray-100 h-40 rounded" />

  const charCount = editor.storage.characterCount?.characters() ?? 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-2 py-1.5 flex flex-wrap gap-0.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Жирный">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Курсив">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Зачёркнутый">
          <Strikethrough size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-0.5 self-center" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="H1">
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="H2">
          <Heading2 size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-0.5 self-center" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Список">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Нумерованный">
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Цитата">
          <Quote size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-0.5 self-center" />

        <ToolbarButton onClick={() => setShowImageModal(true)} title="Изображение">
          <ImageIcon size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowLinkModal(true)} isActive={editor.isActive('link')} title="Ссылка">
          <LinkIcon size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-0.5 self-center" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="По левому краю">
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="По центру">
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="По правому краю">
          <AlignRight size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-0.5 self-center" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Отменить">
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Повторить">
          <Redo size={15} />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="min-h-[150px] max-h-[500px] overflow-y-auto" />

      {/* Character count */}
      <div className="bg-gray-50 border-t border-gray-200 px-3 py-1 text-xs text-gray-400 text-right">
        {charCount} символов
      </div>

      {/* Modals */}
      {showImageModal && (
        <UrlModal
          title="Вставить изображение"
          onSubmit={addImage}
          onClose={() => setShowImageModal(false)}
        />
      )}
      {showLinkModal && (
        <UrlModal
          title="Вставить ссылку"
          initialUrl={editor.getAttributes('link').href || ''}
          onSubmit={setLink}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  )
}

export default RichTextEditor
