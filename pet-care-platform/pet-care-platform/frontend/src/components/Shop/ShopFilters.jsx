/**
 * Modern Shop Filters Component
 * 
 * Comprehensive filter sidebar with:
 * - Animal type selection (dog/cat)
 * - Category tree navigation
 * - Age/Size group filters (for food)
 * - Brand class selection
 * - Special diet toggles
 * - Brand search
 * - Price range
 */

import React, { useState, useEffect, useMemo, memo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatProductCount } from '../../utils/format'

// Category icons mapping
const CATEGORY_ICONS = {
  'food': '🍖',
  'питание': '🍖',
  'корм': '🍖',
  'health': '💊',
  'ветаптека': '💊',
  'toilet': '🚽',
  'туалет': '🚽',
  'feeding': '🥣',
  'миски': '🥣',
  'toys': '🎾',
  'игрушки': '🎾',
  'walk': '🎒',
  'амуниция': '🎒',
  'clothing': '👕',
  'одежда': '👕',
  'care': '🧴',
  'уход': '🧴',
  'груминг': '✂️',
  'housing': '🏠',
  'транспорт': '🏠',
  'лакомства': '🦴',
  'витамины': '💪',
  'наполнители': '🧱',
  'когтеточки': '🐾',
}

const CATEGORY_TREE_SPEC = [
  {
    id: 'food',
    name: 'Питание',
    icon: '🍖',
    children: [
      { id: 'food.dry', name: 'Сухой корм' },
      { id: 'food.wet', name: 'Влажный корм' },
      { id: 'food.semi_moist', name: 'Полувлажный корм' },
      { id: 'food.canned', name: 'Консервы' },
      { id: 'food.pouches', name: 'Паучи' },
      { id: 'food.pate', name: 'Паштеты' },
      { id: 'food.holistic', name: 'Холистики' },
      { id: 'food.diet', name: 'Диетический корм' },
      { id: 'food.hypoallergenic', name: 'Гипоаллергенный корм' },
      { id: 'food.treats', name: 'Лакомства' },
      { id: 'food.supplements', name: 'Витамины и добавки' },
      { id: 'food.lifestage.kitten', name: 'Правильное питание для котенка' },
      { id: 'food.lifestage.puppy', name: 'Правильное питание для щенка' },
    ],
  },
  {
    id: 'health',
    name: 'Ветаптека',
    icon: '💊',
    children: [
      { id: 'health.parasite', name: 'Средства от паразитов' },
    ],
  },
  {
    id: 'toilet',
    name: 'Туалеты и гигиена',
    icon: '🚽',
    children: [
      { id: 'toilet.litter', name: 'Наполнители' },
      { id: 'toilet.litter_boxes', name: 'Лотки' },
      { id: 'toilet.litter_boxes_auto', name: 'Автоматические лотки' },
      { id: 'toilet.bio_toilets', name: 'Биотуалеты' },
      { id: 'toilet.waste_bags', name: 'Пакеты для выгула' },
      { id: 'toilet.pads', name: 'Пеленки' },
      { id: 'toilet.diapers', name: 'Подгузники' },
      { id: 'toilet.scoops', name: 'Совочки' },
    ],
  },
  {
    id: 'feeding',
    name: 'Миски и поилки',
    icon: '🥣',
    children: [
      { id: 'feeding.bowls', name: 'Миски' },
      { id: 'feeding.drinkers', name: 'Поилки' },
      { id: 'feeding.bottles', name: 'Бутылочки' },
    ],
  },
  {
    id: 'toys',
    name: 'Игрушки и развлечения',
    icon: '🎾',
    children: [
      { id: 'toys.toys', name: 'Игрушки' },
      { id: 'toys.scratching_posts', name: 'Когтеточки' },
      { id: 'toys.playgrounds', name: 'Игровые площадки' },
      { id: 'toys.tunnels', name: 'Тоннели' },
    ],
  },
  {
    id: 'walk',
    name: 'Амуниция и выгул',
    icon: '🎒',
    children: [
      { id: 'walk.collars', name: 'Ошейники' },
      { id: 'walk.leashes', name: 'Поводки' },
      { id: 'walk.harnesses', name: 'Шлейки' },
      { id: 'walk.belts', name: 'Пояса' },
      { id: 'walk.tags', name: 'Адресники' },
      { id: 'walk.carabiners', name: 'Карабины' },
      { id: 'walk.clickers', name: 'Кликеры' },
      { id: 'walk.multiboxes', name: 'Мультибоксы' },
      { id: 'walk.muzzles', name: 'Намордники' },
      { id: 'walk.lights', name: 'Подсветки' },
      { id: 'walk.retractable', name: 'Рулетки' },
      { id: 'walk.bandanas', name: 'Банданы' },
      { id: 'walk.popons', name: 'Попоны' },
      { id: 'walk.accessories', name: 'Аксессуары' },
    ],
  },
  {
    id: 'clothing',
    name: 'Одежда и обувь',
    icon: '👕',
    children: [
      { id: 'clothing.general', name: 'Одежда' },
      { id: 'clothing.jumpsuits', name: 'Комбинезоны' },
      { id: 'clothing.raincoats', name: 'Дождевики' },
      { id: 'clothing.vests', name: 'Жилетки' },
      { id: 'clothing.popons', name: 'Попоны' },
      { id: 'clothing.jackets', name: 'Куртки' },
      { id: 'clothing.sweaters', name: 'Свитера' },
      { id: 'clothing.hats', name: 'Шапки' },
      { id: 'clothing.socks', name: 'Носки' },
      { id: 'clothing.shoes', name: 'Ботинки' },
      { id: 'clothing.tshirts', name: 'Футболки' },
      { id: 'clothing.tops', name: 'Майки' },
      { id: 'clothing.suits', name: 'Костюмы' },
      { id: 'clothing.hoodies', name: 'Толстовки' },
      { id: 'clothing.dresses', name: 'Платья' },
      { id: 'clothing.accessories', name: 'Аксессуары' },
    ],
  },
  {
    id: 'care',
    name: 'Уход и гигиена',
    icon: '🧴',
    children: [
      { id: 'care.grooming', name: 'Груминг' },
      { id: 'care.shampoos', name: 'Шампуни' },
      { id: 'care.conditioners', name: 'Кондиционеры' },
      { id: 'care.sprays', name: 'Спреи' },
      { id: 'care.lotions', name: 'Лосьоны' },
      { id: 'care.gels', name: 'Гели' },
      { id: 'care.waxes', name: 'Воски' },
      { id: 'care.perfumes', name: 'Парфюмерия' },
      { id: 'care.oils', name: 'Масла' },
      { id: 'care.masks', name: 'Маски' },
      { id: 'care.serums', name: 'Сыворотки' },
      { id: 'care.creams', name: 'Крема' },
      { id: 'care.foams', name: 'Пены' },
      { id: 'care.mousses', name: 'Муссы' },
      { id: 'care.tonics', name: 'Тоники' },
      { id: 'care.balms', name: 'Бальзамы' },
      { id: 'care.deodorants', name: 'Дезодоранты' },
      { id: 'care.wipes', name: 'Салфетки' },
      { id: 'care.soap', name: 'Мыло' },
      { id: 'care.liquids', name: 'Жидкости' },
      { id: 'care.drops', name: 'Капли' },
      { id: 'care.dental_pastes', name: 'Зубные пасты' },
      { id: 'care.dental_brushes', name: 'Зубные щетки' },
      { id: 'care.claw_clippers', name: 'Когтерезы' },
      { id: 'care.claw_grinders', name: 'Гриндеры' },
      { id: 'care.claw_files', name: 'Пилочки' },
      { id: 'care.brushes', name: 'Щетки' },
      { id: 'care.combs', name: 'Расчески' },
      { id: 'care.slickers', name: 'Пуходерки' },
      { id: 'care.scissors', name: 'Ножницы' },
      { id: 'care.rollers', name: 'Ролики' },
      { id: 'care.scrapers', name: 'Скребки' },
      { id: 'care.tweezers', name: 'Пинцеты' },
      { id: 'care.powders', name: 'Пудры' },
      { id: 'care.massagers', name: 'Массажеры' },
      { id: 'care.furminators', name: 'Фурминаторы' },
      { id: 'care.clippers', name: 'Машинки для стрижки' },
      { id: 'care.trimmers', name: 'Триммеры' },
      { id: 'care.detanglers', name: 'Колотунорезы' },
      { id: 'care.towels', name: 'Полотенца' },
      { id: 'care.paw_washers', name: 'Лапомойки' },
      { id: 'care.protective_collars', name: 'Защитные воротники' },
      { id: 'care.misc', name: 'Техничка и аксессуары' },
    ],
  },
  {
    id: 'housing',
    name: 'Дом и транспорт',
    icon: '🏠',
    children: [
      { id: 'housing.kennels', name: 'Будки' },
      { id: 'housing.enclosures', name: 'Вольеры' },
      { id: 'housing.houses', name: 'Домики' },
      { id: 'housing.cages', name: 'Клетки' },
      { id: 'housing.partitions', name: 'Перегородки' },
      { id: 'housing.bags', name: 'Сумки' },
      { id: 'housing.beds', name: 'Лежанки' },
      { id: 'housing.carriers', name: 'Переноски' },
      { id: 'housing.containers', name: 'Контейнеры' },
      { id: 'housing.doors', name: 'Дверцы' },
      { id: 'housing.grates', name: 'Решетки' },
      { id: 'housing.wheels_carriers', name: 'Колеса для переносок' },
      { id: 'housing.wheels_cages', name: 'Колеса для клеток' },
      { id: 'housing.trays', name: 'Поддоны' },
      { id: 'housing.carts', name: 'Тележки' },
      { id: 'housing.strollers', name: 'Коляски' },
      { id: 'housing.hammocks', name: 'Гамаки' },
      { id: 'housing.bedding', name: 'Подстилки' },
      { id: 'housing.mattresses', name: 'Матрасы' },
      { id: 'housing.blankets', name: 'Пледы' },
      { id: 'housing.pillows', name: 'Подушки' },
      { id: 'housing.mats', name: 'Коврики' },
      { id: 'housing.ramps', name: 'Пандусы' },
      { id: 'housing.stairs', name: 'Лестницы' },
      { id: 'housing.carrier_straps', name: 'Ремни для переносок' },
      { id: 'housing.safety_belts', name: 'Ремни безопасности' },
      { id: 'housing.accessories', name: 'Аксессуары для содержания' },
    ],
  },
  {
    id: 'behavior',
    name: 'Контроль поведения',
    icon: '🎯',
    children: [],
  },
  {
    id: 'misc',
    name: 'Прочее',
    icon: '📎',
    children: [
      { id: 'misc.documents', name: 'Документы и паспорта' },
    ],
  },
]

const normalizeCategoryKey = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, '')
}

const CATEGORY_ALIASES = {
  food: ['корм', 'питание'],
  health: ['ветаптек'],
  toilet: ['туалет', 'наполнител'],
  feeding: ['мис', 'поил'],
  toys: ['игрушк', 'когтеточ', 'тоннел', 'площадк'],
  walk: ['амуниц', 'ошейн', 'повод', 'шлейк', 'наморд', 'рулет'],
  clothing: ['одежд', 'комбинезон', 'куртк', 'свитер', 'ботин', 'футбол', 'толстов', 'плать'],
  care: ['уход', 'груминг', 'шампун', 'кондицион', 'лосьон', 'спрей', 'космет'],
  housing: ['транспорт', 'переноск', 'домик', 'лежанк', 'клетк', 'вольер', 'будк'],
  behavior: ['контрольповеден'],
  misc: ['документ', 'паспорт', 'прочее'],
}

const CATEGORY_CHILD_ALIASES = {
  'food.dry': ['сухой'],
  'food.wet': ['влажн'],
  'food.semi_moist': ['полувлажн'],
  'food.canned': ['консерв'],
  'food.pouches': ['пауч'],
  'food.pate': ['пашт'],
  'food.holistic': ['холистик'],
  'food.diet': ['диет'],
  'food.hypoallergenic': ['гипоаллер'],
  'food.treats': ['лакомств'],
  'food.supplements': ['витамин', 'добавк'],
  'food.lifestage.kitten': ['котен', 'котён', 'котенка', 'котёнка'],
  'food.lifestage.puppy': ['щен', 'щенка'],
  'health.parasite': ['паразит'],
  'toilet.litter': ['наполнител'],
  'toilet.litter_boxes': ['лоток'],
  'toilet.litter_boxes_auto': ['автоматическ'],
  'toilet.bio_toilets': ['биотуалет'],
  'toilet.waste_bags': ['пакет', 'выгул'],
  'toilet.pads': ['пеленк', 'пелёнк'],
  'toilet.diapers': ['подгузн'],
  'toilet.scoops': ['совоч'],
  'feeding.bowls': ['мис'],
  'feeding.drinkers': ['поил'],
  'feeding.bottles': ['бутылоч'],
  'toys.toys': ['игрушк'],
  'toys.scratching_posts': ['когтеточ'],
  'toys.playgrounds': ['площадк'],
  'toys.tunnels': ['тоннел'],
  'walk.collars': ['ошейн'],
  'walk.leashes': ['повод'],
  'walk.harnesses': ['шлейк'],
  'walk.belts': ['пояс'],
  'walk.tags': ['адресн'],
  'walk.carabiners': ['карабин'],
  'walk.clickers': ['кликер'],
  'walk.multiboxes': ['мультибокс'],
  'walk.muzzles': ['наморд'],
  'walk.lights': ['подсвет'],
  'walk.retractable': ['рулет'],
  'walk.bandanas': ['бандан'],
  'walk.popons': ['попон'],
  'walk.accessories': ['аксессуар', 'косынк'],
  'clothing.general': ['одежд'],
  'clothing.jumpsuits': ['комбинезон'],
  'clothing.raincoats': ['дождевик'],
  'clothing.vests': ['жилет'],
  'clothing.popons': ['попон'],
  'clothing.jackets': ['куртк'],
  'clothing.sweaters': ['свитер'],
  'clothing.hats': ['шапк'],
  'clothing.socks': ['носк'],
  'clothing.shoes': ['ботин'],
  'clothing.tshirts': ['футбол'],
  'clothing.tops': ['майк'],
  'clothing.suits': ['костюм'],
  'clothing.hoodies': ['толстов'],
  'clothing.dresses': ['плать'],
  'clothing.accessories': ['аксессуар'],
  'care.grooming': ['груминг'],
  'care.shampoos': ['шампун'],
  'care.conditioners': ['кондицион'],
  'care.sprays': ['спрей'],
  'care.lotions': ['лосьон'],
  'care.gels': ['гел'],
  'care.waxes': ['воск'],
  'care.perfumes': ['парфюм'],
  'care.oils': ['масл'],
  'care.masks': ['маск'],
  'care.serums': ['сыворот'],
  'care.creams': ['крем'],
  'care.foams': ['пен'],
  'care.mousses': ['мусс'],
  'care.tonics': ['тоник'],
  'care.balms': ['бальзам'],
  'care.deodorants': ['дезодорант'],
  'care.wipes': ['салфет'],
  'care.soap': ['мыло'],
  'care.liquids': ['жидкост'],
  'care.drops': ['капл'],
  'care.dental_pastes': ['зубн', 'паст'],
  'care.dental_brushes': ['щетк', 'зубн'],
  'care.claw_clippers': ['когтерез'],
  'care.claw_grinders': ['гриндер'],
  'care.claw_files': ['пилочк'],
  'care.brushes': ['щетк'],
  'care.combs': ['расческ'],
  'care.slickers': ['пуходерк'],
  'care.scissors': ['ножниц'],
  'care.rollers': ['ролик'],
  'care.scrapers': ['скреб'],
  'care.tweezers': ['пинцет'],
  'care.powders': ['пудр'],
  'care.massagers': ['массаж'],
  'care.furminators': ['фурмин'],
  'care.clippers': ['машинк'],
  'care.trimmers': ['триммер'],
  'care.detanglers': ['колотун'],
  'care.towels': ['полотен'],
  'care.paw_washers': ['лапомойк'],
  'care.protective_collars': ['воротник'],
  'care.misc': ['техничк'],
  'housing.kennels': ['будк'],
  'housing.enclosures': ['вольер'],
  'housing.houses': ['домик'],
  'housing.cages': ['клетк'],
  'housing.partitions': ['перегород'],
  'housing.bags': ['сумк'],
  'housing.beds': ['лежанк'],
  'housing.carriers': ['переноск'],
  'housing.containers': ['контейнер'],
  'housing.doors': ['дверц'],
  'housing.grates': ['решет'],
  'housing.wheels_carriers': ['колес'],
  'housing.wheels_cages': ['колес'],
  'housing.trays': ['поддон'],
  'housing.carts': ['тележк'],
  'housing.strollers': ['коляск'],
  'housing.hammocks': ['гамак'],
  'housing.bedding': ['подстил'],
  'housing.mattresses': ['матрас'],
  'housing.blankets': ['плед'],
  'housing.pillows': ['подушк'],
  'housing.mats': ['коврик'],
  'housing.ramps': ['пандус'],
  'housing.stairs': ['лестниц'],
  'housing.carrier_straps': ['ремн'],
  'housing.safety_belts': ['ремн'],
  'housing.accessories': ['аксессуар'],
  'misc.documents': ['документ', 'паспорт'],
}

const flattenCategories = (categories = []) => {
  const result = []
  categories.forEach(cat => {
    result.push(cat)
    if (Array.isArray(cat.children)) {
      cat.children.forEach(child => result.push(child))
    }
  })
  return result
}

const findBestMatch = (candidates, aliases) => {
  if (!candidates.length) return null
  const normalizedAliases = aliases.map(alias => normalizeCategoryKey(alias))
  const matches = candidates.filter(item => {
    const nameKey = normalizeCategoryKey(item.name)
    const slugKey = normalizeCategoryKey(item.slug)
    return normalizedAliases.some(alias =>
      nameKey.includes(alias) || slugKey.includes(alias)
    )
  })
  if (!matches.length) return null
  return matches.sort((a, b) => (b.product_count || 0) - (a.product_count || 0))[0]
}

// Get icon for category by name or slug
const getCategoryIcon = (category) => {
  if (category.icon) return category.icon
  
  const name = (category.name || category.slug || '').toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (name.includes(key)) return icon
  }
  return '📦'
}

// Brand class colors and labels
const BRAND_CLASS_CONFIG = {
  holistic: { label: 'Холистик', color: 'emerald', emoji: '🌿' },
  super_premium: { label: 'Супер-премиум', color: 'blue', emoji: '⭐' },
  premium: { label: 'Премиум', color: 'amber', emoji: '✨' },
  economy: { label: 'Эконом', color: 'gray', emoji: '💰' },
}

/**
 * Collapsible filter section
 */
const FilterSection = memo(function FilterSection({ 
  title, 
  icon,
  children, 
  defaultOpen = true,
  badge = null,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border-b border-primary-100/70 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-gray-50/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-medium text-primary-700">{title}</span>
          {badge !== null && badge > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[500px] opacity-100 pb-3' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
})

/**
 * Animal Type Filter - Checkbox list
 */
const AnimalTypeFilter = memo(function AnimalTypeFilter({ value, onChange }) {
  const options = [
    { value: 'dog', label: 'Собаки', icon: '🐕' },
    { value: 'cat', label: 'Кошки', icon: '🐈' },
  ]
  
  return (
    <div className="space-y-1">
      {options.map(opt => {
        const isChecked = value === opt.value
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
              isChecked ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onChange(isChecked ? '' : opt.value)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-base">{opt.icon}</span>
            <span className={`text-sm ${isChecked ? 'text-primary-800 font-medium' : 'text-gray-700'}`}>
              {opt.label}
            </span>
          </label>
        )
      })}
    </div>
  )
})

/**
 * Age Group Filter - Recommendations + age input
 */
const AgeGroupFilter = memo(function AgeGroupFilter({ 
  onChange, 
  animal = '',
}) {
  const [years, setYears] = useState('')
  const [months, setMonths] = useState('')
  
  const handleAgeInput = (nextYears, nextMonths) => {
    const y = Number(nextYears || 0)
    const m = Number(nextMonths || 0)
    const totalMonths = y * 12 + m
    if (!totalMonths) {
      onChange('')
      return
    }
    if (!animal && totalMonths < 12) {
      onChange('puppy,kitten')
      return
    }
    if (animal === 'cat') {
      if (totalMonths < 12) onChange('kitten')
      else if (totalMonths < 96) onChange('adult')
      else onChange('senior')
      return
    }
    if (animal === 'dog') {
      if (totalMonths < 12) onChange('puppy')
      else if (totalMonths < 84) onChange('adult')
      else onChange('senior')
      return
    }
    if (totalMonths < 84) onChange('adult')
    else onChange('senior')
  }
  
  useEffect(() => {
    handleAgeInput(years, months)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years, months, animal])
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <input
          type="number"
          min="0"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          placeholder="лет"
          className="w-16 px-2 py-1.5 text-xs border border-primary-100 rounded-lg focus:ring-primary-500 focus:border-primary-500"
        />
        <span className="text-xs text-gray-400">и</span>
        <input
          type="number"
          min="0"
          max="11"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          placeholder="мес"
          className="w-16 px-2 py-1.5 text-xs border border-primary-100 rounded-lg focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          type="button"
          onClick={() => { setYears(''); setMonths(''); onChange('') }}
          className="ml-auto text-xs text-gray-500 hover:text-gray-700"
        >
          Очистить
        </button>
      </div>
      {!animal && (
        <p className="text-xs text-gray-400">
          До 1 года без выбора животного применяются щенки и котята.
        </p>
      )}
    </div>
  )
})

/**
 * Brand Class Filter - Colored badges
 */
const BrandClassFilter = memo(function BrandClassFilter({ value, onChange }) {
  const options = Object.entries(BRAND_CLASS_CONFIG).map(([key, config]) => ({
    value: key,
    ...config,
  }))
  
  const getColorClasses = (colorName, isSelected) => {
    const colors = {
      emerald: isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      blue: isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      amber: isSelected ? 'bg-secondary-500 text-white' : 'bg-secondary-50 text-secondary-700 hover:bg-secondary-100',
      gray: isSelected ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    }
    return colors[colorName] || colors.gray
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
            getColorClasses(opt.color, value === opt.value)
          }`}
        >
          <span>{opt.emoji}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
})

/**
 * Special Diet Toggles
 */
const SpecialDietFilters = memo(function SpecialDietFilters({ 
  filters, 
  onChange,
  counts = {},
}) {
  const options = [
    { key: 'is_grain_free', label: 'Беззерновой', icon: '🌾', count: counts.grain_free },
    { key: 'is_hypoallergenic', label: 'Гипоаллергенный', icon: '🛡️', count: counts.hypoallergenic },
    { key: 'is_veterinary', label: 'Ветеринарный', icon: '⚕️', count: counts.veterinary },
  ]
  
  return (
    <div className="space-y-2">
      {options.map(opt => {
        const isActive = filters[opt.key] === 'true'
        return (
          <label
            key={opt.key}
            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
              isActive ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{opt.icon}</span>
              <span className={`text-sm ${isActive ? 'text-primary-800 font-medium' : 'text-gray-700'}`}>
                {opt.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {opt.count > 0 && (
                <span className="text-xs text-gray-400">{opt.count}</span>
              )}
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => onChange(opt.key, e.target.checked ? 'true' : '')}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-primary-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )
})

/**
 * Brand Filter - Searchable dropdown
 */
const BrandFilter = memo(function BrandFilter({ brands = [], value, onChange, largeButtons = false }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  const filteredBrands = useMemo(() => {
    if (!search) return brands.slice(0, 20)
    const searchLower = search.toLowerCase()
    return brands.filter(b => b.name.toLowerCase().includes(searchLower)).slice(0, 20)
  }, [brands, search])
  
  const selectedBrand = brands.find(b => String(b.id) === String(value))
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white border border-primary-100 hover:border-gray-300 transition-colors text-gray-800 ${largeButtons ? 'px-4 py-4 rounded-xl text-sm' : 'px-3 py-3 rounded-xl text-sm'}`}
      >
        <span className={selectedBrand ? 'text-gray-900' : 'text-gray-500'}>
          {selectedBrand ? selectedBrand.name : 'Все бренды'}
        </span>
        <svg className={`${largeButtons ? 'w-5 h-5' : 'w-4 h-4'} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-primary-100 rounded-xl shadow-lg">
          <div className="p-2 border-b border-primary-100/70">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск бренда..."
              className="w-full px-3 py-2 text-sm border border-primary-100 rounded-lg focus:ring-gray-400 focus:border-gray-400"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!value ? 'bg-accent-100 text-gray-900' : 'text-gray-700'}`}
            >
              Все бренды
            </button>
            {filteredBrands.map(brand => (
              <button
                key={brand.id}
                onClick={() => { onChange(String(brand.id)); setIsOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  String(value) === String(brand.id) ? 'bg-accent-100 text-gray-900' : 'text-gray-700'
                }`}
              >
                <span>{brand.name}</span>
                <span className="text-xs text-gray-500">{brand.product_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

/**
 * Price Range Filter
 */
const PriceRangeFilter = memo(function PriceRangeFilter({ 
  minPrice, 
  maxPrice, 
  range = { min: 0, max: 100000 },
  onApply,
  largeButtons = false,
}) {
  const [localMin, setLocalMin] = useState(minPrice || '')
  const [localMax, setLocalMax] = useState(maxPrice || '')
  
  useEffect(() => {
    setLocalMin(minPrice || '')
    setLocalMax(maxPrice || '')
  }, [minPrice, maxPrice])
  
  const handleApply = () => {
    onApply(localMin, localMax)
  }
  
  return (
    <div className={largeButtons ? 'space-y-3' : 'space-y-2'}>
      <div className={`flex items-center ${largeButtons ? 'gap-2' : 'gap-1.5'}`}>
        <div className="flex-1">
          <input
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            placeholder={`от ${Math.floor(range.min)}`}
            className={`w-full border border-primary-100 rounded-lg focus:ring-gray-400 focus:border-gray-400 bg-white ${largeButtons ? 'px-3 py-2.5 text-sm rounded-xl' : 'px-2 py-1.5 text-xs'}`}
          />
        </div>
        <span className={`text-gray-400 ${largeButtons ? 'text-sm' : 'text-xs'}`}>—</span>
        <div className="flex-1">
          <input
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            placeholder={`до ${Math.ceil(range.max)}`}
            className={`w-full border border-primary-100 rounded-lg focus:ring-gray-400 focus:border-gray-400 bg-white ${largeButtons ? 'px-3 py-2.5 text-sm rounded-xl' : 'px-2 py-1.5 text-xs'}`}
          />
        </div>
      </div>
      <button
        onClick={handleApply}
        className={`w-full font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors ${largeButtons ? 'py-4 text-sm rounded-xl' : 'py-2.5 text-sm rounded-xl'}`}
      >
        Применить
      </button>
    </div>
  )
})

/** Кнопка фильтра в том же стиле, что и кнопки категорий в хедере магазина: градиент оранжевый → бледно-оранжевый, плавное переливание через CSS */
const GlassFilterButton = memo(function GlassFilterButton({ isActive, onClick, children, largeButtons }) {
  const baseClass = largeButtons
    ? 'shop-filter-glass-btn flex-1 min-w-0 rounded-full py-3 px-4 text-sm font-medium'
    : 'shop-filter-glass-btn flex-1 min-w-0 rounded-full py-2.5 px-3 text-sm font-medium'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClass} ${isActive ? 'shop-filter-glass-btn-active' : ''}`}
    >
      <span className="relative z-[1]">{children}</span>
    </button>
  )
})

/**
 * Main ShopFilters Component
 */
const ShopFilters = memo(function ShopFilters({
  filters,
  availableFilters,
  onChange,
  onPriceApply,
  onReset,
  isLoading = false,
  className = '',
  productCount = 0,
  largeButtons = false,
  /** Скрыть верхнюю строку «Фильтры»+сброс (когда шапка даёт bottom sheet) */
  hideShellHeader = false,
  /** После «Показать N товаров» (например закрыть шторку) */
  onShowResults,
}) {
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.animal) count++
    if (filters.pet_id) count++
    if (filters.category_code || filters.category_slug) count++
    if (filters.age_group) count++
    if (filters.brand_class) count++
    if (filters.brand_id) count++
    if (filters.is_grain_free === 'true') count++
    if (filters.is_hypoallergenic === 'true') count++
    if (filters.is_veterinary === 'true') count++
    if (filters.min_price || filters.max_price) count++
    if (filters.in_stock === 'true') count++
    if (filters.has_discount === 'true') count++
    return count
  }, [filters])

  const handlePriceApply = (min, max) => {
    if (onPriceApply) {
      onPriceApply(min, max)
      return
    }
    onChange('min_price', min)
    onChange('max_price', max)
  }

  const tagBase = largeButtons
    ? 'px-4 py-4 rounded-xl text-sm font-medium transition-colors border '
    : 'px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border '
  const tagInactive = 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 '
  const tagActive = 'border-transparent bg-accent-400 text-gray-900 '

  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef(null)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) setSortDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const SORT_OPTIONS = [
    { value: '', label: 'По умолчанию' },
    { value: 'discount', label: 'Со скидкой 🔥' },
    { value: 'price_asc', label: 'Цена: по возрастанию' },
    { value: 'price_desc', label: 'Цена: по убыванию' },
    { value: 'rating', label: 'По рейтингу' },
    { value: 'popularity', label: 'По популярности' },
  ]
  const currentSortLabel = SORT_OPTIONS.find(o => (o.value || '') === (filters.sort_by || ''))?.label || 'По умолчанию'
  const sortBtnClass = `w-full flex items-center justify-between bg-white border border-primary-100 hover:border-gray-300 transition-colors rounded-xl text-sm ${largeButtons ? 'px-4 py-4' : 'px-3 py-3'}`
  const sortPanelClass = 'absolute z-20 mt-1 w-full bg-white border border-primary-100 rounded-xl shadow-lg max-h-48 overflow-y-auto'
  
  return (
    <div className={`rounded-3xl border border-primary-100 bg-white shadow-card overflow-hidden flex flex-col h-full min-h-0 ${className} ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Заголовок: Фильтры + иконка сброса */}
      {!hideShellHeader && (
        <div className={`flex items-center justify-between border-b border-primary-100 bg-white flex-shrink-0 ${largeButtons ? 'p-4' : 'p-2.5'}`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={activeFilterCount === 0}
              className={`rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${largeButtons ? 'p-2' : 'p-1'}`}
              title="Сбросить фильтры"
              aria-label="Сбросить фильтры"
            >
              <svg className={largeButtons ? 'w-5 h-5' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <h3 className={`font-heading font-semibold text-primary-800 ${largeButtons ? 'text-lg' : 'text-sm'}`}>Фильтры</h3>
            {activeFilterCount > 0 && (
              <span className={`font-medium bg-primary-600 text-white rounded-full ${largeButtons ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'}`}>
                {activeFilterCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Секции фильтров — растягиваются на всё свободное место, при переполнении прокрутка */}
      <div className={`shop-filter-sidebar flex-1 min-h-0 overflow-y-auto flex flex-col ${largeButtons ? 'p-4 space-y-4 min-h-full' : 'p-2.5 space-y-2'}`}>
        {/* Окно питомцев — заголовок с иконкой, горизонтальная полоса карточек, кнопка «Добавить питомца» */}
        <div className={`border-b border-primary-100 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-heading font-semibold text-primary-800 flex items-center gap-2 ${largeButtons ? 'text-base mb-3' : 'text-xs mb-1.5'}`}>
              <span className="text-primary-600" aria-hidden>🐾</span>
              Мои питомцы
            </h3>
          </div>
          {availableFilters.user_pets && availableFilters.user_pets.length > 0 ? (
            <>
              <div className="flex overflow-x-auto gap-2 pb-2 -mx-0.5" style={{ scrollbarWidth: 'thin' }}>
                {availableFilters.user_pets.map(pet => {
                  const hasProducts = ['dog', 'cat'].includes(pet.species)
                  if (!hasProducts) return null
                  const isSelected = String(filters.pet_id) === String(pet.id)
                  const photoUrl = pet.photo || null
                  const placeholderEmoji = pet.species === 'cat' ? '🐈' : pet.species === 'dog' ? '🐕' : '🐾'
                  const cardBg = pet.species === 'dog' ? 'bg-blue-50' : 'bg-amber-50/80'
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => onChange('pet_id', isSelected ? '' : pet.id)}
                      className={`flex-shrink-0 w-[100px] ${largeButtons ? 'w-[110px]' : ''} rounded-xl border-2 overflow-hidden transition-all duration-200 flex flex-col ${
                        isSelected
                          ? 'border-accent-400 bg-accent-400/20 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`aspect-square flex items-center justify-center overflow-hidden ${!isSelected ? cardBg : ''}`}>
                        {photoUrl ? (
                          <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl" aria-hidden>{placeholderEmoji}</span>
                        )}
                      </div>
                      <div className="p-2 text-center bg-white border-t border-gray-100">
                        <span className={`block font-medium truncate text-gray-800 ${largeButtons ? 'text-sm' : 'text-xs'}`}>{pet.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <p className={`text-gray-500 ${largeButtons ? 'text-sm' : 'text-xs'} mb-2`}>
                Добавьте питомца в профиле — подборка товаров будет персональной
              </p>
              <Link
                to="/profile"
                className={`inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-medium ${largeButtons ? 'text-sm' : 'text-xs'}`}
              >
                Перейти в профиль
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          )}
        </div>

        <div className={`border-b border-primary-100 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <div className={`font-medium text-primary-700 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1'}`}>Тип питомца</div>
          <div className="flex gap-2">
            <GlassFilterButton
              isActive={!filters.animal}
              onClick={() => onChange('animal', '')}
              largeButtons={largeButtons}
            >
              Все
            </GlassFilterButton>
            <GlassFilterButton
              isActive={filters.animal === 'cat'}
              onClick={() => onChange('animal', filters.animal === 'cat' ? '' : 'cat')}
              largeButtons={largeButtons}
            >
              Кошка
            </GlassFilterButton>
            <GlassFilterButton
              isActive={filters.animal === 'dog'}
              onClick={() => onChange('animal', filters.animal === 'dog' ? '' : 'dog')}
              largeButtons={largeButtons}
            >
              Собака
            </GlassFilterButton>
          </div>
        </div>

        <div className={`border-b border-primary-100 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <div className={`font-medium text-primary-700 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1'}`}>Возраст питомца</div>
          <div className="flex gap-2">
            {[
              { value: 'adult', label: 'Взрослый' },
              { value: 'kitten', label: 'Котенок' },
              { value: 'puppy', label: 'Щенок' },
            ].map(({ value, label }) => (
              <GlassFilterButton
                key={value}
                isActive={filters.age_group === value}
                onClick={() => onChange('age_group', filters.age_group === value ? '' : value)}
                largeButtons={largeButtons}
              >
                {label}
              </GlassFilterButton>
            ))}
          </div>
        </div>

        <div className={`border-b border-primary-100 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <div className={`font-medium text-primary-700 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1'}`}>Бренд</div>
          <BrandFilter
            brands={availableFilters.brands || []}
            value={filters.brand_id || ''}
            onChange={(val) => onChange('brand_id', val)}
            largeButtons={largeButtons}
          />
        </div>

        <div className={`border-b border-primary-100 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <div className={`font-medium text-primary-700 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1'}`}>Цена</div>
          <PriceRangeFilter
            minPrice={filters.min_price}
            maxPrice={filters.max_price}
            range={availableFilters.price_range}
            onApply={handlePriceApply}
            largeButtons={largeButtons}
          />
        </div>

        <div ref={sortDropdownRef} className={`border-b border-primary-100 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <label className={`block font-medium text-gray-900 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1.5'}`}>
            Сортировка
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className={sortBtnClass}
            >
              <span className={filters.sort_by ? 'text-gray-900' : 'text-gray-500'}>
                {currentSortLabel}
              </span>
              <svg className={`${largeButtons ? 'w-5 h-5' : 'w-4 h-4'} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sortDropdownOpen && (
              <div className={sortPanelClass}>
                {SORT_OPTIONS.map(opt => {
                  const isSelected = (filters.sort_by || '') === (opt.value || '')
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onChange('sort_by', opt.value); setSortDropdownOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${isSelected ? 'bg-primary-50 text-gray-900 font-medium' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {((filters.category_code || '').startsWith('food') || filters.category_code === 'food') && (
          <div className={`border-b border-primary-100 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
            <div className={`font-medium text-primary-700 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1'}`}>Особенности</div>
            <SpecialDietFilters
              filters={filters}
              onChange={onChange}
              counts={availableFilters.boolean_filters || {}}
            />
          </div>
        )}
      </div>

      {/* Кнопки по референсу: Показать N товаров + Сбросить */}
      <div className={`pt-0 flex flex-col border-t border-gray-200 bg-gray-50 flex-shrink-0 ${largeButtons ? 'p-4 gap-3' : 'p-2.5 gap-1.5'}`}>
        <button
          type="button"
          onClick={() => onShowResults?.()}
          className={`w-full rounded-xl bg-primary-700 hover:bg-primary-800 text-white font-medium flex items-center justify-center transition-colors ${largeButtons ? 'py-5 px-4 text-base' : 'py-3.5 px-4 text-sm'}`}
          aria-label={`Показать ${formatProductCount(productCount)}`}
        >
          Показать {formatProductCount(productCount)}
        </button>
        <button
          type="button"
          onClick={onReset}
          className={`w-full rounded-xl border-2 border-gray-300 text-gray-800 font-medium hover:bg-gray-100 transition-colors ${largeButtons ? 'py-5 text-base' : 'py-3 text-sm'}`}
        >
          Сбросить
        </button>
      </div>
    </div>
  )
})

export default ShopFilters
