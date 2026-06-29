import { describe, it, expect } from 'vitest'
import {
  validateWeightInput,
  weightRangeForSpecies,
  formatWeightNumber,
} from './weight'

describe('validateWeightInput', () => {
  it("принимает запятую как десятичный разделитель ('5,5' → 5.5)", () => {
    const res = validateWeightInput('5,5', 'dog')
    expect(res.ok).toBe(true)
    expect(res.value).toBe(5.5)
  })

  it("принимает точку ('5.5' → 5.5)", () => {
    const res = validateWeightInput('5.5', 'dog')
    expect(res.ok).toBe(true)
    expect(res.value).toBe(5.5)
  })

  it('принимает целое число', () => {
    const res = validateWeightInput('7', 'dog')
    expect(res.ok).toBe(true)
    expect(res.value).toBe(7)
  })

  it('обрезает пробелы по краям', () => {
    const res = validateWeightInput('  4,2  ', 'cat')
    expect(res.ok).toBe(true)
    expect(res.value).toBe(4.2)
  })

  it('отклоняет значение выше диапазона вида (кошка > 20 кг)', () => {
    const res = validateWeightInput('25', 'cat')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/диапазон/i)
  })

  it('отклоняет значение ниже минимума (< 0.3 кг)', () => {
    const res = validateWeightInput('0.1', 'dog')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/диапазон/i)
  })

  it('отклоняет нечисловой ввод', () => {
    const res = validateWeightInput('abc', 'dog')
    expect(res.ok).toBe(false)
    expect(res.error).toBeTruthy()
  })

  it('отклоняет пустую строку', () => {
    const res = validateWeightInput('', 'dog')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Введите вес')
  })

  it('отклоняет null', () => {
    const res = validateWeightInput(null, 'dog')
    expect(res.ok).toBe(false)
  })

  it('отклоняет более 2 знаков после разделителя', () => {
    const res = validateWeightInput('5.555', 'dog')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/до 2 знаков/i)
  })

  it('принимает ровно 2 знака после разделителя', () => {
    const res = validateWeightInput('5,25', 'dog')
    expect(res.ok).toBe(true)
    expect(res.value).toBe(5.25)
  })

  it('отклоняет вес для собаки выше 100 кг', () => {
    const res = validateWeightInput('150', 'dog')
    expect(res.ok).toBe(false)
  })

  it('использует диапазон default для неизвестного вида', () => {
    // default max = 100 → 50 кг проходит
    const res = validateWeightInput('50', 'hamster')
    expect(res.ok).toBe(true)
    expect(res.value).toBe(50)
  })
})

describe('weightRangeForSpecies', () => {
  it('возвращает диапазон кошки', () => {
    expect(weightRangeForSpecies('cat')).toEqual({ min: 0.3, max: 20 })
  })

  it('возвращает диапазон собаки', () => {
    expect(weightRangeForSpecies('dog')).toEqual({ min: 0.3, max: 100 })
  })

  it('падает в default для неизвестного вида', () => {
    expect(weightRangeForSpecies('unknown')).toEqual({ min: 0.3, max: 100 })
  })
})

describe('formatWeightNumber', () => {
  it('убирает хвостовые нули и округляет до 2 знаков', () => {
    expect(formatWeightNumber(5)).toBe('5')
    expect(formatWeightNumber(5.2)).toBe('5.2')
    expect(formatWeightNumber(5.25)).toBe('5.25')
    expect(formatWeightNumber(5.254)).toBe('5.25')
  })
})
