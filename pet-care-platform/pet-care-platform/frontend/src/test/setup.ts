/**
 * Глобальный setup для Vitest (см. vitest.config.js → test.setupFiles).
 *
 * Подключает jest-dom матчеры (toBeInTheDocument, toHaveValue, ...) и чистит
 * DOM между тестами, чтобы рендеры компонентов не «протекали» друг в друга.
 */
import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom не реализует ResizeObserver — добавляем минимальный полифилл, чтобы
// компоненты с ResizeObserver (например, Canvas) могли монтироваться в тестах.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error — назначаем полифилл в тестовое глобальное окружение
  globalThis.ResizeObserver = ResizeObserverStub
}

afterEach(() => {
  cleanup()
})
