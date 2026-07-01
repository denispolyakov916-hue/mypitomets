"""
Тесты фичи «Заявка на партнёрский доступ».

Покрывают контракт /api/partner-access/requests/:
- создание supplier-заявки → 201, status=pending;
- дубль pending по той же роли → 400;
- не-суперпользователь не может list/approve/reject → 403;
- владелец одобряет course_specialist → user.role == 'course_creator', approved;
- владелец одобряет supplier с supplier_id → SupplierUserAccess создан и активен;
- approve supplier без supplier → 400 с понятной ошибкой;
- reject работает.

Запуск:
    .venv/bin/python manage.py test apps.users.tests.test_partner_access -v1

Тестовая БД пустая — всех User/Supplier создаём в setUp.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.pets.models import Supplier, SupplierUserAccess
from apps.users.models import PartnerAccessRequest
from core.constants import UserRole

User = get_user_model()


class PartnerAccessRequestTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email='applicant@example.com', password='pw-test-applicant',
        )
        cls.other_user = User.objects.create_user(
            email='other@example.com', password='pw-test-other',
        )
        cls.owner = User.objects.create_superuser(
            email='owner@example.com', password='pw-test-owner',
        )
        cls.supplier = Supplier.objects.create(code='dino', name='Динозаврик')

        cls.list_create_url = reverse('partner-access-requests-list')
        cls.my_url = reverse('partner-access-requests-my')

    def _approve_url(self, pk):
        return reverse('partner-access-requests-approve', args=[pk])

    def _reject_url(self, pk):
        return reverse('partner-access-requests-reject', args=[pk])

    # ---------------------------------------------------------------- create

    def test_create_supplier_request_returns_201_pending(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(
            self.list_create_url,
            {'requested_role': 'supplier', 'company_name': 'ООО Корм'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(resp.data['requested_role'], 'supplier')
        self.assertEqual(resp.data['status'], 'pending')
        self.assertEqual(resp.data['company_name'], 'ООО Корм')
        self.assertEqual(
            PartnerAccessRequest.objects.filter(user=self.user).count(), 1,
        )

    def test_duplicate_pending_same_role_returns_400(self):
        self.client.force_authenticate(self.user)
        first = self.client.post(
            self.list_create_url, {'requested_role': 'supplier'}, format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        dup = self.client.post(
            self.list_create_url, {'requested_role': 'supplier'}, format='json',
        )
        self.assertEqual(dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_requires_authentication(self):
        resp = self.client.post(
            self.list_create_url, {'requested_role': 'supplier'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_my_lists_own_requests(self):
        self.client.force_authenticate(self.user)
        self.client.post(
            self.list_create_url, {'requested_role': 'course_specialist'}, format='json',
        )
        resp = self.client.get(self.my_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['requested_role'], 'course_specialist')

    # ------------------------------------------------------ owner-only access

    def test_non_superuser_cannot_list(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get(self.list_create_url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_superuser_cannot_approve_or_reject(self):
        req = PartnerAccessRequest.objects.create(
            user=self.user, requested_role='course_specialist',
        )
        self.client.force_authenticate(self.other_user)
        approve = self.client.post(self._approve_url(req.pk), {}, format='json')
        self.assertEqual(approve.status_code, status.HTTP_403_FORBIDDEN)
        reject = self.client.post(self._reject_url(req.pk), {}, format='json')
        self.assertEqual(reject.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_list_and_filter_by_status(self):
        PartnerAccessRequest.objects.create(
            user=self.user, requested_role='supplier',
        )
        PartnerAccessRequest.objects.create(
            user=self.other_user, requested_role='course_specialist',
            status=PartnerAccessRequest.STATUS_APPROVED,
        )
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.list_create_url, {'status': 'pending'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data['results'] if 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['status'], 'pending')

    # -------------------------------------------------------------- approve

    def test_owner_approves_course_specialist_sets_role(self):
        req = PartnerAccessRequest.objects.create(
            user=self.user, requested_role='course_specialist',
        )
        self.client.force_authenticate(self.owner)
        resp = self.client.post(self._approve_url(req.pk), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['status'], 'approved')

        self.user.refresh_from_db()
        self.assertEqual(self.user.role, UserRole.COURSE_CREATOR)
        req.refresh_from_db()
        self.assertEqual(req.status, 'approved')
        self.assertEqual(req.reviewed_by_id, self.owner.id)
        self.assertIsNotNone(req.reviewed_at)

    def test_owner_approves_supplier_with_supplier_id_grants_access(self):
        req = PartnerAccessRequest.objects.create(
            user=self.user, requested_role='supplier', company_name='ООО Корм',
        )
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            self._approve_url(req.pk),
            {'supplier_id': str(self.supplier.id)},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['status'], 'approved')

        access = SupplierUserAccess.objects.filter(
            user=self.user, supplier=self.supplier,
        ).first()
        self.assertIsNotNone(access)
        self.assertTrue(access.is_active)

        req.refresh_from_db()
        self.assertEqual(str(req.granted_supplier_id), str(self.supplier.id))

    def test_approve_supplier_without_supplier_returns_400(self):
        req = PartnerAccessRequest.objects.create(
            user=self.user, requested_role='supplier',
        )
        self.client.force_authenticate(self.owner)
        resp = self.client.post(self._approve_url(req.pk), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', resp.data)
        req.refresh_from_db()
        self.assertEqual(req.status, 'pending')

    def test_approve_is_idempotent(self):
        req = PartnerAccessRequest.objects.create(
            user=self.user, requested_role='supplier', granted_supplier=self.supplier,
        )
        self.client.force_authenticate(self.owner)
        first = self.client.post(self._approve_url(req.pk), {}, format='json')
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)
        second = self.client.post(self._approve_url(req.pk), {}, format='json')
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(
            SupplierUserAccess.objects.filter(
                user=self.user, supplier=self.supplier,
            ).count(),
            1,
        )

    # --------------------------------------------------------------- reject

    def test_owner_rejects_request(self):
        req = PartnerAccessRequest.objects.create(
            user=self.user, requested_role='course_specialist',
        )
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            self._reject_url(req.pk), {'reason': 'нет документов'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['status'], 'rejected')

        req.refresh_from_db()
        self.assertEqual(req.status, 'rejected')
        self.assertEqual(req.review_reason, 'нет документов')
        # Доступ НЕ выдан.
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, UserRole.USER)
