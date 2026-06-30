/**
 * Общие блоки навигации с выпадающими списками (десктоп Navbar + мобильная нижняя панель).
 */

import {
  ShoppingBag,
  GraduationCap,
  Package,
  UtensilsCrossed,
  List,
  Stethoscope,
  FileHeart,
  Activity,
  PawPrint,
  CalendarDays,
} from 'lucide-react'

export const navShop = {
  id: 'shop',
  label: 'Магазин',
  icon: ShoppingBag,
  sectionTitle: 'ПОКУПКИ',
  items: [
    { label: 'Магазин питания и аксессуаров', to: '/shop', description: 'товары для питомцев', icon: ShoppingBag },
    { label: 'Магазин курсов коррекции поведения', to: '/courses', description: 'курсы и обучение', icon: GraduationCap },
    { label: 'Заказы', to: '/orders', description: 'история заказов', icon: Package },
  ],
}

export const navNutrition = {
  id: 'nutrition',
  label: 'Сервисы',
  icon: UtensilsCrossed,
  sectionTitle: 'СЕРВИСЫ',
  items: [
    { label: 'Подбор питания', to: '/food-recommendation', description: 'рекомендации по питанию', icon: UtensilsCrossed },
  ],
}

export const navHealth = {
  id: 'health',
  label: 'Здоровье',
  icon: Stethoscope,
  sectionTitle: 'КОНТРОЛЬ',
  items: [
    { label: 'Дневник здоровья', to: '/health-diary', description: 'симптомы, самочувствие', icon: Stethoscope },
  ],
}

export const navContent = {
  id: 'content',
  label: 'Сообщество',
  icon: CalendarDays,
  sectionTitle: 'СООБЩЕСТВО',
  items: [
    { label: 'Новости и мероприятия', to: '/news-events', description: 'сходки, выставки, вебинары', icon: CalendarDays },
  ],
}

export const staticDropdownNavItems = [navShop, navContent, navNutrition, navHealth]

/** Дропдаун «Питомцы»: «Мои питомцы» + список питомцев */
export function buildNavPetsDropdown(pets) {
  const items = [
    { label: 'Мои питомцы', to: '/pet-id', description: 'все питомцы', icon: PawPrint },
    ...(pets || []).map((p) => ({
      label: p.name,
      to: `/pet-id/${p.id}`,
      description: p.species === 'dog' ? 'Собака' : p.species === 'cat' ? 'Кошка' : 'Питомец',
      icon: PawPrint,
    })),
  ]
  return { id: 'pets', label: 'Питомцы', icon: PawPrint, sectionTitle: 'ПИТОМЦЫ', items }
}
