import { describe, it, expect } from 'vitest'
import {
  draftToDateOfBirth,
  draftAgeMonths,
  isYoungAnimal,
  weightStepFor,
  hasValidAge,
  formatAgeLabel,
  ageError,
} from './petAge'

// Фиксированная «сегодня» — 15 июня 2026 (локально), чтобы тесты были детерминированы.
const NOW = new Date(2026, 5, 15, 12, 0, 0)

describe('draftToDateOfBirth', () => {
  it('режим months: 6 месяцев → дата на полгода назад (не годы×0.5)', () => {
    expect(draftToDateOfBirth({ ageMode: 'months', ageMonths: 6 }, NOW)).toBe('2025-12-15')
  })

  it('режим months принимает строку с запятой и округляет', () => {
    expect(draftToDateOfBirth({ ageMode: 'months', ageMonths: '3' }, NOW)).toBe('2026-03-15')
  })

  it('режим years: целые годы', () => {
    expect(draftToDateOfBirth({ ageMode: 'years', ageYears: 2 }, NOW)).toBe('2024-06-15')
  })

  it('BUG1: ageYears без выставленного ageMode (дефолтная вкладка «Лет») работает', () => {
    // Регрессия: при отсутствии ageMode читалось legacy-поле age, и «Далее» не включалось.
    expect(draftToDateOfBirth({ ageYears: '3' }, NOW)).toBe('2023-06-15')
    expect(hasValidAge({ ageYears: '3' })).toBe(true)
  })

  it('BUG1: режим years принимает строку с запятой', () => {
    expect(draftToDateOfBirth({ ageMode: 'years', ageYears: '1,5' }, NOW)).toBe('2024-12-15')
  })

  it('BUG1: будущая дата рождения → null (отклоняется)', () => {
    expect(draftToDateOfBirth({ ageMode: 'dob', dob: '2030-01-01' }, NOW)).toBeNull()
    expect(hasValidAge({ ageMode: 'dob', dob: '2030-01-01' })).toBe(false)
  })

  it('BUG1: сегодняшняя дата рождения принимается (не «будущее»)', () => {
    expect(draftToDateOfBirth({ ageMode: 'dob', dob: '2026-06-15' }, NOW)).toBe('2026-06-15')
  })

  it('режим years: дробные годы считаются по месяцам', () => {
    // 1.5 года = 1 год и 6 месяцев назад
    expect(draftToDateOfBirth({ ageMode: 'years', ageYears: 1.5 }, NOW)).toBe('2024-12-15')
  })

  it('режим dob: возвращает дату как есть (локально, без off-by-one)', () => {
    expect(draftToDateOfBirth({ ageMode: 'dob', dob: '2025-01-20' }, NOW)).toBe('2025-01-20')
  })

  it('legacy-черновик с полем age (годы) всё ещё работает', () => {
    expect(draftToDateOfBirth({ age: 3 }, NOW)).toBe('2023-06-15')
  })

  it('пустой/невалидный возраст → null', () => {
    expect(draftToDateOfBirth({ ageMode: 'months', ageMonths: '' }, NOW)).toBeNull()
    expect(draftToDateOfBirth({}, NOW)).toBeNull()
    expect(draftToDateOfBirth({ ageMode: 'years', ageYears: -1 }, NOW)).toBeNull()
  })
})

describe('draftAgeMonths', () => {
  it('месяцы → как есть', () => {
    expect(draftAgeMonths({ ageMode: 'months', ageMonths: 8 }, NOW)).toBe(8)
  })
  it('годы → ×12', () => {
    expect(draftAgeMonths({ ageMode: 'years', ageYears: 2 }, NOW)).toBe(24)
  })
  it('dob → разница в месяцах', () => {
    expect(draftAgeMonths({ ageMode: 'dob', dob: '2025-12-15' }, NOW)).toBe(6)
  })
})

describe('isYoungAnimal / weightStepFor', () => {
  it('щенок 4 мес — молодой, шаг 0.05', () => {
    const d = { ageMode: 'months', ageMonths: 4 }
    expect(isYoungAnimal(d)).toBe(true)
    expect(weightStepFor(d)).toBe('0.05')
  })

  it('взрослый 3 года, нормальный вес — шаг 0.1', () => {
    const d = { ageMode: 'years', ageYears: 3 }
    expect(isYoungAnimal(d)).toBe(false)
    expect(weightStepFor(d, 5.4)).toBe('0.1')
  })

  it('микро-питомец < 2 кг — шаг 0.05 даже если взрослый', () => {
    expect(weightStepFor({ ageMode: 'years', ageYears: 5 }, 1.4)).toBe('0.05')
  })
})

describe('hasValidAge', () => {
  it('true при заданном возрасте, false при пустом', () => {
    expect(hasValidAge({ ageMode: 'months', ageMonths: 2 })).toBe(true)
    expect(hasValidAge({})).toBe(false)
  })
  it('true для всех трёх режимов одинаково (years/months/dob)', () => {
    expect(hasValidAge({ ageMode: 'years', ageYears: '3' })).toBe(true)
    expect(hasValidAge({ ageMode: 'months', ageMonths: '8' })).toBe(true)
    expect(hasValidAge({ ageMode: 'dob', dob: '2025-01-20' })).toBe(true)
  })
})

describe('ageError', () => {
  it('пустое поле — без ошибки (не трогали)', () => {
    expect(ageError({ ageMode: 'years' }, NOW)).toBeNull()
    expect(ageError({ ageMode: 'dob' }, NOW)).toBeNull()
    expect(ageError({ ageMode: 'months' }, NOW)).toBeNull()
  })
  it('будущая дата рождения → текст ошибки', () => {
    expect(ageError({ ageMode: 'dob', dob: '2030-01-01' }, NOW)).toBe('Дата рождения не может быть в будущем')
  })
  it('корректные значения → без ошибки', () => {
    expect(ageError({ ageMode: 'years', ageYears: '3' }, NOW)).toBeNull()
    expect(ageError({ ageMode: 'dob', dob: '2025-01-20' }, NOW)).toBeNull()
  })
})

describe('formatAgeLabel', () => {
  it('малыш в месяцах', () => {
    expect(formatAgeLabel({ ageMode: 'months', ageMonths: 1 })).toBe('1 месяц')
    expect(formatAgeLabel({ ageMode: 'months', ageMonths: 3 })).toBe('3 месяца')
    expect(formatAgeLabel({ ageMode: 'months', ageMonths: 8 })).toBe('8 месяцев')
  })
  it('взрослый в годах', () => {
    expect(formatAgeLabel({ ageMode: 'years', ageYears: 1 })).toBe('1 год')
    expect(formatAgeLabel({ ageMode: 'years', ageYears: 2 })).toBe('2 года')
    expect(formatAgeLabel({ ageMode: 'years', ageYears: 5 })).toBe('5 лет')
  })
})
