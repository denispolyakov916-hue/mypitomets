/**
 * GalleryBlock - Блок галереи изображений
 *
 * Позволяет отображать несколько изображений с подписями
 * и настройками отображения.
 */

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Image as ImageIcon, Grid, List } from 'lucide-react'

/**
 * ImageItem - Элемент галереи
 */
function ImageItem({ image, index, onUpdate, onDelete, onMove }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="relative group">
      {/* Изображение */}
      <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
        {image.url ? (
          <img
            src={image.url}
            alt={image.alt || ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="text-gray-400" size={48} />
          </div>
        )}

        {/* Кнопки управления */}
        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-white/90 hover:bg-white p-1 rounded text-gray-700"
            title="Редактировать"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="bg-red-500/90 hover:bg-red-500 p-1 rounded text-white"
            title="Удалить"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Перетаскивание */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="bg-white/90 hover:bg-white p-1 rounded text-gray-700 cursor-grab">
            <GripVertical size={14} />
          </button>
        </div>
      </div>

      {/* Подпись */}
      {isEditing ? (
        <div className="mt-2 space-y-2">
          <input
            type="url"
            placeholder="URL изображения"
            value={image.url || ''}
            onChange={(e) => onUpdate({ ...image, url: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Подпись"
            value={image.caption || ''}
            onChange={(e) => onUpdate({ ...image, caption: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Alt текст"
            value={image.alt || ''}
            onChange={(e) => onUpdate({ ...image, alt: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => setIsEditing(false)}
            className="w-full bg-blue-600 text-white py-1 px-2 rounded text-sm hover:bg-blue-700"
          >
            Сохранить
          </button>
        </div>
      ) : (
        image.caption && (
          <p className="mt-2 text-sm text-gray-600 text-center">{image.caption}</p>
        )
      )}
    </div>
  )
}

/**
 * GalleryBlock - Основной компонент галереи
 */
function GalleryBlock({ content, settings, onChange, mode = 'edit' }) {
  const images = content?.images || []
  const layout = settings?.layout || 'grid'
  const columns = settings?.columns || 3
  const showCaptions = settings?.show_captions !== false

  /**
   * Добавление изображения
   */
  const addImage = () => {
    const newImages = [
      ...images,
      {
        url: '',
        caption: '',
        alt: ''
      }
    ]

    onChange({
      ...content,
      images: newImages
    })
  }

  /**
   * Обновление изображения
   */
  const updateImage = (index, imageData) => {
    const newImages = [...images]
    newImages[index] = imageData

    onChange({
      ...content,
      images: newImages
    })
  }

  /**
   * Удаление изображения
   */
  const deleteImage = (index) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange({
      ...content,
      images: newImages
    })
  }

  /**
   * Перемещение изображения
   */
  const moveImage = (fromIndex, toIndex) => {
    const newImages = [...images]
    const [moved] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, moved)

    onChange({
      ...content,
      images: newImages
    })
  }

  /**
   * Режим просмотра
   */
  if (mode === 'view') {
    if (images.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon size={48} className="mx-auto mb-2 text-gray-300" />
          <p>Галерея пуста</p>
        </div>
      )
    }

    return (
      <div className={`gallery-${layout}`}>
        {layout === 'grid' ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(columns, images.length)}, 1fr)`
            }}
          >
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  {image.url ? (
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="text-gray-400" size={32} />
                    </div>
                  )}
                </div>
                {showCaptions && image.caption && (
                  <p className="mt-2 text-sm text-gray-600 text-center">{image.caption}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {images.map((image, index) => (
              <div key={index} className="flex space-x-4">
                <div className="w-32 h-24 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                  {image.url ? (
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="text-gray-400" size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  {showCaptions && image.caption && (
                    <p className="text-gray-900">{image.caption}</p>
                  )}
                  {image.alt && (
                    <p className="text-sm text-gray-600 mt-1">{image.alt}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /**
   * Режим редактирования
   */
  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Галерея изображений</h4>
        <button
          onClick={addImage}
          className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          <Plus size={14} />
          <span>Добавить изображение</span>
        </button>
      </div>

      {/* Галерея */}
      {images.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Галерея пуста</p>
          <button
            onClick={addImage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Добавить первое изображение
          </button>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`
          }}
        >
          {images.map((image, index) => (
            <ImageItem
              key={index}
              image={image}
              index={index}
              onUpdate={(data) => updateImage(index, data)}
              onDelete={() => deleteImage(index)}
              onMove={moveImage}
            />
          ))}
        </div>
      )}

      {/* Настройки галереи */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-gray-900 mb-3">Настройки отображения</h5>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Макет
            </label>
            <select
              value={layout}
              onChange={(e) => onChange({
                ...settings,
                layout: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="grid">Сетка</option>
              <option value="list">Список</option>
            </select>
          </div>

          {layout === 'grid' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Колонок
              </label>
              <select
                value={columns}
                onChange={(e) => onChange({
                  ...settings,
                  columns: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="2">2 колонки</option>
                <option value="3">3 колонки</option>
                <option value="4">4 колонки</option>
                <option value="5">5 колонок</option>
              </select>
            </div>
          )}

          <label className="flex items-center col-span-2">
            <input
              type="checkbox"
              checked={showCaptions}
              onChange={(e) => onChange({
                ...settings,
                show_captions: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Показывать подписи</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default GalleryBlock

