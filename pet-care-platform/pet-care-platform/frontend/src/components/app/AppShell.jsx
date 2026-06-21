/**
 * AppShell — брендовый каркас контента продуктовых страниц.
 * Молочный фон + вертикальный ритм. Хедер/футер/мобильная навигация берутся из
 * существующего брендового Layout (не дублируем, чтобы не ломать рабочую навигацию).
 */
export default function AppShell({ children, className = '' }) {
  return (
    <div className={`bg-milk min-h-[calc(100vh-4rem)] ${className}`}>
      {children}
    </div>
  )
}
