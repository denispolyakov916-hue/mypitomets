/**
 * Глобальный setup для Vitest (см. vitest.config.js → test.setupFiles).
 *
 * Подключает jest-dom матчеры (toBeInTheDocument, toHaveValue, ...) и чистит
 * DOM между тестами, чтобы рендеры компонентов не «протекали» друг в друга.
 */
import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
