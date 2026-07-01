import LegalHtmlPage from './LegalHtmlPage'
import html from './content/offer.html?raw'

export default function Offer() {
  return (
    <LegalHtmlPage
      title="Публичная оферта"
      kicker="Оформление заказов"
      ghost="₽"
      updatedAt="25 мая 2026"
      html={html}
      related={[
        { to: '/terms', label: 'Пользовательское соглашение' },
        { to: '/sellers', label: 'Продавцы и партнёры' },
        { to: '/privacy', label: 'Политика конфиденциальности' },
        { to: '/consent', label: 'Согласие на обработку ПДн' },
      ]}
    />
  )
}
