/**
 * BlockAnalytics - Аналитика использования блоков
 *
 * Отображает статистику использования различных типов блоков,
 * помогает оптимизировать контент курсов.
 */

import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Award,
  FileText,
  Image,
  Play,
  HelpCircle,
  Target as TargetIcon,
  Download
} from 'lucide-react'

/**
 * StatCard - Карточка статистики
 */
function StatCard({ title, value, icon: Icon, trend, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200'
  }

  return (
    <div className={`p-4 border rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <p className="text-xs mt-1">
              <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
              <span className="text-gray-500 ml-1">от прошлого месяца</span>
            </p>
          )}
        </div>
        <Icon size={24} className="opacity-75" />
      </div>
    </div>
  )
}

/**
 * BlockTypeStats - Статистика по типу блока
 */
function BlockTypeStats({ blockType, stats, icon: Icon }) {
  const completionRate = stats.totalViews > 0
    ? Math.round((stats.completions / stats.totalViews) * 100)
    : 0

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Icon size={20} className="text-gray-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{blockType}</h4>
          <p className="text-sm text-gray-600">
            {stats.totalBlocks} блоков • {stats.totalViews} просмотров
          </p>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-gray-900">
          {completionRate}% завершений
        </div>
        <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
          <div
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

/**
 * UsageChart - Простая диаграмма использования
 */
function UsageChart({ data }) {
  const maxValue = Math.max(...data.map(item => item.value))

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div className="w-32 text-sm text-gray-600 truncate">
            {item.label}
          </div>
          <div className="flex-1">
            <div className="w-full h-4 bg-gray-200 rounded-full">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="w-12 text-sm text-gray-900 text-right">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * BlockAnalytics - Основной компонент аналитики
 */
function BlockAnalytics({ courseId }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')

  /**
   * Загрузка аналитики
   */
  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // TODO: Реализовать API для аналитики
      // const data = await getBlockAnalytics(courseId, { timeRange })

      // Пока используем моковые данные
      setTimeout(() => {
        setAnalytics({
          summary: {
            totalBlocks: 45,
            totalViews: 1250,
            avgCompletionTime: 180, // секунды
            topBlockType: 'rich_text'
          },
          blockTypes: [
            {
              type: 'rich_text',
              displayName: 'Форматированный текст',
              icon: FileText,
              stats: {
                totalBlocks: 18,
                totalViews: 520,
                completions: 480,
                avgTime: 120
              }
            },
            {
              type: 'video_player',
              displayName: 'Видео-плеер',
              icon: Play,
              stats: {
                totalBlocks: 12,
                totalViews: 380,
                completions: 320,
                avgTime: 300
              }
            },
            {
              type: 'image',
              displayName: 'Изображение',
              icon: Image,
              stats: {
                totalBlocks: 8,
                totalViews: 210,
                completions: 200,
                avgTime: 45
              }
            },
            {
              type: 'quiz',
              displayName: 'Тест',
              icon: HelpCircle,
              stats: {
                totalBlocks: 5,
                totalViews: 95,
                completions: 85,
                avgTime: 420
              }
            },
            {
              type: 'pet_action',
              displayName: 'Действие с питомцем',
              icon: TargetIcon,
              stats: {
                totalBlocks: 2,
                totalViews: 45,
                completions: 40,
                avgTime: 180
              }
            }
          ],
          usageChart: [
            { label: 'Текст', value: 520 },
            { label: 'Видео', value: 380 },
            { label: 'Изображения', value: 210 },
            { label: 'Тесты', value: 95 },
            { label: 'Действия', value: 45 }
          ],
          recommendations: [
            'Добавьте больше интерактивных элементов - тесты повышают вовлеченность на 40%',
            'Видео блоки имеют самый высокий процент просмотров',
            'Рассмотрите добавление галерей изображений для визуального обучения'
          ]
        })

        setLoading(false)
      }, 1000)

    } catch (error) {
      console.error('Error loading analytics:', error)
      setLoading(false)
    }
  }

  // Загрузка данных при монтировании и изменении фильтров
  useEffect(() => {
    loadAnalytics()
  }, [courseId, timeRange])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка аналитики...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
          <p>Данные аналитики недоступны</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок и фильтры */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Аналитика блоков</h3>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="week">Последняя неделя</option>
            <option value="month">Последний месяц</option>
            <option value="quarter">Последний квартал</option>
            <option value="year">Последний год</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Всего блоков"
            value={analytics.summary.totalBlocks}
            icon={Target}
            trend={12}
            color="blue"
          />
          <StatCard
            title="Просмотров"
            value={analytics.summary.totalViews.toLocaleString()}
            icon={Users}
            trend={8}
            color="green"
          />
          <StatCard
            title="Среднее время"
            value={`${Math.round(analytics.summary.avgCompletionTime / 60)} мин`}
            icon={Clock}
            trend={-5}
            color="purple"
          />
          <StatCard
            title="Лучший тип"
            value={analytics.summary.topBlockType}
            icon={Award}
            color="orange"
          />
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Диаграмма использования */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Распределение просмотров по типам</h4>
          <UsageChart data={analytics.usageChart} />
        </div>

        {/* Статистика по типам блоков */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Эффективность типов блоков</h4>
          <div className="space-y-3">
            {analytics.blockTypes.map(blockType => (
              <BlockTypeStats
                key={blockType.type}
                blockType={blockType.displayName}
                stats={blockType.stats}
                icon={blockType.icon}
              />
            ))}
          </div>
        </div>

        {/* Рекомендации */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
            <TrendingUp className="mr-2" size={20} />
            Рекомендации по оптимизации
          </h4>
          <div className="space-y-3">
            {analytics.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-700">{index + 1}</span>
                </div>
                <p className="text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Детальная статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Вовлеченность по времени</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Утро (6:00-12:00)</span>
                <span className="font-medium">35%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '35%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">День (12:00-18:00)</span>
                <span className="font-medium">45%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Вечер (18:00-24:00)</span>
                <span className="font-medium">20%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Устройства пользователей</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                  Десктоп
                </span>
                <span className="font-medium">60%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                  Мобильные
                </span>
                <span className="font-medium">30%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
                  Планшеты
                </span>
                <span className="font-medium">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlockAnalytics

