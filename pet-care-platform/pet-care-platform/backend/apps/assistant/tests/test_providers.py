"""Юнит-тесты провайдеров и фабрики (без БД и без сети)."""

from django.test import SimpleTestCase, override_settings

from apps.assistant.providers import get_provider
from apps.assistant.providers.stub import StubProvider
from apps.assistant.services.prompts import CONTEXT_HEADER, build_system


class ProviderFactoryTests(SimpleTestCase):
    @override_settings(ASSISTANT_LLM_BACKEND='stub')
    def test_default_backend_is_stub(self):
        self.assertIsInstance(get_provider(), StubProvider)

    @override_settings(ASSISTANT_LLM_BACKEND='does-not-exist')
    def test_unknown_backend_falls_back_to_stub(self):
        self.assertIsInstance(get_provider(), StubProvider)


class StubProviderTests(SimpleTestCase):
    def test_stub_reflects_injected_context(self):
        system = build_system('Способность: тест.', 'Кличка: Барсик\nВид: кошка')
        result = StubProvider().generate(
            system=system,
            messages=[{'role': 'user', 'content': 'Чем кормить?'}],
        )
        self.assertIn('Барсик', result.text)
        self.assertIn('Чем кормить?', result.text)
        self.assertEqual(result.finish_reason, 'stop')

    def test_context_header_present_in_system(self):
        system = build_system('инструкция', 'факт-1')
        self.assertIn(CONTEXT_HEADER, system)
