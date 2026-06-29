import { describe, it, expect } from 'vitest'
import { toLocalISODate } from './date'

describe('toLocalISODate', () => {
  it('форматирует Date по локальному времени без сдвига в UTC (нет off-by-one)', () => {
    // Полночь 1 января 2023 по ЛОКАЛЬНОМУ времени. При наивном toISOString() в зонах
    // с положительным смещением (например +03 МСК) получили бы '2022-12-31' — это и есть
    // баг, который фиксит функция. Здесь ожидаем строго локальную дату.
    const d = new Date(2023, 0, 1, 0, 0)
    expect(toLocalISODate(d)).toBe('2023-01-01')
  })

  it('сохраняет дату даже в самом начале суток (00:00 не уезжает на предыдущий день)', () => {
    expect(toLocalISODate(new Date(2024, 11, 31, 0, 0, 0))).toBe('2024-12-31')
  })

  it('паддит месяц и день нулями', () => {
    expect(toLocalISODate(new Date(2023, 2, 5, 12, 0))).toBe('2023-03-05')
    expect(toLocalISODate(new Date(2000, 0, 9, 23, 59))).toBe('2000-01-09')
  })

  it('обрабатывает високосный день', () => {
    expect(toLocalISODate(new Date(2024, 1, 29, 8, 30))).toBe('2024-02-29')
  })

  it('возвращает локальную дату для конца суток (23:59 остаётся в том же дне)', () => {
    expect(toLocalISODate(new Date(2023, 5, 15, 23, 59, 59))).toBe('2023-06-15')
  })

  it('возвращает null для null / undefined', () => {
    expect(toLocalISODate(null)).toBeNull()
    expect(toLocalISODate(undefined)).toBeNull()
  })

  it('возвращает null для невалидной даты', () => {
    expect(toLocalISODate('не дата')).toBeNull()
    expect(toLocalISODate(new Date('invalid'))).toBeNull()
  })

  it('принимает timestamp и форматирует по локальному дню', () => {
    const ts = new Date(2022, 6, 4, 10, 0).getTime()
    expect(toLocalISODate(ts)).toBe('2022-07-04')
  })
})
