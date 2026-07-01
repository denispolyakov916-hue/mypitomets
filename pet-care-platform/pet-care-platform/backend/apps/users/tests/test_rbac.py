"""
RBAC-регрессия (аудит безопасности 2026-07-01).

Единый набор, фиксирующий разграничение доступа по ролям — чтобы находки P0/P1
не «отъехали» в будущем:

* список пользователей отдаётся только администраторам;
* обычный пользователь не открывает ни одну панель (админ/маркетинг/курсы);
* маркетолог видит только маркетинг, но не пользователей/курсы;
* владелец платформы (superuser) vs админ компании (staff): менять роль может
  только владелец;
* специалист (course_creator) не трогает ЧУЖИЕ курсы/модули/страницы/блоки/шаблоны,
  но полноценно работает со своими;
* поставщик с активным SupplierUserAccess входит в кабинет даже при role='user';
* refresh-токен живёт в httpOnly-cookie, и вход по cookie обновляет access.

Запуск (в контейнере backend):
    docker compose exec -T backend python manage.py test apps.users.tests.test_rbac -v2
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from django.test import override_settings

from core.constants import UserRole

User = get_user_model()

PW = 'pw-test-12345'

# Пути проверены через resolve()/reverse() на реальном роутере.
URL_AUTH_USERS = '/api/auth/users/'
URL_ADMIN_USERS = '/api/admin/users/'
URL_ADMIN_MARKETING_NEWS = '/api/admin/marketing-news/'
URL_ADMIN_COURSES = '/api/admin/courses/'
URL_SUPPLIER_ME = '/api/supplier/profile/me/'
URL_LOGIN = '/api/auth/login/'
URL_REFRESH = '/api/auth/refresh/'
URL_BULK_USERS = '/api/admin/management/bulk_update_users/'
URL_SUPPLIER_DASHBOARD = '/api/supplier/dashboard/'
URL_SUPPLIER_ORDERS = '/api/supplier/orders/'
URL_SUPPLIER_RETURNS = '/api/supplier/returns/'
URL_SUPPLIER_IMPORTS = '/api/supplier/imports/'


def make_user(email, role=UserRole.USER, **extra):
    """Обычное создание пользователя; save() синхронизирует is_staff/is_superuser по роли."""
    return User.objects.create_user(email=email, password=PW, role=role, **extra)


@override_settings(SECURE_SSL_REDIRECT=False)
class UsersListRBACTests(APITestCase):
    """`/api/auth/users/` — только администраторам (находка P0: раньше был IsAuthenticated)."""

    @classmethod
    def setUpTestData(cls):
        cls.user = make_user('u_list@t.local')
        cls.admin = make_user('a_list@t.local', role=UserRole.ADMIN)

    def test_anonymous_denied(self):
        r = self.client.get(URL_AUTH_USERS)
        self.assertIn(r.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_plain_user_denied(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(URL_AUTH_USERS)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN, r.data)

    def test_admin_allowed(self):
        self.client.force_authenticate(self.admin)
        r = self.client.get(URL_AUTH_USERS)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)


@override_settings(SECURE_SSL_REDIRECT=False)
class PanelAccessRBACTests(APITestCase):
    """Разграничение панелей: пользователь — никуда; маркетолог — только маркетинг; админ — везде."""

    @classmethod
    def setUpTestData(cls):
        cls.user = make_user('u_panel@t.local')
        cls.marketing = make_user('mkt_panel@t.local', role=UserRole.MARKETING_MANAGER)
        cls.admin = make_user('a_panel@t.local', role=UserRole.ADMIN)

    # --- обычный пользователь не открывает ни одну панель ---
    def test_user_denied_admin_users(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(URL_ADMIN_USERS).status_code, status.HTTP_403_FORBIDDEN)

    def test_user_denied_marketing(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(URL_ADMIN_MARKETING_NEWS).status_code, status.HTTP_403_FORBIDDEN)

    def test_user_denied_courses(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(URL_ADMIN_COURSES).status_code, status.HTTP_403_FORBIDDEN)

    # --- маркетолог: только маркетинг ---
    def test_marketing_allowed_marketing(self):
        self.client.force_authenticate(self.marketing)
        self.assertEqual(self.client.get(URL_ADMIN_MARKETING_NEWS).status_code, status.HTTP_200_OK)

    def test_marketing_denied_users(self):
        self.client.force_authenticate(self.marketing)
        self.assertEqual(self.client.get(URL_ADMIN_USERS).status_code, status.HTTP_403_FORBIDDEN)

    def test_marketing_denied_courses(self):
        self.client.force_authenticate(self.marketing)
        self.assertEqual(self.client.get(URL_ADMIN_COURSES).status_code, status.HTTP_403_FORBIDDEN)

    # --- админ: и пользователи, и маркетинг ---
    def test_admin_allowed_users_and_marketing(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(URL_ADMIN_USERS).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(URL_ADMIN_MARKETING_NEWS).status_code, status.HTTP_200_OK)


@override_settings(SECURE_SSL_REDIRECT=False)
class RoleMatrixRBACTests(APITestCase):
    """P1.2: владелец платформы (superuser) vs админ компании (staff, не superuser)."""

    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_superuser(email='owner@t.local')
        cls.admin = make_user('admin@t.local', role=UserRole.ADMIN)
        cls.target = make_user('target@t.local')

    def test_save_syncs_flags_by_role(self):
        self.assertEqual(self.owner.role, UserRole.PLATFORM_OWNER)
        self.assertTrue(self.owner.is_superuser)
        self.assertTrue(self.admin.is_staff)
        self.assertFalse(self.admin.is_superuser)
        self.assertFalse(self.target.is_staff)
        self.assertFalse(self.target.is_superuser)

    def test_owner_can_change_role(self):
        self.client.force_authenticate(self.owner)
        r = self.client.patch(f'{URL_ADMIN_USERS}{self.target.id}/',
                              {'role': UserRole.COURSE_CREATOR}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.target.refresh_from_db()
        self.assertEqual(self.target.role, UserRole.COURSE_CREATOR)

    def test_admin_cannot_change_role(self):
        self.client.force_authenticate(self.admin)
        r = self.client.patch(f'{URL_ADMIN_USERS}{self.target.id}/',
                              {'role': UserRole.COURSE_CREATOR}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN, r.data)
        self.target.refresh_from_db()
        self.assertEqual(self.target.role, UserRole.USER)

    def test_admin_can_edit_nonrole_field(self):
        self.client.force_authenticate(self.admin)
        r = self.client.patch(f'{URL_ADMIN_USERS}{self.target.id}/',
                              {'first_name': 'Изменено'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)


@override_settings(SECURE_SSL_REDIRECT=False)
class SpecialistCourseRBACTests(APITestCase):
    """P0/P1.5: специалист работает только со своими курсами/модулями/страницами/шаблонами."""

    @classmethod
    def setUpTestData(cls):
        from apps.training.models import Course, CourseModule, CoursePage, BlockTemplate

        cls.creatorA = make_user('creatorA@t.local', role=UserRole.COURSE_CREATOR)
        cls.creatorB = make_user('creatorB@t.local', role=UserRole.COURSE_CREATOR)
        cls.admin = make_user('a_course@t.local', role=UserRole.ADMIN)

        cls.courseA = Course.objects.create(title='Курс A', duration=30, author=cls.creatorA)
        cls.courseB = Course.objects.create(title='Курс B', duration=30, author=cls.creatorB)
        cls.moduleA = CourseModule.objects.create(course=cls.courseA, title='Модуль A')
        cls.pageA = CoursePage.objects.create(title='Стр A', course_id=cls.courseA.id, module=cls.moduleA)
        cls.template = BlockTemplate.objects.create(
            name='Шаблон', block_type='text', is_public=True, is_active=True, created_by=cls.admin,
        )
        cls.use_url = f'/api/courses/block-templates/{cls.template.id}/use/'

    # --- список курсов у специалиста — только свои ---
    def test_creator_lists_only_own_courses(self):
        self.client.force_authenticate(self.creatorA)
        r = self.client.get(URL_ADMIN_COURSES)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        data = r.data
        items = data['results'] if isinstance(data, dict) and 'results' in data else data
        ids = {str(c.get('id')) for c in items}  # сериализатор отдаёт id строкой
        self.assertIn(str(self.courseA.id), ids)
        self.assertNotIn(str(self.courseB.id), ids)

    # --- чужой курс: детальный доступ закрыт ---
    def test_creator_denied_foreign_course_detail(self):
        self.client.force_authenticate(self.creatorB)
        r = self.client.get(f'{URL_ADMIN_COURSES}{self.courseA.id}/')
        self.assertIn(r.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    # --- создание модуля в чужом курсе запрещено, в своём — разрешено ---
    def test_creator_cannot_add_module_to_foreign_course(self):
        self.client.force_authenticate(self.creatorB)
        r = self.client.post(f'/api/courses/{self.courseA.id}/modules/', {'title': 'X'}, format='json')
        self.assertIn(r.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_creator_can_add_module_to_own_course(self):
        self.client.force_authenticate(self.creatorA)
        r = self.client.post(f'/api/courses/{self.courseA.id}/modules/', {'title': 'Новый'}, format='json')
        self.assertIn(r.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED), r.data)

    # --- use_template (P1.5): владелец страницы 201, чужой 403, админ 201 ---
    def test_owner_can_use_template_on_own_page(self):
        self.client.force_authenticate(self.creatorA)
        r = self.client.post(self.use_url, {'page_id': str(self.pageA.id)}, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, getattr(r, 'data', None))

    def test_foreign_creator_cannot_use_template(self):
        self.client.force_authenticate(self.creatorB)
        r = self.client.post(self.use_url, {'page_id': str(self.pageA.id)}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN, getattr(r, 'data', None))

    def test_admin_can_use_template(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(self.use_url, {'page_id': str(self.pageA.id)}, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, getattr(r, 'data', None))


@override_settings(SECURE_SSL_REDIRECT=False)
class SupplierGateRBACTests(APITestCase):
    """P0: право входа в кабинет поставщика даёт активный SupplierUserAccess, а не User.role."""

    @classmethod
    def setUpTestData(cls):
        from apps.pets.food_recipe_models import Supplier, SupplierUserAccess

        cls.supplier_user = make_user('sup@t.local')  # именно role='user'
        cls.plain_user = make_user('noaccess@t.local')
        supplier = Supplier.objects.create(code='TST', name='Тест-поставщик', is_active=True)
        SupplierUserAccess.objects.create(user=cls.supplier_user, supplier=supplier)  # role=manager, is_active=True по умолчанию

    def test_user_with_access_passes_gate(self):
        self.client.force_authenticate(self.supplier_user)
        r = self.client.get(URL_SUPPLIER_ME)
        self.assertEqual(r.status_code, status.HTTP_200_OK, getattr(r, 'data', None))

    def test_user_without_access_denied(self):
        self.client.force_authenticate(self.plain_user)
        r = self.client.get(URL_SUPPLIER_ME)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN, getattr(r, 'data', None))


@override_settings(SECURE_SSL_REDIRECT=False)
class TokenCookieRBACTests(APITestCase):
    """P1.3: refresh-токен — в httpOnly-cookie; обновление access идёт по cookie."""

    @classmethod
    def setUpTestData(cls):
        cls.user = make_user('login@t.local', is_activated=True)

    def test_login_sets_httponly_refresh_cookie(self):
        r = self.client.post(URL_LOGIN, {'email': 'login@t.local', 'password': PW}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertIn('accessToken', r.data)
        self.assertIn('refreshToken', r.cookies)
        self.assertTrue(r.cookies['refreshToken']['httponly'])

    def test_refresh_via_cookie(self):
        login = self.client.post(URL_LOGIN, {'email': 'login@t.local', 'password': PW}, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.data)
        # APIClient сохраняет cookie между запросами — refresh читает её сам.
        r = self.client.get(URL_REFRESH)
        self.assertEqual(r.status_code, status.HTTP_200_OK, getattr(r, 'data', None))
        self.assertIn('accessToken', r.data)


@override_settings(SECURE_SSL_REDIRECT=False)
class BulkUserUpdateRBACTests(APITestCase):
    """P0: массовое обновление пользователей без эскалации привилегий + защита владельца."""

    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_superuser(email='bowner@t.local')
        cls.admin = make_user('badmin@t.local', role=UserRole.ADMIN)
        cls.u1 = make_user('bu1@t.local')
        cls.u2 = make_user('bu2@t.local')

    def _bulk(self, user, ids, updates):
        self.client.force_authenticate(user)
        return self.client.post(
            URL_BULK_USERS,
            {'user_ids': [str(i) for i in ids], 'updates': updates},
            format='json',
        )

    def test_admin_cannot_grant_superuser(self):
        r = self._bulk(self.admin, [self.u1.id], {'is_superuser': True})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST, r.data)
        self.u1.refresh_from_db()
        self.assertFalse(self.u1.is_superuser)

    def test_admin_cannot_grant_is_staff(self):
        r = self._bulk(self.admin, [self.u1.id], {'is_staff': True})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST, r.data)
        self.u1.refresh_from_db()
        self.assertFalse(self.u1.is_staff)

    def test_admin_cannot_set_role(self):
        r = self._bulk(self.admin, [self.u1.id], {'role': UserRole.PLATFORM_OWNER})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN, r.data)
        self.u1.refresh_from_db()
        self.assertEqual(self.u1.role, UserRole.USER)
        self.assertFalse(self.u1.is_superuser)

    def test_admin_cannot_touch_owner(self):
        r = self._bulk(self.admin, [self.owner.id], {'is_active': False})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN, r.data)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.is_active)

    def test_admin_unknown_field_rejected(self):
        r = self._bulk(self.admin, [self.u1.id], {'password': 'whatever-123'})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST, r.data)

    def test_admin_safe_bulk_update_ok(self):
        r = self._bulk(self.admin, [self.u1.id, self.u2.id], {'is_active': False})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.u1.refresh_from_db()
        self.u2.refresh_from_db()
        self.assertFalse(self.u1.is_active)
        self.assertFalse(self.u2.is_active)
        # флаги привилегий не поехали
        self.assertFalse(self.u1.is_staff)
        self.assertFalse(self.u1.is_superuser)

    def test_owner_can_bulk_set_role(self):
        r = self._bulk(self.owner, [self.u1.id], {'role': UserRole.MARKETING_MANAGER})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.u1.refresh_from_db()
        self.assertEqual(self.u1.role, UserRole.MARKETING_MANAGER)


@override_settings(SECURE_SSL_REDIRECT=False)
class OwnerProtectionRBACTests(APITestCase):
    """P0: обычный админ не может изменить или удалить учётную запись владельца платформы."""

    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_superuser(email='powner@t.local')
        cls.admin = make_user('padmin@t.local', role=UserRole.ADMIN)

    def test_admin_cannot_patch_owner(self):
        self.client.force_authenticate(self.admin)
        r = self.client.patch(f'{URL_ADMIN_USERS}{self.owner.id}/', {'is_active': False}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN, r.data)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.is_active)

    def test_admin_cannot_delete_owner(self):
        self.client.force_authenticate(self.admin)
        r = self.client.delete(f'{URL_ADMIN_USERS}{self.owner.id}/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(id=self.owner.id).exists())


@override_settings(SECURE_SSL_REDIRECT=False)
class SupplierRoutesRBACTests(APITestCase):
    """P2: dashboard/orders/returns/imports зарегистрированы и закрыты HasSupplierAccess."""

    @classmethod
    def setUpTestData(cls):
        from apps.pets.food_recipe_models import Supplier, SupplierUserAccess

        cls.supplier_user = make_user('sroutes@t.local')
        cls.plain_user = make_user('snoacc@t.local')
        supplier = Supplier.objects.create(code='RT', name='Routes', is_active=True)
        SupplierUserAccess.objects.create(user=cls.supplier_user, supplier=supplier)

    def test_routes_registered_for_supplier(self):
        self.client.force_authenticate(self.supplier_user)
        for url in (URL_SUPPLIER_DASHBOARD, URL_SUPPLIER_ORDERS, URL_SUPPLIER_RETURNS, URL_SUPPLIER_IMPORTS):
            resp = self.client.get(url)
            self.assertNotEqual(resp.status_code, status.HTTP_404_NOT_FOUND, f'{url} не зарегистрирован')
            self.assertEqual(resp.status_code, status.HTTP_200_OK, f'{url}: {getattr(resp, "data", None)}')

    def test_routes_denied_without_access(self):
        self.client.force_authenticate(self.plain_user)
        self.assertEqual(self.client.get(URL_SUPPLIER_DASHBOARD).status_code, status.HTTP_403_FORBIDDEN)
