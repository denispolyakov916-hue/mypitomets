/**
 * PropertiesPanel - Right sidebar for editing selected element properties.
 *
 * Calls onBlockUpdate / onPageUpdate to persist changes via API.
 * Includes 12-column grid layout controls.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

const blockIcons = {
  rich_text: '📄', image: '🖼️', gallery: '🎴', file_download: '📎',
  video_player: '🎥', audio_player: '🎵', embed: '🔗', quiz: '❓',
  poll: '📊', checklist: '✅', timer: '⏱️', pet_action: '🎯',
}

const SPAN_PRESETS = [
  { label: '1/4', value: 3 },
  { label: '1/3', value: 4 },
  { label: '1/2', value: 6 },
  { label: '2/3', value: 8 },
  { label: 'Полная', value: 12 },
]

function PropertiesPanel({ selectedElement, onBlockUpdate, onPageUpdate, onPageDelete, onModuleUpdate, onModuleDelete }) {
  const [localElement, setLocalElement] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    setLocalElement(selectedElement ? { ...selectedElement } : null)
  }, [selectedElement])

  const debouncedUpdate = useCallback((element) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!element) return
      if (element.type === 'page') {
        const { type, ...pageData } = element
        onPageUpdate(element.id, pageData)
      } else if (element.type === 'block') {
        const { type, ...blockData } = element
        onBlockUpdate(element.id, blockData)
      } else if (element.type === 'module' && onModuleUpdate) {
        const { type, ...moduleData } = element
        onModuleUpdate(element.id, moduleData)
      }
    }, 400)
  }, [onBlockUpdate, onPageUpdate, onModuleUpdate])

  const updateLocal = useCallback((updater) => {
    setLocalElement(prev => {
      if (!prev) return prev
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      debouncedUpdate(next)
      return next
    })
  }, [debouncedUpdate])

  if (!localElement) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Свойства</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-400">
            <div className="text-3xl mb-2">⚙️</div>
            <p className="text-xs">Выберите элемент для настройки</p>
          </div>
        </div>
      </div>
    )
  }

  const isPage = localElement.type === 'page'
  const isBlock = localElement.type === 'block'
  const isModule = localElement.type === 'module'

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">
          {isPage && '📄 Страница'}
          {isBlock && `${blockIcons[localElement.block_type] || '📦'} Блок`}
          {isModule && '📁 Модуль'}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {isPage && <PageProperties element={localElement} updateLocal={updateLocal} onDelete={onPageDelete} />}
        {isBlock && <BlockProperties element={localElement} updateLocal={updateLocal} />}
        {isModule && <ModuleProperties element={localElement} updateLocal={updateLocal} onDelete={onModuleDelete} />}
      </div>
    </div>
  )
}

/* ─── Module Properties ─── */
function ModuleProperties({ element, updateLocal, onDelete }) {
  return (
    <>
      <Field label="Название">
        <input
          type="text"
          value={element.title || ''}
          onChange={(e) => updateLocal({ title: e.target.value })}
          className="input-field"
          placeholder="Название модуля"
        />
      </Field>
      <Field label="Описание">
        <textarea
          value={element.description || ''}
          onChange={(e) => updateLocal({ description: e.target.value })}
          rows={3}
          className="input-field"
          placeholder="Описание модуля"
        />
      </Field>
      {onDelete && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Удалить модуль «' + (element.title || 'Без названия') + '» и все страницы в нём?')) {
                onDelete(element.id)
              }
            }}
            className="w-full py-2 px-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Удалить модуль
          </button>
        </div>
      )}
    </>
  )
}

/* ─── Page Properties ─── */
function PageProperties({ element, updateLocal, onDelete }) {
  return (
    <>
      <Field label="Название">
        <input
          type="text"
          value={element.title || ''}
          onChange={(e) => updateLocal({ title: e.target.value })}
          className="input-field"
        />
      </Field>

      <Field label="Тип страницы">
        <select
          value={element.page_type || ''}
          onChange={(e) => updateLocal({ page_type: e.target.value })}
          className="input-field"
        >
          <option value="">По умолчанию</option>
          <option value="text">Текстовая</option>
          <option value="video">Видео</option>
          <option value="interactive">Интерактивная</option>
          <option value="quiz">Тест</option>
          <option value="webinar">Вебинар</option>
          <option value="assignment">Задание</option>
        </select>
      </Field>

      <Field label="Настройки">
        <div className="space-y-2">
          <Checkbox
            label="Обязательное завершение"
            checked={element.settings?.required_completion || false}
            onChange={(v) => updateLocal(prev => ({
              ...prev,
              settings: { ...prev.settings, required_completion: v },
            }))}
          />
          <Checkbox
            label="Включить таймер"
            checked={element.settings?.timer_enabled || false}
            onChange={(v) => updateLocal(prev => ({
              ...prev,
              settings: { ...prev.settings, timer_enabled: v },
            }))}
          />
          <Checkbox
            label="Разрешить пропуск"
            checked={element.settings?.allow_skipping ?? true}
            onChange={(v) => updateLocal(prev => ({
              ...prev,
              settings: { ...prev.settings, allow_skipping: v },
            }))}
          />
        </div>
      </Field>

      {onDelete && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Удалить страницу «' + (element.title || 'Без названия') + '»?')) {
                onDelete(element.id)
              }
            }}
            className="w-full py-2 px-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Удалить страницу
          </button>
        </div>
      )}
    </>
  )
}

/* ─── Block Properties ─── */
function BlockProperties({ element, updateLocal }) {
  return (
    <>
      {/* Block type info */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
        <span className="text-lg">{blockIcons[element.block_type] || '📦'}</span>
        <span className="text-sm text-gray-700">{element.block_type_display || element.block_type}</span>
      </div>

      {/* Layout controls */}
      <LayoutControls element={element} updateLocal={updateLocal} />

      {/* Block-specific properties */}
      <BlockSpecificProperties element={element} updateLocal={updateLocal} />
    </>
  )
}

/* ─── 12-Column Layout Controls ─── */
function LayoutControls({ element, updateLocal }) {
  const layout = element.settings?.layout || { span: 12, offset: 0 }

  const setLayout = (key, value) => {
    updateLocal(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        layout: { ...prev.settings?.layout, span: layout.span, offset: layout.offset, [key]: value },
      },
    }))
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Размер</label>

      {/* Quick presets */}
      <div className="flex gap-1">
        {SPAN_PRESETS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setLayout('span', value)}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              layout.span === value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Custom span slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Ширина</span>
        <input
          type="range"
          min={1} max={12}
          value={layout.span}
          onChange={(e) => setLayout('span', parseInt(e.target.value))}
          className="flex-1 h-1.5 accent-blue-500"
        />
        <span className="text-xs text-gray-600 w-8 text-right">{layout.span}/12</span>
      </div>

      {/* Offset */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Отступ</span>
        <input
          type="range"
          min={0} max={12 - layout.span}
          value={Math.min(layout.offset, 12 - layout.span)}
          onChange={(e) => setLayout('offset', parseInt(e.target.value))}
          className="flex-1 h-1.5 accent-blue-500"
        />
        <span className="text-xs text-gray-600 w-8 text-right">{layout.offset}</span>
      </div>

      {/* Visual preview */}
      <div className="grid grid-cols-12 gap-px bg-gray-200 rounded overflow-hidden h-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={
              i >= layout.offset && i < layout.offset + layout.span
                ? 'bg-blue-400'
                : 'bg-gray-100'
            }
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Block-Specific Properties ─── */
function BlockSpecificProperties({ element, updateLocal }) {
  const { block_type, content = {}, settings = {} } = element

  const setContent = (key, value) => {
    updateLocal(prev => ({ ...prev, content: { ...prev.content, [key]: value } }))
  }

  const setSettings = (key, value) => {
    updateLocal(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }))
  }

  switch (block_type) {
    case 'rich_text':
      return (
        <Field label="HTML (исходный код)">
          <textarea
            value={content.html || ''}
            onChange={(e) => setContent('html', e.target.value)}
            rows={5}
            className="input-field font-mono text-xs"
            placeholder="HTML..."
          />
        </Field>
      )

    case 'image':
      return (
        <>
          <Field label="URL изображения">
            <input type="url" value={content.url || ''} onChange={(e) => setContent('url', e.target.value)} className="input-field" placeholder="https://..." />
          </Field>
          <Field label="Alt текст">
            <input type="text" value={content.alt || ''} onChange={(e) => setContent('alt', e.target.value)} className="input-field" placeholder="Описание" />
          </Field>
          <Field label="Подпись">
            <input type="text" value={content.caption || ''} onChange={(e) => setContent('caption', e.target.value)} className="input-field" />
          </Field>
        </>
      )

    case 'video_player':
      return (
        <>
          <Field label="URL видео">
            <input type="url" value={content.video_url || ''} onChange={(e) => setContent('video_url', e.target.value)} className="input-field" />
          </Field>
          <Field label="Название">
            <input type="text" value={content.title || ''} onChange={(e) => setContent('title', e.target.value)} className="input-field" />
          </Field>
          <Field label="Длительность (сек)">
            <input type="number" value={content.duration || ''} onChange={(e) => setContent('duration', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="Настройки">
            <div className="space-y-2">
              <Checkbox label="Автовоспроизведение" checked={settings.autoplay || false} onChange={(v) => setSettings('autoplay', v)} />
              <Checkbox label="Контролы" checked={settings.controls ?? true} onChange={(v) => setSettings('controls', v)} />
            </div>
          </Field>
        </>
      )

    case 'quiz':
      return (
        <>
          <Field label="Название теста">
            <input type="text" value={content.title || ''} onChange={(e) => setContent('title', e.target.value)} className="input-field" />
          </Field>
          <Field label="Проходной балл (%)">
            <input type="number" min={0} max={100} value={content.passing_score || 70} onChange={(e) => setContent('passing_score', parseInt(e.target.value))} className="input-field" />
          </Field>
          <Field label="Настройки">
            <div className="space-y-2">
              <Checkbox label="Перемешивать" checked={content.shuffle || false} onChange={(v) => setContent('shuffle', v)} />
              <Checkbox label="Показать результаты" checked={content.show_results ?? true} onChange={(v) => setContent('show_results', v)} />
              <Checkbox label="Повторная попытка" checked={content.allow_retake ?? true} onChange={(v) => setContent('allow_retake', v)} />
            </div>
          </Field>
        </>
      )

    case 'pet_action':
      return (
        <>
          <Field label="Тип действия">
            <select value={content.action_type || 'command'} onChange={(e) => setContent('action_type', e.target.value)} className="input-field">
              <option value="command">Команда</option>
              <option value="trick">Трюк</option>
              <option value="exercise">Упражнение</option>
              <option value="health_check">Проверка здоровья</option>
              <option value="training_session">Тренировка</option>
            </select>
          </Field>
          <Field label="Название">
            <input type="text" value={content.title || ''} onChange={(e) => setContent('title', e.target.value)} className="input-field" />
          </Field>
          <Field label="Инструкции">
            <textarea value={content.instructions || ''} onChange={(e) => setContent('instructions', e.target.value)} rows={3} className="input-field" />
          </Field>
          <Field label="Критерии успеха">
            <textarea value={content.success_criteria || ''} onChange={(e) => setContent('success_criteria', e.target.value)} rows={2} className="input-field" />
          </Field>
          <Field label="Настройки">
            <div className="space-y-2">
              <Checkbox label="Таймер" checked={settings.timer_enabled || false} onChange={(v) => setSettings('timer_enabled', v)} />
              <Checkbox label="Демонстрация" checked={settings.show_demonstration ?? true} onChange={(v) => setSettings('show_demonstration', v)} />
              <Checkbox label="Пропуск" checked={settings.allow_skip || false} onChange={(v) => setSettings('allow_skip', v)} />
            </div>
          </Field>
        </>
      )

    case 'gallery':
      return (
        <Field label="Изображения (JSON)">
          <textarea
            value={JSON.stringify(content.images || [], null, 2)}
            onChange={(e) => { try { setContent('images', JSON.parse(e.target.value)) } catch {} }}
            rows={5}
            className="input-field font-mono text-xs"
            placeholder='[{"url": "...", "caption": "..."}]'
          />
        </Field>
      )

    case 'file_download':
      return (
        <>
          <Field label="URL файла">
            <input type="url" value={content.file_url || ''} onChange={(e) => setContent('file_url', e.target.value)} className="input-field" />
          </Field>
          <Field label="Название файла">
            <input type="text" value={content.file_name || ''} onChange={(e) => setContent('file_name', e.target.value)} className="input-field" />
          </Field>
          <Field label="Описание">
            <input type="text" value={content.description || ''} onChange={(e) => setContent('description', e.target.value)} className="input-field" />
          </Field>
        </>
      )

    case 'checklist':
      return (
        <>
          <Field label="Заголовок">
            <input type="text" value={content.title || ''} onChange={(e) => setContent('title', e.target.value)} className="input-field" />
          </Field>
          <Field label="Элементы (по одному на строку)">
            <textarea
              value={(content.items || []).map(i => typeof i === 'string' ? i : i.text || '').join('\n')}
              onChange={(e) => setContent('items', e.target.value.split('\n').map(text => ({ text: text || '', checked: false })))}
              rows={5}
              className="input-field"
              placeholder="Элемент 1&#10;Элемент 2"
            />
          </Field>
        </>
      )

    case 'timer':
      return (
        <>
          <Field label="Длительность (секунды)">
            <input type="number" value={content.duration || 60} onChange={(e) => setContent('duration', parseInt(e.target.value) || 60)} className="input-field" />
          </Field>
          <Field label="Заголовок">
            <input type="text" value={content.title || ''} onChange={(e) => setContent('title', e.target.value)} className="input-field" />
          </Field>
        </>
      )

    default:
      return (
        <div className="text-center py-4 text-xs text-gray-400">
          <p>Редактирование через панель свойств</p>
          <p className="mt-1">пока не реализовано для этого типа</p>
        </div>
      )
  }
}

/* ─── Utility Components ─── */
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
      />
      <span className="text-xs text-gray-600">{label}</span>
    </label>
  )
}

export default PropertiesPanel
