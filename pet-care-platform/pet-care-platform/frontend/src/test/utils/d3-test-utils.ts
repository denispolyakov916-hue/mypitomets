/**
 * Тестовые утилиты для Canvas конструктора графиков.
 *
 * Генерируют данные/конфигурацию в том виде, в каком их ожидает «живой»
 * компонент Canvas (inline-рендеринг через d3): точки данных с полем `date`
 * для оси X и числовыми полями метрик, а также конфиг с `type` графика.
 */

export interface TestPoint {
  date: string
  label: string
  dimension: string
  value: number
  series_a: number
  series_b: number
  [key: string]: string | number
}

/** Генерирует детерминированный набор точек данных для графика. */
export function createTestData(_type = 'line', count = 5): TestPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0')
    return {
      date: `2024-01-${day}`,
      label: `Точка ${i + 1}`,
      dimension: `Точка ${i + 1}`,
      value: Math.round(50 + 40 * Math.sin(i / 2)),
      series_a: Math.round(60 + 30 * Math.sin(i / 2)),
      series_b: Math.round(40 + 35 * Math.cos(i / 2)),
    }
  })
}

/** Конфигурация графика для «живого» Canvas (читается только `type`, `name`). */
export function createTestConfig(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 'test-chart',
    name: 'Test Chart',
    type: 'line',
    ...overrides,
  }
}

/** Конфигурация стилей для Canvas (опциональна; компонент имеет дефолты). */
export function createTestStyleConfig(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    colors: ['#C86BFA', '#22c55e', '#f59e0b'],
    grid: { show: true, color: '#e5e7eb', opacity: 0.5, style: 'dashed' },
    legend: { show: true, position: 'top' },
    xAxis: {},
    yAxis: {},
    ...overrides,
  }
}

/** Диспатчит мышиное событие на элементе (для проверки интерактивности). */
export function simulateMouseEvent(
  element: Element,
  type: string,
  options: MouseEventInit = {}
): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...options })
  element.dispatchEvent(event)
  return event
}
