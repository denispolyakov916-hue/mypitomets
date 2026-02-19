/**
 * QuizBuilder - Визуальный конструктор тестов и викторин
 *
 * Позволяет создавать интерактивные тесты с различными типами вопросов,
 * настройками и критериями оценки.
 */

import { useState } from 'react'
import { Plus, Trash2, GripVertical, CheckCircle, Circle } from 'lucide-react'

/**
 * QuestionTypeSelector - Выбор типа вопроса
 */
function QuestionTypeSelector({ value, onChange }) {
  const questionTypes = [
    { value: 'single_choice', label: 'Один правильный ответ', icon: '🔘' },
    { value: 'multi_choice', label: 'Несколько правильных ответов', icon: '☑️' },
    { value: 'text_input', label: 'Текстовый ответ', icon: '📝' },
    { value: 'true_false', label: 'Верно/Неверно', icon: '✓✗' }
  ]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
    >
      {questionTypes.map(type => (
        <option key={type.value} value={type.value}>
          {type.icon} {type.label}
        </option>
      ))}
    </select>
  )
}

/**
 * QuestionEditor - Редактор вопроса
 */
function QuestionEditor({ question, index, onUpdate, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateQuestion = (field, value) => {
    onUpdate(index, { ...question, [field]: value })
  }

  const addOption = () => {
    const options = [...(question.options || []), '']
    updateQuestion('options', options)
  }

  const updateOption = (optionIndex, value) => {
    const options = [...(question.options || [])]
    options[optionIndex] = value
    updateQuestion('options', options)
  }

  const removeOption = (optionIndex) => {
    const options = [...(question.options || [])]
    options.splice(optionIndex, 1)
    updateQuestion('options', options)
  }

  const toggleCorrectAnswer = (optionIndex) => {
    if (question.type === 'single_choice') {
      updateQuestion('correct_answer', optionIndex)
    } else if (question.type === 'multi_choice') {
      const correctAnswers = new Set(question.correct_answers || [])
      if (correctAnswers.has(optionIndex)) {
        correctAnswers.delete(optionIndex)
      } else {
        correctAnswers.add(optionIndex)
      }
      updateQuestion('correct_answers', Array.from(correctAnswers))
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Заголовок вопроса */}
      <div
        className="bg-gray-50 px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <GripVertical size={16} className="text-gray-400" />
          <span className="font-medium text-gray-900">
            Вопрос {index + 1}
          </span>
          <span className="text-sm text-gray-600">
            {question.type === 'single_choice' && '🔘 Один ответ'}
            {question.type === 'multi_choice' && '☑️ Несколько ответов'}
            {question.type === 'text_input' && '📝 Текст'}
            {question.type === 'true_false' && '✓✗ Верно/Неверно'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {question.points || 1} балл
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(index)
            }}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Содержимое вопроса */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Тип вопроса и баллы */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип вопроса
              </label>
              <QuestionTypeSelector
                value={question.type || 'single_choice'}
                onChange={(value) => updateQuestion('type', value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Баллы
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={question.points || 1}
                onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Текст вопроса */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текст вопроса
            </label>
            <textarea
              value={question.text || ''}
              onChange={(e) => updateQuestion('text', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Введите текст вопроса..."
            />
          </div>

          {/* Варианты ответов */}
          {(question.type === 'single_choice' || question.type === 'multi_choice') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Варианты ответов
                </label>
                <button
                  onClick={addOption}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Plus size={14} />
                  <span>Добавить вариант</span>
                </button>
              </div>

              <div className="space-y-2">
                {(question.options || []).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleCorrectAnswer(optionIndex)}
                      className="text-gray-400 hover:text-green-600"
                    >
                      {question.type === 'single_choice' ? (
                        question.correct_answer === optionIndex ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <Circle size={20} />
                        )
                      ) : (
                        (question.correct_answers || []).includes(optionIndex) ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <Circle size={20} />
                        )
                      )}
                    </button>

                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(optionIndex, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Вариант ${optionIndex + 1}`}
                    />

                    <button
                      onClick={() => removeOption(optionIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Для true/false */}
          {question.type === 'true_false' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Правильный ответ
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`true_false_${index}`}
                    checked={question.correct_answer === true}
                    onChange={() => updateQuestion('correct_answer', true)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Верно</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`true_false_${index}`}
                    checked={question.correct_answer === false}
                    onChange={() => updateQuestion('correct_answer', false)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Неверно</span>
                </label>
              </div>
            </div>
          )}

          {/* Для текстового ответа */}
          {question.type === 'text_input' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Правильный ответ
              </label>
              <input
                type="text"
                value={question.correct_answer || ''}
                onChange={(e) => updateQuestion('correct_answer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Введите правильный ответ..."
              />
            </div>
          )}

          {/* Пояснение */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пояснение (опционально)
            </label>
            <textarea
              value={question.explanation || ''}
              onChange={(e) => updateQuestion('explanation', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Пояснение к правильному ответу..."
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * QuizBuilder - Основной компонент конструктора тестов
 */
function QuizBuilder({ content, settings, onChange, mode = 'edit' }) {
  const questions = content?.questions || []

  /**
   * Добавление вопроса
   */
  const addQuestion = () => {
    const newQuestions = [
      ...questions,
      {
        type: 'single_choice',
        text: '',
        options: ['', ''],
        correct_answer: 0,
        points: 1,
        explanation: ''
      }
    ]

    onChange({
      ...content,
      questions: newQuestions
    })
  }

  /**
   * Обновление вопроса
   */
  const updateQuestion = (index, questionData) => {
    const newQuestions = [...questions]
    newQuestions[index] = questionData

    onChange({
      ...content,
      questions: newQuestions
    })
  }

  /**
   * Удаление вопроса
   */
  const deleteQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index)
    onChange({
      ...content,
      questions: newQuestions
    })
  }

  /**
   * Режим просмотра
   */
  if (mode === 'view') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {content?.title || 'Тест'}
        </h3>

        {questions.map((question, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {index + 1}. {question.text}
            </h4>

            {question.type === 'single_choice' && (
              <div className="space-y-2">
                {question.options?.map((option, optionIndex) => (
                  <label key={optionIndex} className="flex items-center">
                    <input
                      type="radio"
                      name={`question_${index}`}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'multi_choice' && (
              <div className="space-y-2">
                {question.options?.map((option, optionIndex) => (
                  <label key={optionIndex} className="flex items-center">
                    <input
                      type="checkbox"
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'text_input' && (
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ваш ответ..."
              />
            )}

            {question.type === 'true_false' && (
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`question_${index}`}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700">Верно</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`question_${index}`}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700">Неверно</span>
                </label>
              </div>
            )}
          </div>
        ))}

        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
          Проверить ответы
        </button>
      </div>
    )
  }

  /**
   * Режим редактирования
   */
  return (
    <div className="space-y-6">
      {/* Заголовок и настройки теста */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название теста
          </label>
          <input
            type="text"
            value={content?.title || ''}
            onChange={(e) => onChange({
              ...content,
              title: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Название теста"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Проходной балл (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={settings?.passing_score || 70}
            onChange={(e) => onChange({
              ...settings,
              passing_score: parseInt(e.target.value) || 70
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Список вопросов */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-900">
            Вопросы ({questions.length})
          </h4>

          <button
            onClick={addQuestion}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Добавить вопрос</span>
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-4xl mb-2">❓</div>
            <p className="mb-4">Вопросы еще не добавлены</p>
            <button
              onClick={addQuestion}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Добавить первый вопрос
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <QuestionEditor
                key={index}
                question={question}
                index={index}
                onUpdate={updateQuestion}
                onDelete={deleteQuestion}
              />
            ))}
          </div>
        )}
      </div>

      {/* Настройки теста */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-gray-900 mb-3">Настройки теста</h5>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.shuffle_questions || false}
              onChange={(e) => onChange({
                ...settings,
                shuffle_questions: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Перемешивать вопросы</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.show_results || true}
              onChange={(e) => onChange({
                ...settings,
                show_results: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Показывать результаты</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.allow_retake || true}
              onChange={(e) => onChange({
                ...settings,
                allow_retake: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Разрешить пересдачу</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.time_limit_enabled || false}
              onChange={(e) => onChange({
                ...settings,
                time_limit_enabled: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Ограничение по времени</span>
          </label>
        </div>

        {settings?.time_limit_enabled && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Время на тест (минуты)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={settings?.time_limit || 30}
              onChange={(e) => onChange({
                ...settings,
                time_limit: parseInt(e.target.value) || 30
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default QuizBuilder

