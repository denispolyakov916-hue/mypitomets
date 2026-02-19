/**
 * ContentBlock - Sortable content block with inline editing and floating toolbar.
 *
 * Uses @dnd-kit/sortable for within-page reordering.
 * Renders block content by type with edit capabilities.
 */

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import RichTextEditor from './Blocks/RichTextEditor'
import VideoPlayer from './Blocks/VideoPlayer'
import QuizBuilder from './Blocks/QuizBuilder'
import PetActionBlock from './Blocks/PetActionBlock'
import GalleryBlock from './Blocks/GalleryBlock'
import FileDownloadBlock from './Blocks/FileDownloadBlock'

const blockIcons = {
  rich_text: '📄', image: '🖼️', gallery: '🎴', file_download: '📎',
  video_player: '🎥', audio_player: '🎵', embed: '🔗', quiz: '❓',
  poll: '📊', checklist: '✅', timer: '⏱️', pet_action: '🎯',
  progress_tracker: '📈', comment_section: '💬', rating: '⭐',
}

const blockLabels = {
  rich_text: 'Текст', image: 'Изображение', gallery: 'Галерея', file_download: 'Файл',
  video_player: 'Видео', audio_player: 'Аудио', embed: 'Embed', quiz: 'Тест',
  poll: 'Опрос', checklist: 'Чек-лист', timer: 'Таймер', pet_action: 'Упражнение',
  progress_tracker: 'Прогресс', comment_section: 'Комментарии', rating: 'Оценка',
}

function ContentBlock({ block, isSelected, onSelect, onUpdate, onDelete }) {
  const [showToolbar, setShowToolbar] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `block-${block.id}`,
    data: { type: 'block', id: block.id, pageId: block.page || block.page_id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const renderContent = () => {
    const { block_type, content, settings } = block

    switch (block_type) {
      case 'rich_text':
        return (
          <RichTextEditor
            content={content?.html || ''}
            onChange={(html) => onUpdate({ ...block, content: { ...content, html } })}
            placeholder="Введите текст..."
          />
        )
      case 'image':
        return (
          <div className="text-center">
            {content?.url ? (
              <img src={content.url} alt={content.alt || ''} className="max-w-full h-auto rounded-lg shadow-sm" />
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                <span className="text-gray-400 text-sm">🖼️ Добавьте URL в свойствах</span>
              </div>
            )}
            {content?.caption && <p className="text-sm text-gray-500 mt-2">{content.caption}</p>}
          </div>
        )
      case 'video_player':
        return <VideoPlayer content={content} settings={settings} onChange={(c) => onUpdate({ ...block, content: c })} mode="edit" />
      case 'quiz':
        return <QuizBuilder content={content} settings={settings} onChange={(c) => onUpdate({ ...block, content: c })} mode="edit" />
      case 'pet_action':
        return <PetActionBlock content={content} settings={settings} onChange={(c) => onUpdate({ ...block, content: c })} mode="edit" />
      case 'gallery':
        return <GalleryBlock content={content} settings={settings} onChange={(c) => onUpdate({ ...block, content: c })} mode="edit" />
      case 'file_download':
        return <FileDownloadBlock content={content} settings={settings} onChange={(c) => onUpdate({ ...block, content: c })} mode="edit" />
      default:
        return (
          <div className="text-center py-6 text-gray-400">
            <span className="text-2xl block mb-1">{blockIcons[block_type] || '📦'}</span>
            <p className="text-xs">{blockLabels[block_type] || block_type}</p>
          </div>
        )
    }
  }

  const span = block.settings?.layout?.span || 12

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group bg-white border rounded-lg transition-all
        ${isSelected ? 'border-blue-500 shadow-md ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
        ${isDragging ? 'shadow-xl z-50' : ''}
      `}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      {/* Block type badge */}
      <div className="absolute -top-2.5 left-3 z-10">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-500 shadow-sm">
          {blockIcons[block.block_type] || '📦'}
          {blockLabels[block.block_type] || block.block_type}
          {span < 12 && <span className="text-blue-500 ml-0.5">{span}/12</span>}
        </span>
      </div>

      {/* Floating toolbar */}
      {(showToolbar || isSelected) && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 bg-white border border-gray-200 rounded-md shadow-sm px-1 py-0.5">
          {/* Drag handle */}
          <button
            {...listeners}
            {...attributes}
            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            title="Перетащить"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 text-gray-400 hover:text-red-500"
            title="Удалить блок"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Block content */}
      <div className="p-4 pt-5 min-h-[50px]">
        {renderContent()}
      </div>
    </div>
  )
}

export default ContentBlock
