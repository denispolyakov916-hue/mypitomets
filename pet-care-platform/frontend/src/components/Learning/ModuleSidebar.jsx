/**
 * ModuleSidebar - Боковая панель с модулями курса (Stepik-стиль)
 *
 * Дерево модулей в виде аккордеона:
 * - Модули с прогресс-барами
 * - Уроки с иконками типа (теория/тест/упражнение)
 * - Статусы: зелёная галочка (completed), синий кружок (current), серый (not_started)
 */

import { useState } from 'react'

/** Конфигурация типов страниц */
const typeConfig = {
  text:        { icon: '📖', label: 'Теория' },
  video:       { icon: '▶️', label: 'Видео' },
  quiz:        { icon: '❓', label: 'Тест' },
  interactive: { icon: '🐾', label: 'Упражнение' },
  assignment:  { icon: '✏️', label: 'Задание' },
  webinar:     { icon: '📡', label: 'Вебинар' },
}

/** SVG иконки */
const ChevronDown = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const ChevronRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

function ModuleSidebar({ modules = [], currentPageId, onPageSelect, collapsed = false, onToggle }) {
  const [expandedModules, setExpandedModules] = useState(() => {
    const moduleWithCurrent = modules.find(m => m.pages?.some(p => p.id === currentPageId))
    return moduleWithCurrent ? { [moduleWithCurrent.id || 0]: true } : { 0: true }
  })

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  const getStatusIndicator = (status, isCurrent, pageType) => {
    if (status === 'completed') {
      return (
        <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )
    }

    const conf = typeConfig[pageType] || typeConfig.text
    if (isCurrent) {
      return (
        <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 ring-2 ring-blue-400 text-[10px]">
          {conf.icon}
        </span>
      )
    }

    return (
      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-[10px]">
        {conf.icon}
      </span>
    )
  }

  if (collapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Показать содержание">
          <ChevronRight size={20} />
        </button>
        <div className="mt-4 space-y-2">
          {modules.map((module, i) => {
            const hasActivePage = module.pages?.some(p => p.id === currentPageId)
            return (
              <div key={module.id || i} className={`w-2 h-2 rounded-full ${hasActivePage ? 'bg-blue-600' : 'bg-gray-300'}`} title={module.title} />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-700">Содержание</h3>
        {onToggle && (
          <button onClick={onToggle} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Свернуть">
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Модули */}
      <div className="flex-1 overflow-y-auto">
        {modules.map((module, mi) => {
          const mKey = module.id || mi
          const isExpanded = expandedModules[mKey]
          const pages = module.pages || []
          const completedCount = pages.filter(p => p.status === 'completed').length
          const totalCount = pages.length
          const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

          return (
            <div key={mKey} className="border-b border-gray-100 last:border-b-0">
              <button
                onClick={() => toggleModule(mKey)}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="mr-2 text-gray-400">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{module.title}</div>
                  <div className="flex items-center mt-1">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full mr-2">
                      <div className="h-1 bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{completedCount}/{totalCount}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="pb-2">
                  {pages.map((page) => {
                    const isCurrent = page.id === currentPageId
                    return (
                      <button
                        key={page.id}
                        onClick={() => onPageSelect(page.id)}
                        className={`w-full flex items-center px-4 py-2 pl-10 text-left transition-colors ${
                          isCurrent
                            ? 'bg-blue-50 border-l-2 border-blue-600'
                            : 'hover:bg-gray-50 border-l-2 border-transparent'
                        }`}
                      >
                        {getStatusIndicator(page.status, isCurrent, page.page_type)}
                        <span className={`ml-2 text-sm truncate ${isCurrent ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                          {page.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {modules.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-400">Нет модулей</div>
        )}
      </div>
    </div>
  )
}

export default ModuleSidebar
