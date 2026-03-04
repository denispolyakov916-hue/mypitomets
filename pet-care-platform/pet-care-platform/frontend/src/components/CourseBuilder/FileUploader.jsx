/**
 * FileUploader - Универсальный компонент загрузки файлов для Course Builder
 *
 * Поддерживает:
 * - Drag-and-drop загрузку
 * - Прогресс-бар
 * - Preview для изображений
 * - Типы: image (jpg/png/webp до 10 MB), video (mp4/webm до 2 GB), file (pdf/doc до 100 MB)
 */

import { useState, useRef, useCallback } from 'react'
import { uploadImage, uploadVideo, uploadFile } from '../../api/upload'

const FILE_CONFIGS = {
  image: {
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    maxSize: 10 * 1024 * 1024, // 10 MB
    maxSizeLabel: '10 MB',
    label: 'изображение',
    icon: '🖼️',
  },
  video: {
    accept: 'video/mp4,video/webm,video/quicktime',
    maxSize: 2 * 1024 * 1024 * 1024, // 2 GB
    maxSizeLabel: '2 GB',
    label: 'видео',
    icon: '🎬',
  },
  file: {
    accept: '.pdf,.doc,.docx,.zip,.txt',
    maxSize: 100 * 1024 * 1024, // 100 MB
    maxSizeLabel: '100 MB',
    label: 'файл',
    icon: '📄',
  },
}

/**
 * @param {string} type - Тип файла: 'image' | 'video' | 'file'
 * @param {Function} onUpload - Callback после успешной загрузки: (result) => void
 * @param {string} [currentUrl] - Текущий URL файла (для preview)
 * @param {string} [currentKey] - Текущий S3 ключ файла
 * @param {string} [className] - Дополнительные CSS классы
 * @param {string} [prefix] - Префикс пути в S3 для изображений
 */
function FileUploader({
  type = 'image',
  onUpload,
  currentUrl = null,
  currentKey = null,
  className = '',
  prefix = 'images',
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(currentUrl)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const config = FILE_CONFIGS[type] || FILE_CONFIGS.file

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return

    // Валидация размера
    if (file.size > config.maxSize) {
      setError(`Файл слишком большой. Максимум: ${config.maxSizeLabel}`)
      return
    }

    // Preview для изображений
    if (type === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(file)
    }

    setError(null)
    setUploading(true)
    setProgress(0)

    try {
      let result
      if (type === 'image') {
        result = await uploadImage(file, prefix, setProgress)
      } else if (type === 'video') {
        result = await uploadVideo(file, setProgress)
      } else {
        result = await uploadFile(file, setProgress)
      }

      setProgress(100)
      if (onUpload) onUpload(result)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Не удалось загрузить файл. Попробуйте ещё раз.')
      setPreview(currentUrl)
    } finally {
      setUploading(false)
    }
  }, [type, config, prefix, onUpload, currentUrl])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) handleFileSelect(file)
    // Reset input so the same file can be selected again
    e.target.value = ''
  }, [handleFileSelect])

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <div className={`${className}`}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
          ${uploading ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        {/* Preview для изображений */}
        {type === 'image' && preview && (
          <div className="mb-3">
            <img
              src={preview}
              alt="Preview"
              className="mx-auto max-h-32 rounded object-contain"
            />
          </div>
        )}

        {/* Текущий файл */}
        {(type === 'video' || type === 'file') && currentKey && (
          <div className="mb-3 text-sm text-green-600">
            <span className="inline-block mr-1">✓</span>
            Файл загружен: {currentKey.split('/').pop()}
          </div>
        )}

        {/* Иконка и текст */}
        {!uploading && (
          <div>
            <div className="text-3xl mb-2">{config.icon}</div>
            <p className="text-sm text-gray-600">
              Перетащите {config.label} сюда или{' '}
              <span className="text-blue-600 underline">выберите файл</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Максимум: {config.maxSizeLabel}
            </p>
          </div>
        )}

        {/* Прогресс загрузки */}
        {uploading && (
          <div className="py-2">
            <div className="text-sm text-blue-600 mb-2">
              Загрузка... {progress}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={config.accept}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Ошибка */}
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}

export default FileUploader
