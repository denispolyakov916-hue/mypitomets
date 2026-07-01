import { describe, it, expect } from 'vitest'
import { rationMix, isWetFood, isDryFood, DRY_SHARE } from './recommendationsAdapter'

const dry = { id: 1, name: 'Сухой корм для кошек', price: 1000 }
const wet = { id: 2, name: 'Влажный корм паучи', price: 500 }

describe('isWetFood / isDryFood', () => {
  it('распознаёт влажный корм по названию', () => {
    expect(isWetFood({ name: 'Влажный корм паучи' })).toBe(true)
    expect(isWetFood({ name: 'Консервы для собак' })).toBe(true)
    expect(isWetFood({ name: 'Паштет с индейкой' })).toBe(true)
  })
  it('распознаёт влажный корм по short_description / category_name', () => {
    expect(isWetFood({ name: 'Royal X', short_description: 'кусочки в соусе' })).toBe(true)
    expect(isWetFood({ name: 'Brand Y', category_name: 'Влажные корма' })).toBe(true)
  })
  it('сухой корм не помечается влажным', () => {
    expect(isWetFood({ name: 'Сухой корм для кошек' })).toBe(false)
    expect(isDryFood({ name: 'Сухой корм для кошек' })).toBe(true)
  })
  it('пустой продукт не является ни влажным (isWetFood=false)', () => {
    expect(isWetFood(null)).toBe(false)
    expect(isDryFood(null)).toBe(false)
  })
})

describe('rationMix — настоящая смесь при наличии обеих форм', () => {
  it('обе формы → пропорция 70/30 и подпись про смесь', () => {
    const mix = rationMix(dry, wet, DRY_SHARE)
    expect(mix.mixed).toBe(true)
    expect(mix.form).toBe('mixed')
    expect(mix.dryPct).toBe(70)
    expect(mix.wetPct).toBe(30)
    expect(mix.dry).toBe(dry)
    expect(mix.wet).toBe(wet)
    expect(mix.label).toBe('70% сухой / 30% влажный')
    expect(mix.note).toBeNull()
  })

  it('cost = взвешенная стоимость по долям (не одна пачка)', () => {
    const mix = rationMix(dry, wet, 0.7)
    // 1000*0.7 + 500*0.3 = 700 + 150 = 850
    expect(mix.cost).toBe(850)
  })

  it('доли всегда суммируются в 100', () => {
    const mix = rationMix(dry, wet, 0.63)
    expect(mix.dryPct + mix.wetPct).toBe(100)
  })
})

describe('rationMix — честная деградация при одной форме', () => {
  it('только сухой → 100% сухой, честная пометка, cost = цена сухого', () => {
    const mix = rationMix(dry, null, DRY_SHARE)
    expect(mix.mixed).toBe(false)
    expect(mix.form).toBe('dry')
    expect(mix.dryPct).toBe(100)
    expect(mix.wetPct).toBe(0)
    expect(mix.label).toBe('100% сухой')
    expect(mix.note).toMatch(/влажный/i)
    expect(mix.cost).toBe(1000)
  })

  it('только влажный → 100% влажный, честная пометка, cost = цена влажного', () => {
    const mix = rationMix(null, wet, DRY_SHARE)
    expect(mix.mixed).toBe(false)
    expect(mix.form).toBe('wet')
    expect(mix.dryPct).toBe(0)
    expect(mix.wetPct).toBe(100)
    expect(mix.label).toBe('100% влажный')
    expect(mix.note).toMatch(/сухой/i)
    expect(mix.cost).toBe(500)
  })

  it('нет ни одной формы → null', () => {
    expect(rationMix(null, null)).toBeNull()
  })

  it('никогда не показывает смешанный ярлык при одной форме', () => {
    expect(rationMix(dry, null).label).not.toMatch(/\//) // нет «X/Y»
    expect(rationMix(null, wet).label).not.toMatch(/\//)
  })
})

describe('rationMix — граничные доли', () => {
  it('dryShare клампится в [0,1]', () => {
    expect(rationMix(dry, wet, 5).dryPct).toBe(100)
    expect(rationMix(dry, wet, 5).wetPct).toBe(0)
    expect(rationMix(dry, wet, -1).dryPct).toBe(0)
  })
  it('некорректный dryShare → дефолт DRY_SHARE', () => {
    const mix = rationMix(dry, wet, NaN)
    expect(mix.dryPct).toBe(Math.round(DRY_SHARE * 100))
  })
})
