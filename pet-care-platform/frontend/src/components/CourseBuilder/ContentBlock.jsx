/**
 * ContentBlock - Блок контента на странице
 *
 * Представляет собой отдельный блок контента с возможностью редактирования.
 * Поддерживает различные типы блоков (текст, изображение, видео и т.д.)
 */

import { useDraggable } from '@dnd-kit/core'
import RichTextEditor from './Blocks/RichTextEditor'
import VideoPlayer from './Blocks/VideoPlayer'
import QuizBuilder from './Blocks/QuizBuilder'
import PetActionBlock from './Blocks/PetActionBlock'
import GalleryBlock from './Blocks/GalleryBlock'
import FileDownloadBlock from './Blocks/FileDownloadBlock'

/**
 * ContentBlock - Перетаскиваемый блок контента
 */
function ContentBlock({ block, isSelected, onSelect, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${block.id}`,
    data: {
      type: 'block',
      id: block.id,
      pageId: block.page_id,
      blockType: block.block_type
    }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  /**
   * Получение иконки для типа блока
   */
  const getBlockIcon = (blockType) => {
    const icons = {
      rich_text: '📄',
      image: '🖼️',
      gallery: '🎴',
      file_download: '📎',
      video_player: '🎥',
      audio_player: '🎵',
      embed: '🔗',
      quiz: '❓',
      poll: '📊',
      checklist: '✅',
      timer: '⏱️',
      pet_action: '🎯',
      progress_tracker: '📈',
      comment_section: '💬',
      rating: '⭐'
    }
    return icons[blockType] || '📦'
  }

  /**
   * Рендеринг содержимого блока в зависимости от типа
   */
  const renderBlockContent = () => {
    const { block_type, content } = block

    switch (block_type) {
      case 'rich_text':
        return (
          <RichTextEditor
            content={content?.html || ''}
            onChange={(html) => onUpdate({
              ...block,
              content: { ...content, html }
            })}
            placeholder="Введите текст..."
          />
        )

      case 'image':
        return (
          <div className="text-center">
            {content?.url ? (
              <img
                src={content.url}
                alt={content.alt || ''}
                className="max-w-full h-auto rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Изображение</span>
              </div>
            )}
            {content?.caption && (
              <p className="text-sm text-gray-600 mt-2">{content.caption}</p>
            )}
          </div>
        )

      case 'video_player':
        return (
          <VideoPlayer
            content={content}
            settings={block.settings}
            onChange={(newContent) => onUpdate({
              ...block,
              content: newContent
            })}
            mode="edit"
          />
        )

      case 'quiz':
        return (
          <QuizBuilder
            content={content}
            settings={block.settings}
            onChange={(newContent) => onUpdate({
              ...block,
              content: newContent
            })}
            mode="edit"
          />
        )

      case 'pet_action':
        return (
          <PetActionBlock
            content={content}
            settings={block.settings}
            onChange={(newContent) => onUpdate({
              ...block,
              content: newContent
            })}
            mode="edit"
          />
        )

      case 'gallery':
        return (
          <GalleryBlock
            content={content}
            settings={block.settings}
            onChange={(newContent) => onUpdate({
              ...block,
              content: newContent
            })}
            mode="edit"
          />
        )

      case 'file_download':
        return (
          <FileDownloadBlock
            content={content}
            settings={block.settings}
            onChange={(newContent) => onUpdate({
              ...block,
              content: newContent
            })}
            mode="edit"
          />
        )

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <span className="text-3xl mb-2 block">{getBlockIcon(block_type)}</span>
            <p>{block.block_type_display || block_type}</p>
          </div>
        )
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative bg-white border rounded-lg p-4 cursor-pointer transition-all
        ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-300 hover:border-gray-400'}
        ${isDragging ? 'opacity-50 shadow-xl' : ''}
      `}
      onClick={onSelect}
    >
      {/* Заголовок блока */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getBlockIcon(block.block_type)}</span>
          <span className="text-sm font-medium text-gray-900">
            {block.block_type_display || block.block_type}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {/* Кнопка перетаскивания */}
          <button
            {...listeners}
            {...attributes}
            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab"
            title="Перетащить блок"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>

          {/* Кнопка удаления */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Удалить блок"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Содержимое блока */}
      <div className="min-h-[60px]">
        {renderBlockContent()}
      </div>

      {/* Индикатор выбора */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default ContentBlock
