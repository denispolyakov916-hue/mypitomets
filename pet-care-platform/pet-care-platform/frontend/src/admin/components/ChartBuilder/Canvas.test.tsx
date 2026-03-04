import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Canvas from './Canvas'
import {
  createDOMContainer,
  createTestData,
  createTestConfig,
  assertSVGElements,
  assertAxes,
  assertLegend,
  simulateMouseEvent
} from '../../../test/utils/d3-test-utils'

// Mock D3 helpers
vi.mock('../../../utils/d3-helpers', () => ({
  renderChart: vi.fn(),
  renderMultiLayerChart: vi.fn(),
  createScales: vi.fn(() => ({
    xScale: vi.fn(() => 100),
    yScale: vi.fn(() => 200),
    chartWidth: 700,
    chartHeight: 300,
    margin: { top: 20, right: 30, bottom: 40, left: 50 }
  })),
  addInteractivity: vi.fn()
}))

describe('Canvas Component', () => {
  let domContainer: { container: HTMLElement; svg: SVGSVGElement }

  beforeEach(() => {
    domContainer = createDOMContainer()
    // Mock window.getComputedStyle
    Object.defineProperty(window, 'getComputedStyle', {
      value: vi.fn(() => ({
        getPropertyValue: vi.fn(() => '16px')
      }))
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders loading state when loading is true', () => {
      const config = createTestConfig()
      const data = null
      const loading = true

      render(
        <Canvas
          config={config}
          data={data}
          loading={loading}
          onConfigChange={vi.fn()}
        />
      )

      expect(screen.getByText('Загрузка данных...')).toBeInTheDocument()
    })

    it('renders empty state when no data is available', () => {
      const config = createTestConfig()
      const data = []
      const loading = false

      render(
        <Canvas
          config={config}
          data={data}
          loading={loading}
          onConfigChange={vi.fn()}
        />
      )

      expect(screen.getByText('Нет данных для отображения')).toBeInTheDocument()
      expect(screen.getByText('📊')).toBeInTheDocument()
    })

    it('renders chart when data is available', () => {
      const config = createTestConfig()
      const data = createTestData('line', 5)
      const loading = false

      render(
        <Canvas
          config={config}
          data={data}
          loading={loading}
          onConfigChange={vi.fn()}
        />
      )

      // Проверяем наличие SVG контейнера
      const canvasContainer = screen.getByTestId('canvas-container') ||
                             document.querySelector('.canvas-container')
      expect(canvasContainer).toBeInTheDocument()
    })
  })

  describe('Chart Rendering', () => {
    it('calls renderChart for single layer charts', async () => {
      const { renderChart } = await import('../../../utils/d3-helpers')
      const config = createTestConfig()
      const data = createTestData('line', 5)

      render(
        <Canvas
          config={config}
          data={data}
          loading={false}
          onConfigChange={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(renderChart).toHaveBeenCalled()
      })
    })

    it('calls renderMultiLayerChart for multi-layer charts', async () => {
      const { renderMultiLayerChart } = await import('../../../utils/d3-helpers')
      const config = createTestConfig({
        layers: [
          { id: 'layer-1', type: 'line', visible: true },
          { id: 'layer-2', type: 'bar', visible: true }
        ]
      })
      const data = createTestData('line', 5)

      render(
        <Canvas
          config={config}
          data={data}
          loading={false}
          onConfigChange={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(renderMultiLayerChart).toHaveBeenCalled()
      })
    })

    it('passes correct parameters to render functions', async () => {
      const { renderChart } = await import('../../../utils/d3-helpers')
      const config = createTestConfig()
      const data = createTestData('line', 5)

      render(
        <Canvas
          config={config}
          data={data}
          loading={false}
          onConfigChange={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(renderChart).toHaveBeenCalledWith(
          expect.any(Object), // SVG element
          config,
          data,
          expect.any(Object), // dimensions
          expect.any(Object) // zoom
        )
      })
    })
  })

  describe('Toolbar Functionality', () => {
    it('displays chart info in toolbar', () => {
      const config = createTestConfig({ name: 'Test Chart' })
      const data = createTestData('line', 10)

      render(
        <Canvas
          config={config}
          data={data}
          loading={false}
          onConfigChange={vi.fn()}
        />
      )

      expect(screen.getByText('Test Chart • 10 точек данных')).toBeInTheDocument()
    })

    it('shows zoom level in status bar', () => {
      const config = createTestConfig()
      const data = createTestData('line', 5)

      render(
        <Canvas
          config={config}
          data={data}
          loading={false}
          onConfigChange={vi.fn()}
        />
      )

      // Проверяем наличие статуса
      const statusBar = document.querySelector('.canvas-status')
      expect(statusBar).toBeInTheDocument()
    })
  })

  describe('Performance Monitoring', () => {
    it('measures render performance', async () => {
      const config = createTestConfig()
      const data = createTestData('line', 100) // Большой датасет

      const startTime = performance.now()

      render(
        <Canvas
          config={config}
          data={data}
          loading={false}
          onConfigChange={vi.fn()}
        />
      )

      await waitFor(() => {
        const renderTime = performance.now() - startTime
        // Рендеринг должен занять разумное время
        expect(renderTime).toBeLessThan(1000)
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const config = createTestConfig()
      const data = createTestData('line', 5)

      render(
        <Canvas
          config={config}
          data={data}
          loading={false}
          onConfigChange={vi.fn()}
        />
      )

      // Проверяем наличие SVG с правильными атрибутами
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg?.getAttribute('role')).toBe('img')
    })
  })

  describe('Error Handling', () => {
    it('handles render errors gracefully', () => {
      const { renderChart } = require('../../../utils/d3-helpers')
      renderChart.mockImplementation(() => {
        throw new Error('Render error')
      })

      const config = createTestConfig()
      const data = createTestData('line', 5)

      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(
          <Canvas
            config={config}
            data={data}
            loading={false}
            onConfigChange={vi.fn()}
          />
        )
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })
})
