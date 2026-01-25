/**
 * RichTextEditor - WYSIWYG редактор текста с TipTap
 *
 * Предоставляет полноценный редактор текста для создания контента курсов.
 * Включает форматирование, изображения, ссылки и другие возможности.
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Image as ImageIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react'

/**
 * ToolbarButton - Кнопка панели инструментов
 */
function ToolbarButton({ onClick, isActive, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded hover:bg-gray-100 transition-colors
        ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  )
}

/**
 * RichTextEditor - Основной компонент редактора
 */
function RichTextEditor({ content, onChange, placeholder = "Введите текст..." }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg'
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline'
        }
      })
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
        placeholder
      }
    }
  })

  /**
   * Добавление изображения
   */
  const addImage = useCallback(() => {
    const url = window.prompt('Введите URL изображения:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  /**
   * Добавление ссылки
   */
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Введите URL:', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return <div className="animate-pulse bg-gray-200 h-48 rounded"></div>
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Панель инструментов */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        {/* Форматирование текста */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Жирный"
        >
          <Bold size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Курсив"
        >
          <Italic size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Зачеркнутый"
        >
          <Strikethrough size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Заголовки */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Заголовок 1"
        >
          <Heading1 size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Заголовок 2"
        >
          <Heading2 size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Списки */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Маркированный список"
        >
          <List size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Нумерованный список"
        >
          <ListOrdered size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Цитата"
        >
          <Quote size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Медиа */}
        <ToolbarButton
          onClick={addImage}
          title="Вставить изображение"
        >
          <ImageIcon size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="Добавить ссылку"
        >
          <LinkIcon size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Выравнивание */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Выровнять по левому краю"
        >
          <AlignLeft size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Выровнять по центру"
        >
          <AlignCenter size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Выровнять по правому краю"
        >
          <AlignRight size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* История */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Отменить"
        >
          <Undo size={18} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Повторить"
        >
          <Redo size={18} />
        </ToolbarButton>
      </div>

      {/* Область редактирования */}
      <EditorContent
        editor={editor}
        className="min-h-[300px] max-h-[600px] overflow-y-auto"
      />

      {/* Счетчик символов */}
      <div className="bg-gray-50 border-t border-gray-300 px-4 py-2 text-sm text-gray-600">
        {editor.storage?.characterCount?.characters() || 0} символов
      </div>
    </div>
  )
}

export default RichTextEditor

