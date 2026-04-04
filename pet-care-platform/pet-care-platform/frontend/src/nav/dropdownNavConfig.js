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
    { label: 'Подбор корма', to: '/food-recommendation', description: 'рекомендации по корму', icon: UtensilsCrossed },
    { label: 'Подбор питомца для вас', to: '/coming-soon?name=Подбор+питомца+для+вас', description: 'поможем выбрать питомца', icon: PawPrint },
    { label: 'Подбор курсов', to: '/coming-soon?name=Подбор+курсов', description: 'курсы и обучение', icon: GraduationCap },
    { label: 'Список продуктов', to: '/coming-soon?name=Список+продуктов', description: 'каталог товаров', icon: List },
  ],
}

export const navHealth = {
  id: 'health',
  label: 'Здоровье',
  sectionTitle: 'КОНТРОЛЬ',
  items: [
    { label: 'Дневник здоровья', to: '/health-diary', description: 'симптомы, самочувствие', icon: Stethoscope },
    { label: 'Медкарта', to: '/coming-soon?name=Медкарта', description: 'паспорта и здоровье питомцев', icon: FileHeart },
    { label: 'Активность', to: '/coming-soon?name=Активность', description: 'уровень активности', icon: Activity },
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
