import { describe, it, expect } from 'vitest'
import {
  extractPhoneDigits,
  formatPhoneDisplay,
  normalizePhone,
  isPhoneComplete,
} from './phoneFormat'

describe('extractPhoneDigits', () => {
  it('выдаёт 10 национальных цифр из чистого ввода', () => {
    expect(extractPhoneDigits('9991234567')).toBe('9991234567')
  })

  it('отбрасывает ведущую 8 (11 цифр)', () => {
    expect(extractPhoneDigits('89991234567')).toBe('9991234567')
  })

  it('отбрасывает ведущую 7 (11 цифр)', () => {
    expect(extractPhoneDigits('79991234567')).toBe('9991234567')
  })

  it('игнорирует маску, скобки, пробелы и дефисы', () => {
    expect(extractPhoneDigits('+7 (999) 123-45-67')).toBe('9991234567')
  })

  it('обрезает лишние цифры до 10', () => {
    expect(extractPhoneDigits('999123456789')).toBe('9991234567')
  })

  it('возвращает пустую строку для пустого/нулевого ввода', () => {
    expect(extractPhoneDigits('')).toBe('')
    expect(extractPhoneDigits(null)).toBe('')
    expect(extractPhoneDigits(undefined)).toBe('')
  })
})

describe('formatPhoneDisplay', () => {
  it('пустой ввод → пустая строка (виден плейсхолдер)', () => {
    expect(formatPhoneDisplay('')).toBe('')
  })

  it('форматирует частичный ввод по мере набора', () => {
    expect(formatPhoneDisplay('9')).toBe('+7 (9')
    expect(formatPhoneDisplay('999')).toBe('+7 (999)')
    expect(formatPhoneDisplay('999123')).toBe('+7 (999) 123')
    expect(formatPhoneDisplay('99912345')).toBe('+7 (999) 123-45')
  })

  it('форматирует полный номер в +7 (XXX) XXX-XX-XX', () => {
    expect(formatPhoneDisplay('9991234567')).toBe('+7 (999) 123-45-67')
  })

  it('перенабор из «8…» форматируется корректно', () => {
    expect(formatPhoneDisplay('89991234567')).toBe('+7 (999) 123-45-67')
  })
})

describe('normalizePhone', () => {
  it('нормализует маску к +7XXXXXXXXXX', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('+79991234567')
  })

  it('нормализует ввод с ведущей 8', () => {
    expect(normalizePhone('89991234567')).toBe('+79991234567')
  })

  it('нормализует чистые 10 цифр', () => {
    expect(normalizePhone('9991234567')).toBe('+79991234567')
  })
})

describe('isPhoneComplete', () => {
  it('true при ровно 10 цифрах', () => {
    expect(isPhoneComplete('+7 (999) 123-45-67')).toBe(true)
  })

  it('false при недоборе', () => {
    expect(isPhoneComplete('+7 (999) 123')).toBe(false)
    expect(isPhoneComplete('')).toBe(false)
  })
})
