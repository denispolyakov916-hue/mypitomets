"""Юнит-тесты способности «Поддержка» и оркестратора на Stub (без БД)."""

from django.test import SimpleTestCase, override_settings

from apps.assistant.services import support_service
from apps.assistant.services.assistant_service import AssistantService


class SupportGroundingTests(SimpleTestCase):
    def test_support_selects_relevant_faq(self):
        grounding = support_service.build('Как оплатить заказ?')
        self.assertEqual(grounding['capability'], 'support')
        self.assertTrue(grounding['sources'])
        # среди источников должна быть запись про оплату
        labels = ' '.join(s['label'].lower() for s in grounding['sources'])
        self.assertIn('оплат', labels)

    def test_support_has_no_disclaimer(self):
        grounding = support_service.build('что ты умеешь?')
        self.assertIsNone(grounding['disclaimer'])


@override_settings(ASSISTANT_LLM_BACKEND='stub')
class AssistantSupportFlowTests(SimpleTestCase):
    def test_support_flow_end_to_end_on_stub(self):
        reply = AssistantService.answer(user=None, message='Как оплатить заказ?')
        self.assertEqual(reply.capability, 'support')
        self.assertEqual(reply.provider, 'stub')
        self.assertFalse(reply.needs_pet)
        self.assertTrue(reply.reply)

    def test_health_without_pet_asks_to_select_pet(self):
        reply = AssistantService.answer(
            user=None, message='питомец чихает', pet_id=None, capability='health',
        )
        self.assertEqual(reply.capability, 'health')
        self.assertTrue(reply.needs_pet)
