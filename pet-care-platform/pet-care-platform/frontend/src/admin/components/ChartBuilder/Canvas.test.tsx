import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { createRef } from 'react'
import Canvas from './Canvas'
import {
  createTestData,
  createTestConfig,
  createTestStyleConfig,
} from '../../../test/utils/d3-test-utils'

/**
 * Эти тесты проверяют «живой» компонент Canvas — тот, что реально использует
 * админский ChartBuilder. Canvas рисует график напрямую через d3 (inline),
 * исходя из props { config, data, loading, styleConfig, selectedMetrics },
 * и экспортирует через ref методы exportToPNG/SVG/CSV.
 */

const lineMetrics = [{ id: 'value', name: 'Значение', data_type: 'integer' }]
const multiMetrics = [
  { id: 'series_a', name: 'Серия A', data_type: 'integer' },
  { id: 'series_b', name: 'Серия B', data_type: 'integer' },
]

const getSvg = (container: HTMLElement): SVGSVGElement => {
  const svg = container.querySelector('svg')
  expect(svg).not.toBeNull()
  return svg as SVGSVGElement
}

// Реальные линии данных: <path fill="none"> с непустым `d` (начинается с "M").
// Это отсекает 2 всегда присутствующих доменных <path> у осей (stroke #d1d5db,
// без fill) и «пустые» линии метрик, которых нет в данных (d="").
const dataLinePaths = (svg: SVGSVGElement): SVGPathElement[] =>
  Array.from(svg.querySelectorAll('path')).filter(
    (p) => p.getAttribute('fill') === 'none' && (p.getAttribute('d') || '').startsWith('M')
  ) as SVGPathElement[]

// Сектора круговой диаграммы: d3 рисует их как <path stroke="#fff">.
const pieSlicePaths = (svg: SVGSVGElement): SVGPathElement[] =>
  Array.from(svg.querySelectorAll('path')).filter(
    (p) => p.getAttribute('stroke') === '#fff'
  ) as SVGPathElement[]

describe('Canvas Component', () => {
  beforeEach(() => {
    // d3 обращается к getComputedStyle при отрисовке осей/текста.
    Object.defineProperty(window, 'getComputedStyle', {
      configurable: true,
      value: vi.fn(() => ({ getPropertyValue: vi.fn(() => '16px') })),
    })
    // jsdom не реализует Blob URL и переход по ссылке — заглушаем для экспорта.
    ;(URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(
      () => 'blob:mock'
    )
    ;(URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders loading overlay when loading is true', () => {
      render(
        <Canvas
          config={createTestConfig()}
          data={null}
          loading={true}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={lineMetrics}
        />
      )
      expect(screen.getByText('Загрузка данных...')).toBeInTheDocument()
    })

    it('always renders an <svg> drawing surface', () => {
      const { container } = render(
        <Canvas
          config={createTestConfig()}
          data={createTestData('line', 5)}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={lineMetrics}
        />
      )
      const svg = getSvg(container)
      expect(svg).toBeInTheDocument()
      expect(svg.getAttribute('width')).toBeTruthy()
      expect(svg.getAttribute('height')).toBeTruthy()
    })

    it('does not crash and draws nothing when there are no selected metrics', () => {
      const { container } = render(
        <Canvas
          config={createTestConfig()}
          data={createTestData('line', 5)}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={[]}
        />
      )
      const svg = getSvg(container)
      // Без выбранных метрик график не строится — в svg нет линий/столбцов.
      expect(svg.querySelectorAll('path').length).toBe(0)
      expect(svg.querySelectorAll('rect').length).toBe(0)
    })

    it('does not crash on empty data array', () => {
      const { container } = render(
        <Canvas
          config={createTestConfig()}
          data={[]}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={lineMetrics}
        />
      )
      expect(getSvg(container)).toBeInTheDocument()
    })
  })

  describe('Chart Rendering (inline d3)', () => {
    it('draws a line chart (paths) for type "line"', () => {
      const { container } = render(
        <Canvas
          config={createTestConfig({ type: 'line' })}
          data={createTestData('line', 6)}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={lineMetrics}
        />
      )
      const svg = getSvg(container)
      // Ровно одна линия данных (одна метрика), а не просто «есть какой-то path».
      expect(dataLinePaths(svg).length).toBe(1)
    })

    it('draws bars (rects) for type "bar"', () => {
      const { container } = render(
        <Canvas
          config={createTestConfig({ type: 'bar' })}
          data={createTestData('bar', 6)}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={lineMetrics}
        />
      )
      const svg = getSvg(container)
      // Столбцы рисуются как <rect> (помимо них в svg могут быть только линии сетки).
      expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0)
    })

    it('draws pie slices (paths) for type "pie"', () => {
      const { container } = render(
        <Canvas
          config={createTestConfig({ type: 'pie' })}
          data={createTestData('pie', 6)}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={multiMetrics}
        />
      )
      const svg = getSvg(container)
      // Две метрики с положительными значениями => ровно два сектора.
      expect(pieSlicePaths(svg).length).toBe(2)
    })

    it('renders one line per selected metric for a multi-metric chart', () => {
      const { container } = render(
        <Canvas
          config={createTestConfig({ type: 'line' })}
          data={createTestData('line', 6)}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={multiMetrics}
        />
      )
      const svg = getSvg(container)
      // Ровно одна линия данных на каждую выбранную метрику (две), а не >=2.
      expect(dataLinePaths(svg).length).toBe(multiMetrics.length)
    })
  })

  describe('Reactivity', () => {
    it('clears the drawing when selected metrics are removed', () => {
      const props = {
        config: createTestConfig({ type: 'line' }),
        data: createTestData('line', 6),
        loading: false,
        styleConfig: createTestStyleConfig(),
      }
      const { container, rerender } = render(
        <Canvas {...props} selectedMetrics={lineMetrics} />
      )
      expect(getSvg(container).querySelectorAll('path').length).toBeGreaterThan(0)

      rerender(<Canvas {...props} selectedMetrics={[]} />)
      expect(getSvg(container).querySelectorAll('path').length).toBe(0)
    })

    it('redraws when the chart type changes (line → bar adds bars)', () => {
      const base = {
        data: createTestData('line', 6),
        loading: false,
        styleConfig: createTestStyleConfig(),
        selectedMetrics: lineMetrics,
      }
      const { container, rerender } = render(
        <Canvas {...base} config={createTestConfig({ type: 'line' })} />
      )
      // У линейного графика <rect> встречаются только как образцы цвета в легенде.
      const lineRects = getSvg(container).querySelectorAll('rect').length

      rerender(<Canvas {...base} config={createTestConfig({ type: 'bar' })} />)
      // Переключение на столбчатый тип добавляет столбцы-<rect> сверх легенды.
      const barRects = getSvg(container).querySelectorAll('rect').length
      expect(barRects).toBeGreaterThan(lineRects)
    })
  })

  describe('Export API (imperative handle)', () => {
    it('exposes exportToPNG/SVG/CSV through the ref', () => {
      const ref = createRef<{
        exportToPNG: (s?: object) => Promise<void>
        exportToSVG: () => void
        exportToCSV: () => void
      }>()
      render(
        <Canvas
          ref={ref}
          config={createTestConfig({ type: 'line' })}
          data={createTestData('line', 5)}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={lineMetrics}
        />
      )
      expect(typeof ref.current?.exportToPNG).toBe('function')
      expect(typeof ref.current?.exportToSVG).toBe('function')
      expect(typeof ref.current?.exportToCSV).toBe('function')
    })

    it('exportToCSV builds a download without throwing', () => {
      const ref = createRef<{ exportToCSV: () => void }>()
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      render(
        <Canvas
          ref={ref}
          config={createTestConfig({ type: 'line' })}
          data={createTestData('line', 5)}
          loading={false}
          styleConfig={createTestStyleConfig()}
          selectedMetrics={lineMetrics}
        />
      )
      act(() => {
        ref.current?.exportToCSV()
      })
      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles malformed data gracefully (no throw)', () => {
      expect(() =>
        render(
          <Canvas
            config={createTestConfig({ type: 'line' })}
            data={[{ foo: 'bar' }] as unknown as Record<string, unknown>[]}
            loading={false}
            styleConfig={createTestStyleConfig()}
            selectedMetrics={lineMetrics}
          />
        )
      ).not.toThrow()
    })
  })
})
