/**
 * StepNavigation - Горизонтальная навигация по шагам (Stepik-стиль)
 *
 * Отображает цепочку кружков с иконками типа урока:
 * - Зелёный: completed
 * - Цветной (по типу): current
 * - Серый: not_started
 */

import { useRef, useEffect } from 'react'

/** Конфигурация типов страниц */
const typeConfig = {
  text:        { icon: '📖', ring: 'ring-blue-300',   activeBg: 'bg-blue-600 text-white' },
  video:       { icon: '▶️', ring: 'ring-red-300',    activeBg: 'bg-red-500 text-white' },
  quiz:        { icon: '❓', ring: 'ring-purple-300', activeBg: 'bg-purple-600 text-white' },
  interactive: { icon: '🐾', ring: 'ring-green-300',  activeBg: 'bg-green-600 text-white' },
  assignment:  { icon: '✏️', ring: 'ring-amber-300',  activeBg: 'bg-amber-500 text-white' },
  webinar:     { icon: '📡', ring: 'ring-indigo-300', activeBg: 'bg-indigo-600 text-white' },
}

function StepNavigation({ steps = [], currentStepId, onStepSelect, moduleTitle }) {
  const scrollRef = useRef(null)
  const currentRef = useRef(null)

  useEffect(() => {
    if (currentRef.current && scrollRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentStepId])

  const getStepStyle = (step, isCurrent) => {
    const conf = typeConfig[step.page_type] || typeConfig.text
    if (step.status === 'completed') return 'bg-green-500 text-white'
    if (isCurrent) return `${conf.activeBg} ring-2 ${conf.ring}`
    if (step.status === 'in_progress') return 'bg-blue-200 text-blue-800'
    return 'bg-gray-200 text-gray-500 hover:bg-gray-300'
  }

  const getConnectorColor = (status) => status === 'completed' ? 'bg-green-400' : 'bg-gray-200'

  if (steps.length === 0) return null

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      {moduleTitle && (
        <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
          {moduleTitle}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStepId
          const conf = typeConfig[step.page_type] || typeConfig.text

          return (
            <div key={step.id} className="flex items-center flex-shrink-0">
              {index > 0 && (
                <div className={`w-6 h-0.5 ${getConnectorColor(steps[index - 1]?.status)}`} />
              )}

              <button
                ref={isCurrent ? currentRef : null}
                onClick={() => onStepSelect(step.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 flex-shrink-0 ${getStepStyle(step, isCurrent)}`}
                title={step.title}
              >
                {step.status === 'completed' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-[10px]">{conf.icon}</span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StepNavigation
