import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MetricsPanel from './MetricsPanel'

const mockMetrics = [
  {
    id: 'users_count',
    name: 'Количество пользователей',
    display_name: 'Пользователи',
    category: 'users',
    data_type: 'integer',
    description: 'Общее количество зарегистрированных пользователей'
  },
  {
    id: 'orders_total',
    name: 'Общая сумма заказов',
    display_name: 'Сумма заказов',
    category: 'orders',
    data_type: 'decimal',
    units: '₽',
    description: 'Общая сумма всех заказов'
  },
  {
    id: 'products_views',
    name: 'Просмотры товаров',
    display_name: 'Просмотры',
    category: 'products',
    data_type: 'integer',
    description: 'Количество просмотров страниц товаров'
  }
]

const mockCategories = [
  { id: 'users', name: 'Пользователи', count: 1 },
  { id: 'orders', name: 'Заказы', count: 1 },
  { id: 'products', name: 'Товары', count: 1 }
]

describe('MetricsPanel Component', () => {
  const defaultProps = {
    metrics: mockMetrics,
    categories: mockCategories,
    selectedMetrics: [],
    onMetricAdd: vi.fn(),
    onMetricRemove: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the panel with title', () => {
      render(<MetricsPanel {...defaultProps} />)
      expect(screen.getByText('Метрики')).toBeInTheDocument()
    })

    it('displays search input', () => {
      render(<MetricsPanel {...defaultProps} />)
      const searchInput = screen.getByPlaceholderText('Поиск метрик...')
      expect(searchInput).toBeInTheDocument()
    })

    it('renders category tabs', () => {
      render(<MetricsPanel {...defaultProps} />)
      expect(screen.getByText('Все')).toBeInTheDocument()
      expect(screen.getByText('Пользователи (1)')).toBeInTheDocument()
      expect(screen.getByText('Заказы (1)')).toBeInTheDocument()
      expect(screen.getByText('Товары (1)')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('filters metrics based on search query', async () => {
      const user = userEvent.setup()
      render(<MetricsPanel {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Поиск метрик...')

      await user.type(searchInput, 'пользователей')

      await waitFor(() => {
        expect(screen.getByText('Количество пользователей')).toBeInTheDocument()
        expect(screen.queryByText('Общая сумма заказов')).not.toBeInTheDocument()
      })
    })

    it('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup()
      render(<MetricsPanel {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Поиск метрик...')

      await user.type(searchInput, 'несуществующая метрика')

      await waitFor(() => {
        expect(screen.getByText('Метрики не найдены')).toBeInTheDocument()
      })
    })

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<MetricsPanel {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Поиск метрик...')

      await user.type(searchInput, 'пользователей')
      expect(searchInput).toHaveValue('пользователей')

      const clearButton = screen.getByRole('button', { name: /очистить/i })
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
    })
  })

  describe('Category Filtering', () => {
    it('shows all metrics when "Все" tab is selected', () => {
      render(<MetricsPanel {...defaultProps} />)

      expect(screen.getByText('Количество пользователей')).toBeInTheDocument()
      expect(screen.getByText('Общая сумма заказов')).toBeInTheDocument()
      expect(screen.getByText('Просмотры товаров')).toBeInTheDocument()
    })

    it('filters metrics by category when category tab is clicked', async () => {
      const user = userEvent.setup()
      render(<MetricsPanel {...defaultProps} />)

      const usersTab = screen.getByText('Пользователи (1)')
      await user.click(usersTab)

      await waitFor(() => {
        expect(screen.getByText('Количество пользователей')).toBeInTheDocument()
        expect(screen.queryByText('Общая сумма заказов')).not.toBeInTheDocument()
        expect(screen.queryByText('Просмотры товаров')).not.toBeInTheDocument()
      })
    })
  })

  describe('Metric Selection', () => {
    it('calls onMetricAdd when metric is clicked and not selected', async () => {
      const user = userEvent.setup()
      render(<MetricsPanel {...defaultProps} />)

      const metricItem = screen.getByText('Количество пользователей')
      await user.click(metricItem)

      expect(defaultProps.onMetricAdd).toHaveBeenCalledWith(mockMetrics[0])
    })

    it('shows selected state for selected metrics', () => {
      const selectedMetrics = [mockMetrics[0]]
      render(<MetricsPanel {...defaultProps} selectedMetrics={selectedMetrics} />)

      const metricItem = screen.getByText('Количество пользователей').closest('.metric-item')
      expect(metricItem).toHaveClass('selected')
    })

    it('calls onMetricRemove when remove button is clicked for selected metric', async () => {
      const user = userEvent.setup()
      const selectedMetrics = [mockMetrics[0]]

      render(<MetricsPanel {...defaultProps} selectedMetrics={selectedMetrics} />)

      const removeButton = screen.getByRole('button', { name: /убрать/i })
      await user.click(removeButton)

      expect(defaultProps.onMetricRemove).toHaveBeenCalledWith(mockMetrics[0].id)
    })
  })

  describe('Drag and Drop', () => {
    it('shows drag handle for each metric', () => {
      render(<MetricsPanel {...defaultProps} />)

      const dragHandles = screen.getAllByTestId('drag-handle')
      expect(dragHandles).toHaveLength(mockMetrics.length)
    })

    it('calls onDragStart when drag starts', async () => {
      const mockOnDragStart = vi.fn()
      const user = userEvent.setup()

      render(<MetricsPanel {...defaultProps} onDragStart={mockOnDragStart} />)

      const dragHandle = screen.getAllByTestId('drag-handle')[0]

      // Имитируем начало перетаскивания
      fireEvent.dragStart(dragHandle)

      expect(mockOnDragStart).toHaveBeenCalled()
    })
  })

  describe('Selected Metrics Section', () => {
    it('shows selected metrics section when metrics are selected', () => {
      const selectedMetrics = [mockMetrics[0]]
      render(<MetricsPanel {...defaultProps} selectedMetrics={selectedMetrics} />)

      expect(screen.getByText('Выбранные метрики (1)')).toBeInTheDocument()
    })

    it('does not show selected metrics section when no metrics selected', () => {
      render(<MetricsPanel {...defaultProps} selectedMetrics={[]} />)

      expect(screen.queryByText('Выбранные метрики')).not.toBeInTheDocument()
    })

    it('displays selected metrics in the selected section', () => {
      const selectedMetrics = [mockMetrics[0], mockMetrics[1]]
      render(<MetricsPanel {...defaultProps} selectedMetrics={selectedMetrics} />)

      expect(screen.getByText('Количество пользователей')).toBeInTheDocument()
      expect(screen.getByText('Общая сумма заказов')).toBeInTheDocument()
    })
  })

  describe('Metric Information Display', () => {
    it('displays metric name and description', () => {
      render(<MetricsPanel {...defaultProps} />)

      expect(screen.getByText('Количество пользователей')).toBeInTheDocument()
      expect(screen.getByText('Общее количество зарегистрированных пользователей')).toBeInTheDocument()
    })

    it('displays data type badge', () => {
      render(<MetricsPanel {...defaultProps} />)

      expect(screen.getByText('integer')).toBeInTheDocument()
      expect(screen.getByText('decimal')).toBeInTheDocument()
    })

    it('displays units when available', () => {
      render(<MetricsPanel {...defaultProps} />)

      expect(screen.getByText('₽')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading state when metrics are being loaded', () => {
      render(<MetricsPanel {...defaultProps} loading={true} />)

      expect(screen.getByText('Загрузка метрик...')).toBeInTheDocument()
    })

    it('disables interactions during loading', () => {
      render(<MetricsPanel {...defaultProps} loading={true} />)

      const searchInput = screen.getByPlaceholderText('Поиск метрик...')
      expect(searchInput).toBeDisabled()
    })
  })

  describe('Error States', () => {
    it('shows error message when loading fails', () => {
      render(<MetricsPanel {...defaultProps} error="Failed to load metrics" />)

      expect(screen.getByText('Ошибка загрузки метрик')).toBeInTheDocument()
      expect(screen.getByText('Failed to load metrics')).toBeInTheDocument()
    })

    it('shows retry button on error', () => {
      render(<MetricsPanel {...defaultProps} error="Error" />)

      const retryButton = screen.getByRole('button', { name: /повторить/i })
      expect(retryButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(<MetricsPanel {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Поиск метрик...')
      expect(searchInput).toHaveAttribute('aria-label', 'Поиск метрик')

      const categoryTabs = screen.getAllByRole('tab')
      expect(categoryTabs.length).toBeGreaterThan(0)
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MetricsPanel {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Поиск метрик...')

      // Фокус на поисковом поле
      await user.tab()
      expect(searchInput).toHaveFocus()

      // Навигация по метрикам
      await user.tab()
      const firstMetric = screen.getByText('Количество пользователей')
      expect(firstMetric).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders large number of metrics efficiently', () => {
      const largeMetrics = Array.from({ length: 100 }, (_, i) => ({
        id: `metric-${i}`,
        name: `Metric ${i}`,
        display_name: `Metric ${i}`,
        category: 'test',
        data_type: 'integer'
      }))

      const largeCategories = [{ id: 'test', name: 'Test', count: 100 }]

      const startTime = performance.now()

      render(
        <MetricsPanel
          {...defaultProps}
          metrics={largeMetrics}
          categories={largeCategories}
        />
      )

      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(100) // Должен рендериться быстро
    })

    it('debounces search input', async () => {
      const user = userEvent.setup()
      const mockOnSearch = vi.fn()

      // Mock the search functionality
      render(<MetricsPanel {...defaultProps} onSearch={mockOnSearch} />)

      const searchInput = screen.getByPlaceholderText('Поиск метрик...')

      // Быстрый ввод текста
      await user.type(searchInput, 'test')

      // Ожидаем debounce
      await waitFor(() => {
        // Поиск должен быть вызван только один раз после debounce
        expect(mockOnSearch).toHaveBeenCalledTimes(1)
      }, { timeout: 300 })
    })
  })
})
