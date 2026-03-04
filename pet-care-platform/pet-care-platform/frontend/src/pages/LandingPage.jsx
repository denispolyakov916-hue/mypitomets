/**
 * Главная страница — лендинг из pitometsplus-site.
 * Рендерит статический HTML лендинг в iframe; ссылки в лендинге ведут в приложение (target="_parent").
 * Отображается внутри общего Layout с единым хедером и вкладками по всему проекту.
 */

function LandingPage() {
  return (
    <div className="w-full min-h-[calc(100vh-72px)] md:min-h-[calc(100vh-100px)]">
      <iframe
        src="/landing/index.html?noheader=1"
        title="ПИТОМЕЦПЛЮС — Всё для счастливой жизни вашего питомца"
        className="block w-full border-0 min-h-[calc(100vh-72px)] md:min-h-[calc(100vh-100px)]"
      />
    </div>
  )
}

export default LandingPage
