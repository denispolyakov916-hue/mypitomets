/**
 * BlockTemplates - Система шаблонов блоков
 *
 * Позволяет сохранять часто используемые блоки как шаблоны
 * и использовать их для быстрого создания контента.
 */

import { useState, useEffect } from 'react'
import {
  Save,
  Star,
  Search,
  Grid,
  List,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy
} from 'lucide-react'
import { getBlockTemplates, createBlockTemplate, useBlockTemplate } from '../../../api/courses'

/**
 * TemplateCard - Карточка шаблона
 */
function TemplateCard({ template, onUse, onEdit, onDelete, viewMode = 'grid' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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

  if (viewMode === 'list') {
    return (
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
        <div className="flex items-center space-x-4">
          <span className="text-2xl">{getBlockIcon(template.block_type)}</span>
          <div>
            <h4 className="font-medium text-gray-900">{template.name}</h4>
            <p className="text-sm text-gray-600">{template.description}</p>
            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
              <span>{template.category_display}</span>
              <span>Использован {template.usage_count} раз</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onUse(template)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Использовать
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <MoreVertical size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10">
                <button
                  onClick={() => {
                    onEdit(template)
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => {
                    onDelete(template)
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getBlockIcon(template.block_type)}</span>
          {template.usage_count > 10 && (
            <Star className="text-yellow-500" size={16} />
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10">
              <button
                onClick={() => {
                  onEdit(template)
                  setIsMenuOpen(false)
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Редактировать
              </button>
              <button
                onClick={() => {
                  onDelete(template)
                  setIsMenuOpen(false)
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
        <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span className="bg-gray-100 px-2 py-1 rounded">
            {template.category_display}
          </span>
        </div>

        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Copy size={12} />
          <span>{template.usage_count}</span>
        </div>
      </div>

      <button
        onClick={() => onUse(template)}
        className="w-full mt-4 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
      >
        Использовать шаблон
      </button>
    </div>
  )
}

/**
 * TemplateCreator - Создание нового шаблона
 */
function TemplateCreator({ blockType, content, settings, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('text')
  const [isPublic, setIsPublic] = useState(true)

  const categories = [
    { value: 'text', label: 'Текстовые' },
    { value: 'media', label: 'Медиа' },
    { value: 'interactive', label: 'Интерактивные' },
    { value: 'pet_specific', label: 'Для питомцев' },
    { value: 'utility', label: 'Утилиты' }
  ]

  const handleSave = () => {
    if (!name.trim()) {
      alert('Введите название шаблона')
      return
    }

    const template = {
      name: name.trim(),
      description: description.trim(),
      block_type: blockType,
      content,
      settings,
      category,
      is_public: isPublic
    }

    onSave(template)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Сохранить как шаблон
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название шаблона *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Введите название..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Краткое описание шаблона..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Сделать шаблон публичным</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * BlockTemplates - Основной компонент управления шаблонами
 */
function BlockTemplates({ onTemplateUse, currentBlockType, currentContent, currentSettings }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCreator, setShowCreator] = useState(false)

  const categories = [
    { value: '', label: 'Все категории' },
    { value: 'text', label: 'Текстовые' },
    { value: 'media', label: 'Медиа' },
    { value: 'interactive', label: 'Интерактивные' },
    { value: 'pet_specific', label: 'Для питомцев' },
    { value: 'utility', label: 'Утилиты' }
  ]

  /**
   * Загрузка шаблонов
   */
  const loadTemplates = async (filters = {}) => {
    try {
      setLoading(true)
      const data = await getBlockTemplates(filters)
      setTemplates(data.results || data)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Использование шаблона
   */
  const handleTemplateUse = async (template) => {
    try {
      // В реальном приложении здесь будет API вызов
      // await useBlockTemplate(template.id)
      onTemplateUse(template)
    } catch (error) {
      console.error('Error using template:', error)
    }
  }

  /**
   * Создание нового шаблона
   */
  const handleCreateTemplate = async (templateData) => {
    try {
      await createBlockTemplate(templateData)
      setShowCreator(false)
      loadTemplates()
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  /**
   * Фильтрация шаблонов
   */
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Загрузка шаблонов при монтировании
  useEffect(() => {
    loadTemplates()
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок и фильтры */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Шаблоны блоков</h3>

          {currentBlockType && (
            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              <Save size={14} />
              <span>Сохранить как шаблон</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Поиск */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Поиск шаблонов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Фильтр по категории */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Переключение вида */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Список шаблонов */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Шаблоны не найдены
            </h4>
            <p className="text-gray-600">
              {searchQuery || selectedCategory ? 'Попробуйте изменить фильтры' : 'Создайте первый шаблон'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={handleTemplateUse}
                onEdit={() => {/* TODO */}}
                onDelete={() => {/* TODO */}}
                viewMode="grid"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={handleTemplateUse}
                onEdit={() => {/* TODO */}}
                onDelete={() => {/* TODO */}}
                viewMode="list"
              />
            ))}
          </div>
        )}
      </div>

      {/* Создание шаблона */}
      {showCreator && (
        <TemplateCreator
          blockType={currentBlockType}
          content={currentContent}
          settings={currentSettings}
          onSave={handleCreateTemplate}
          onCancel={() => setShowCreator(false)}
        />
      )}
    </div>
  )
}

export default BlockTemplates

