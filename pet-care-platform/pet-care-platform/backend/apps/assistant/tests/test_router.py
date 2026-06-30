"""Юнит-тесты роутера тем (без БД)."""

from django.test import SimpleTestCase

from apps.assistant.services.router_service import RouterService


class RouterServiceTests(SimpleTestCase):
    def test_food_questions_route_to_food(self):
        for msg in ['Какой корм выбрать?', 'Сколько грамм давать?', 'посоветуй рацион']:
            self.assertEqual(RouterService.classify(msg), 'food', msg)

    def test_health_questions_route_to_health(self):
        for msg in ['у питомца рвота', 'когда делать прививку?', 'кажется, аллергия']:
            self.assertEqual(RouterService.classify(msg), 'health', msg)

    def test_food_wins_over_health_for_food_weight(self):
        # «вес корма» — про питание, не про здоровье
        self.assertEqual(RouterService.classify('какой вес упаковки корма?'), 'food')

    def test_default_is_support(self):
        for msg in ['Как оплатить заказ?', 'Где мой заказ?', 'привет']:
            self.assertEqual(RouterService.classify(msg), 'support', msg)

    def test_vet_substring_does_not_trigger_health(self):
        # «вет» не должен ловиться в «привет/ответ/совет» (регрессия словарной подстроки)
        for msg in ['Привет!', 'Жду ответ', 'Дай совет по сервису', 'цветок']:
            self.assertEqual(RouterService.classify(msg), 'support', msg)

    def test_real_vet_words_route_to_health(self):
        for msg in ['Какой ветеринар поблизости?', 'нужна ветклиника']:
            self.assertEqual(RouterService.classify(msg), 'health', msg)

    def test_meta_questions_route_to_support(self):
        # мета-вопросы про ассистента/сервис — support, несмотря на «ветеринар»/«корм»
        for msg in ['Заменяешь ли ты ветеринара?', 'Ты бот или человек?', 'Что ты умеешь?']:
            self.assertEqual(RouterService.classify(msg), 'support', msg)
