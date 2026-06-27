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
} from 'lucide-react'

export const navShop = {
  id: 'shop',
  label: 'Магазин',
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
  sectionTitle: 'СЕРВИСЫ',
  items: [
    { label: 'Подбор питания', to: '/food-recommendation', description: 'рекомендации по питанию', icon: UtensilsCrossed },
  ],
}

export const navHealth = {
  id: 'health',
  label: 'Здоровье',
  sectionTitle: 'КОНТРОЛЬ',
  items: [
    { label: 'Дневник здоровья', to: '/health-diary', description: 'симптомы, самочувствие', icon: Stethoscope },
  ],
}

export const staticDropdownNavItems = [navShop, navNutrition, navHealth]

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
  return { id: 'pets', label: 'Питомцы', sectionTitle: 'ПИТОМЦЫ', items }
}
