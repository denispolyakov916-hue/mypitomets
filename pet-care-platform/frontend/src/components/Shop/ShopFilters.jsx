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

import React, { useState, useEffect, useMemo, memo } from 'react'

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
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-gray-50/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-medium text-gray-800">{title}</span>
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
 * Category Accordion Filter (fixed 10 categories + children)
 */
const CategoryTreeFilter = memo(function CategoryTreeFilter({ 
  categories, 
  value, 
  onChange,
}) {
  const categoryTree = useMemo(() => {
    if (!categories || categories.length === 0) return []
    return categories.map(parent => ({
      ...parent,
      children: (parent.children || []).filter(child => (child.product_count || 0) > 0 || child.slug === value)
    }))
  }, [categories, value])
  
  const [expanded, setExpanded] = useState(null)
  
  const toggle = (id) => {
    setExpanded(prev => (prev === id ? null : id))
  }
  
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {categoryTree.map(parent => {
        const availableChildren = (parent.children || []).filter(
          child => (child.product_count || 0) > 0 || child.code === value || child.slug === value
        )
        let childrenToShow = availableChildren
        if (childrenToShow.length === 0 && parent.slug && (parent.product_count > 0 || parent.slug === value)) {
          childrenToShow = [{
            id: `${parent.id}-all`,
            name: 'Все',
            slug: parent.slug,
            code: parent.code,
            product_count: parent.product_count || 0,
          }]
        }
        if (childrenToShow.length === 0) return null
        const isOpen = expanded === parent.id
        return (
          <div key={parent.id} className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(parent.id)}
              className="w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <span className="text-lg">{parent.icon || getCategoryIcon(parent)}</span>
                <span className="text-sm">{parent.name}</span>
                {parent.product_count > 0 && (
                  <span className="text-xs text-gray-400">{parent.product_count}</span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`px-2.5 pb-2 ${isOpen ? 'block' : 'hidden'}`}>
              <div className="space-y-1.5">
                {childrenToShow.map(child => {
                  const itemValue = child.code || child.slug
                  const isSelected = value === itemValue
                  const isDisabled = !itemValue
                  return (
                    <label
                      key={child.id}
                      className={`flex items-center gap-2 text-sm ${
                        isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isDisabled}
                        checked={isSelected}
                        onChange={() => onChange(isSelected ? '' : itemValue)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className={isSelected ? 'font-medium text-primary-800' : ''}>
                        {child.name}
                      </span>
                      {child.product_count > 0 && (
                        <span className="ml-auto text-xs text-gray-400">
                          {child.product_count}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
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
          className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
        />
        <span className="text-xs text-gray-400">и</span>
        <input
          type="number"
          min="0"
          max="11"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          placeholder="мес"
          className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
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
      amber: isSelected ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
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
const BrandFilter = memo(function BrandFilter({ brands = [], value, onChange }) {
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
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-primary-300 transition-colors"
      >
        <span className={selectedBrand ? 'text-gray-900' : 'text-gray-500'}>
          {selectedBrand ? selectedBrand.name : 'Все бренды'}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск бренда..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!value ? 'bg-primary-50 text-primary-700' : ''}`}
            >
              Все бренды
            </button>
            {filteredBrands.map(brand => (
              <button
                key={brand.id}
                onClick={() => { onChange(String(brand.id)); setIsOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  String(value) === String(brand.id) ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span>{brand.name}</span>
                <span className="text-xs text-gray-400">{brand.product_count}</span>
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
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            placeholder={`от ${Math.floor(range.min)}`}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <span className="text-gray-400">—</span>
        <div className="flex-1">
          <input
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            placeholder={`до ${Math.ceil(range.max)}`}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>
      <button
        onClick={handleApply}
        className="w-full py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
      >
        Применить
      </button>
    </div>
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
}) {
  // Count active filters
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
  
  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${className} ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 019 17V12.414L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Фильтры</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={onReset}
          disabled={activeFilterCount === 0}
          className={`text-sm font-medium transition-colors ${
            activeFilterCount > 0
              ? 'text-primary-600 hover:text-primary-700'
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          Сбросить
        </button>
      </div>
      
      {/* Filter sections */}
      <div className="p-4 space-y-1 max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-thin">
        {availableFilters.user_pets && availableFilters.user_pets.length > 0 && (
          <div className="border-b border-gray-100 pb-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Мои питомцы</div>
            <div className="space-y-2">
              {availableFilters.user_pets.map(pet => {
                const hasProducts = ['dog', 'cat'].includes(pet.species)
                if (!hasProducts) return null
                const isSelected = String(filters.pet_id) === String(pet.id)
                return (
                  <label
                    key={pet.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-primary-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pet_id"
                      value={pet.id}
                      checked={isSelected}
                      onChange={(e) => onChange('pet_id', e.target.value)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className={`text-sm ${isSelected ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
                      {pet.name} <span className="text-primary-400">{pet.species_label}</span>
                    </span>
                  </label>
                )
              })}
              {filters.pet_id && (
                <button
                  onClick={() => onChange('pet_id', '')}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Показать все товары
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border-b border-gray-100 pb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Для кого</div>
          <AnimalTypeFilter 
            value={filters.animal || ''} 
            onChange={(val) => onChange('animal', val)} 
          />
        </div>

        <div className="border-b border-gray-100 pb-4">
          <CategoryTreeFilter
            categories={availableFilters.hierarchical_categories || []}
            value={filters.category_code || filters.category_slug || ''}
            onChange={(val) => onChange('category_code', val)}
          />
        </div>
        
        {/* Additional */}
        <div className="border-b border-gray-100 pb-4">
          <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
            <span>⚙️</span>
            Дополнительно
          </div>
          <div className="space-y-4">
            {!filters.pet_id && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Возраст</div>
                <AgeGroupFilter
                  onChange={(val) => onChange('age_group', val)}
                  animal={filters.animal || ''}
                />
              </div>
            )}
            {((filters.category_code || '').startsWith('food')) && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Особенности</div>
                <SpecialDietFilters
                  filters={filters}
                  onChange={onChange}
                  counts={availableFilters.boolean_filters || {}}
                />
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Бренд</div>
              <BrandFilter
                brands={availableFilters.brands || []}
                value={filters.brand_id || ''}
                onChange={(val) => onChange('brand_id', val)}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Цена</div>
              <PriceRangeFilter
                minPrice={filters.min_price}
                maxPrice={filters.max_price}
                range={availableFilters.price_range}
                onApply={handlePriceApply}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ShopFilters
