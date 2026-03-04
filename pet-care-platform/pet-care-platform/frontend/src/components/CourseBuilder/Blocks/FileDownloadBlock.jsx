/**
 * FileDownloadBlock - Блок загрузки файлов
 *
 * Позволяет прикреплять файлы (PDF, документы, изображения)
 * для скачивания пользователями курса.
 */

import { useState } from 'react'
import {
  File,
  Download,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  Archive
} from 'lucide-react'

/**
 * FileIcon - Иконка файла в зависимости от типа
 */
function FileIcon({ mimeType, size = 24 }) {
  if (mimeType?.startsWith('image/')) {
    return <ImageIcon size={size} />
  }
  if (mimeType?.startsWith('video/')) {
    return <FileVideo size={size} />
  }
  if (mimeType?.startsWith('audio/')) {
    return <FileAudio size={size} />
  }
  if (mimeType?.includes('pdf') || mimeType?.includes('document')) {
    return <FileText size={size} />
  }
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) {
    return <Archive size={size} />
  }
  return <File size={size} />
}

/**
 * FileItem - Элемент файла
 */
function FileItem({ file, index, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
      {/* Иконка файла */}
      <div className="text-gray-600">
        <FileIcon mimeType={file.mime_type} />
      </div>

      {/* Информация о файле */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="url"
              placeholder="URL файла"
              value={file.url || ''}
              onChange={(e) => onUpdate({ ...file, url: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Название файла"
              value={file.name || ''}
              onChange={(e) => onUpdate({ ...file, name: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Описание"
              value={file.description || ''}
              onChange={(e) => onUpdate({ ...file, description: e.target.value })}
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
          <div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name || 'Без названия'}
            </p>
            <p className="text-xs text-gray-600">
              {formatFileSize(file.size)}
              {file.description && ` • ${file.description}`}
            </p>
          </div>
        )}
      </div>

      {/* Кнопки управления */}
      <div className="flex items-center space-x-1">
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Редактировать"
          >
            ✏️
          </button>
        )}

        <button
          onClick={onDelete}
          className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Удалить"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/**
 * FileDownloadBlock - Основной компонент блока файлов
 */
function FileDownloadBlock({ content, settings, onChange, mode = 'edit' }) {
  const files = content?.files || []
  const title = content?.title || 'Материалы для скачивания'
  const description = content?.description || ''

  /**
   * Добавление файла
   */
  const addFile = () => {
    const newFiles = [
      ...files,
      {
        url: '',
        name: '',
        description: '',
        mime_type: '',
        size: 0
      }
    ]

    onChange({
      ...content,
      files: newFiles
    })
  }

  /**
   * Обновление файла
   */
  const updateFile = (index, fileData) => {
    const newFiles = [...files]
    newFiles[index] = fileData

    onChange({
      ...content,
      files: newFiles
    })
  }

  /**
   * Удаление файла
   */
  const deleteFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    onChange({
      ...content,
      files: newFiles
    })
  }

  /**
   * Загрузка файла
   */
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile) {
      // В реальном приложении здесь была бы загрузка на сервер
      const url = URL.createObjectURL(uploadedFile)
      const newFile = {
        url,
        name: uploadedFile.name,
        description: '',
        mime_type: uploadedFile.type,
        size: uploadedFile.size,
        is_local: true
      }

      const newFiles = [...files, newFile]
      onChange({
        ...content,
        files: newFiles
      })
    }
  }

  /**
   * Режим просмотра
   */
  if (mode === 'view') {
    if (files.length === 0) {
      return null
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Download className="text-blue-600" size={24} />
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileIcon mimeType={file.mime_type} size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.name || 'Без названия'}
                  </p>
                  {file.description && (
                    <p className="text-xs text-gray-600">{file.description}</p>
                  )}
                </div>
              </div>

              <a
                href={file.url}
                download={file.name}
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                <Download size={14} />
                <span>Скачать</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /**
   * Режим редактирования
   */
  return (
    <div className="space-y-4">
      {/* Заголовок и описание */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Заголовок блока
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange({
              ...content,
              title: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Материалы для скачивания"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Краткое описание
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => onChange({
              ...content,
              description: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Описание материалов"
          />
        </div>
      </div>

      {/* Список файлов */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Файлы ({files.length})</h4>

          <div className="flex space-x-2">
            <label className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 cursor-pointer">
              <Plus size={14} />
              <span>Загрузить</span>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={addFile}
              className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              <Plus size={14} />
              <span>Добавить по URL</span>
            </button>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <File className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Файлы не добавлены</p>
            <div className="flex justify-center space-x-3">
              <label className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer">
                Загрузить файл
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={addFile}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Добавить по URL
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file, index) => (
              <FileItem
                key={index}
                file={file}
                index={index}
                onUpdate={(data) => updateFile(index, data)}
                onDelete={() => deleteFile(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Настройки отображения */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-gray-900 mb-3">Настройки отображения</h5>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.show_file_size !== false}
              onChange={(e) => onChange({
                ...settings,
                show_file_size: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Показывать размер файла</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.show_file_type !== false}
              onChange={(e) => onChange({
                ...settings,
                show_file_type: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Показывать тип файла</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.download_required || false}
              onChange={(e) => onChange({
                ...settings,
                download_required: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Требовать скачивание для продолжения</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default FileDownloadBlock

