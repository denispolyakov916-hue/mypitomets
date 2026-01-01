/**
 * CourseImportExport - Импорт и экспорт курсов
 *
 * Позволяет экспортировать курсы в JSON формат и импортировать их обратно.
 * Полезно для резервного копирования и переноса курсов между системами.
 */

import { useState, useRef } from 'react'
import {
  Download,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
  Save,
  FolderOpen
} from 'lucide-react'

/**
 * ExportDialog - Диалог экспорта курса
 */
function ExportDialog({ course, isOpen, onClose, onExport }) {
  const [includeAnalytics, setIncludeAnalytics] = useState(false)
  const [includeUserData, setIncludeUserData] = useState(false)
  const [format, setFormat] = useState('json')

  const handleExport = () => {
    onExport({
      includeAnalytics,
      includeUserData,
      format
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Download className="mr-2" size={20} />
          Экспорт курса
        </h3>

        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Info size={16} className="text-blue-600" />
              <span className="font-medium text-blue-900">Экспортируемый курс</span>
            </div>
            <p className="text-sm text-blue-800">{course?.title}</p>
            <p className="text-xs text-blue-600 mt-1">
              {course?.pages?.length || 0} страниц, {course?.pages?.reduce((sum, page) => sum + (page.blocks?.length || 0), 0) || 0} блоков
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Формат экспорта
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="json">JSON (рекомендуется)</option>
              <option value="yaml">YAML</option>
              <option value="xml">XML</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeAnalytics}
                onChange={(e) => setIncludeAnalytics(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Включить аналитику использования</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeUserData}
                onChange={(e) => setIncludeUserData(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Включить данные пользователей</span>
            </label>
          </div>

          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
            <p><strong>Примечание:</strong> Экспортированный файл содержит всю структуру курса, но не включает медиа-файлы. Их нужно будет загрузить отдельно при импорте.</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Экспортировать</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * ImportDialog - Диалог импорта курса
 */
function ImportDialog({ isOpen, onClose, onImport }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef()

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setSelectedFile(file)
    setLoading(true)

    try {
      // Читаем содержимое файла
      const text = await file.text()
      let data

      if (file.name.endsWith('.json')) {
        data = JSON.parse(text)
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        // Для YAML нужна дополнительная библиотека, пока просто покажем ошибку
        throw new Error('Формат YAML пока не поддерживается')
      } else if (file.name.endsWith('.xml')) {
        throw new Error('Формат XML пока не поддерживается')
      } else {
        throw new Error('Неподдерживаемый формат файла')
      }

      // Валидация структуры
      if (!data.title || !Array.isArray(data.pages)) {
        throw new Error('Некорректная структура файла курса')
      }

      setPreview({
        title: data.title,
        description: data.description,
        pagesCount: data.pages.length,
        blocksCount: data.pages.reduce((sum, page) => sum + (page.blocks?.length || 0), 0),
        data
      })
    } catch (error) {
      setPreview({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = () => {
    if (preview && preview.data) {
      onImport(preview.data)
    }
  }

  const resetDialog = () => {
    setSelectedFile(null)
    setPreview(null)
    setLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Upload className="mr-2" size={20} />
          Импорт курса
        </h3>

        {!selectedFile ? (
          <div className="space-y-4">
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Выберите файл курса для импорта</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml,.xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Выбрать файл
              </button>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
              <p><strong>Поддерживаемые форматы:</strong> JSON, YAML, XML</p>
              <p><strong>Примечание:</strong> Медиа-файлы нужно будет загрузить отдельно после импорта структуры курса.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Анализ файла...</p>
              </div>
            ) : preview?.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="font-medium text-red-900">Ошибка в файле</span>
                </div>
                <p className="text-sm text-red-800">{preview.error}</p>
                <button
                  onClick={resetDialog}
                  className="mt-3 text-sm text-red-600 hover:text-red-800"
                >
                  Выбрать другой файл
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="font-medium text-green-900">Файл готов к импорту</span>
                  </div>
                  <div className="text-sm text-green-800">
                    <p><strong>Название:</strong> {preview.title}</p>
                    <p><strong>Страниц:</strong> {preview.pagesCount}</p>
                    <p><strong>Блоков:</strong> {preview.blocksCount}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p><strong>Внимание:</strong> Импорт заменит текущий курс. Убедитесь, что у вас есть резервная копия.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => {
              onClose()
              resetDialog()
            }}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Отмена
          </button>

          {preview && !preview.error && !loading && (
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <Upload size={16} />
              <span>Импортировать</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * CourseImportExport - Основной компонент импорта/экспорта
 */
function CourseImportExport({ course, onImportSuccess }) {
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [exporting, setExporting] = useState(false)

  /**
   * Экспорт курса
   */
  const handleExport = async (options) => {
    try {
      setExporting(true)

      // TODO: Реализовать реальный экспорт через API
      // const exportData = await exportCourse(course.id, options)

      // Пока создаем моковые данные
      const exportData = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          pet_type: course.pet_type,
          category: course.category,
          level: course.level,
          format_type: course.format_type,
          pages: course.pages?.map(page => ({
            id: page.id,
            title: page.title,
            order_number: page.order_number,
            page_type: page.page_type,
            settings: page.settings,
            blocks: page.blocks?.map(block => ({
              id: block.id,
              block_type: block.block_type,
              order: block.order,
              content: block.content,
              settings: block.settings
            })) || []
          })) || []
        }
      }

      // Создаем и скачиваем файл
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${course.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setShowExportDialog(false)
    } catch (error) {
      console.error('Error exporting course:', error)
    } finally {
      setExporting(false)
    }
  }

  /**
   * Импорт курса
   */
  const handleImport = async (importData) => {
    try {
      // TODO: Реализовать реальный импорт через API
      console.log('Importing course:', importData)

      // Имитация успешного импорта
      setTimeout(() => {
        onImportSuccess && onImportSuccess(importData)
        setShowImportDialog(false)
      }, 1000)

    } catch (error) {
      console.error('Error importing course:', error)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Импорт и экспорт</h3>
        <p className="text-sm text-gray-600 mt-1">
          Сохраняйте и восстанавливайте курсы
        </p>
      </div>

      {/* Основной контент */}
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Экспорт */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Download className="text-blue-600" size={24} />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Экспорт курса</h4>
                <p className="text-sm text-gray-600">
                  Сохраните курс в файл для резервной копии или переноса
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p>Текущий курс: <strong>{course?.title}</strong></p>
                <p>{course?.pages?.length || 0} страниц, {course?.pages?.reduce((sum, page) => sum + (page.blocks?.length || 0), 0) || 0} блоков</p>
              </div>

              <button
                onClick={() => setShowExportDialog(true)}
                disabled={exporting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Download size={16} />
                <span>{exporting ? 'Экспорт...' : 'Экспортировать'}</span>
              </button>
            </div>
          </div>

          {/* Импорт */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Upload className="text-green-600" size={24} />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Импорт курса</h4>
                <p className="text-sm text-gray-600">
                  Загрузите курс из ранее сохраненного файла
                </p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowImportDialog(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Upload size={16} />
                <span>Выбрать файл для импорта</span>
              </button>
            </div>
          </div>

          {/* Информация */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="text-yellow-600 mt-0.5" size={16} />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Важная информация:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Экспортированные курсы не включают медиа-файлы (изображения, видео)</li>
                  <li>При импорте существующий курс будет полностью заменен</li>
                  <li>Рекомендуется создавать резервные копии перед импортом</li>
                  <li>Поддерживаемые форматы: JSON (основной), YAML и XML (экспериментально)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* История экспортов (будущая функция) */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Недавние экспорты</h4>
            <div className="text-center py-8 text-gray-500">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>История экспортов пока не реализована</p>
              <p className="text-xs mt-1">Файлы сохраняются локально в вашем браузере</p>
            </div>
          </div>
        </div>
      </div>

      {/* Диалоги */}
      <ExportDialog
        course={course}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
      />

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
    </div>
  )
}

export default CourseImportExport

