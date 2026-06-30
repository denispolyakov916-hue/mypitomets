import json
import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import IntegrationAuthError, check_rate_limit, verify_distributor_request
from .services import CatalogSyncService, FulfillmentWebhookService, IntegrationValidationError


def _request_id(request):
    return request.headers.get('X-Request-ID') or f'req_{uuid.uuid4().hex}'


def ok_response(data=None, request_id=None, status_code=status.HTTP_200_OK):
    if data is None:
        data = {}
    return Response({'data': data, 'meta': {'request_id': request_id}}, status=status_code)


def error_response(message, code, request_id=None, status_code=status.HTTP_400_BAD_REQUEST, errors=None, retry_after=None):
    response = Response({
        'error': message,
        'code': code,
        'errors': errors or [],
        'meta': {'request_id': request_id},
    }, status=status_code)
    if retry_after:
        response['Retry-After'] = str(retry_after)
    return response


class DistributorBaseView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    rate_scope = 'default'

    def authenticate_request(self, request):
        request_id = _request_id(request)
        try:
            credential = verify_distributor_request(request)
        except IntegrationAuthError as exc:
            return None, error_response(str(exc), exc.code, request_id, exc.status_code)

        allowed, retry_after = check_rate_limit(credential.api_key, self.rate_scope)
        if not allowed:
            return None, error_response(
                'Превышен лимит запросов',
                'RATE_LIMIT_EXCEEDED',
                request_id,
                status.HTTP_429_TOO_MANY_REQUESTS,
                retry_after=retry_after,
            )
        return credential, None

    def parse_body(self, request, request_id):
        max_bytes = int(getattr(settings, 'DISTRIBUTOR_MAX_BODY_BYTES', 10 * 1024 * 1024))
        if len(request.body or b'') > max_bytes:
            raise IntegrationValidationError('Тело запроса больше 10 МБ', code='VALIDATION_ERROR')
        try:
            return json.loads((request.body or b'{}').decode('utf-8'))
        except json.JSONDecodeError as exc:
            raise IntegrationValidationError('Некорректный JSON', errors=[{'message': str(exc)}]) from exc


class DistributorPingView(DistributorBaseView):
    def get(self, request):
        request_id = _request_id(request)
        credential, auth_error = self.authenticate_request(request)
        if auth_error:
            return auth_error
        return Response({
            'status': 'ok',
            'supplier': credential.supplier.code,
            'meta': {'request_id': request_id},
        }, status=status.HTTP_200_OK)


class CatalogSyncView(DistributorBaseView):
    rate_scope = 'catalog'

    def post(self, request):
        request_id = _request_id(request)
        credential, auth_error = self.authenticate_request(request)
        if auth_error:
            return auth_error

        try:
            payload = self.parse_body(request, request_id)
            data = CatalogSyncService.sync(credential.supplier, payload)
        except IntegrationValidationError as exc:
            return error_response(str(exc), exc.code, request_id, exc.status_code, errors=exc.errors)

        return ok_response(data, request_id, status.HTTP_202_ACCEPTED)


class FulfillmentWebhookView(DistributorBaseView):
    rate_scope = 'webhook'

    def post(self, request):
        request_id = _request_id(request)
        credential, auth_error = self.authenticate_request(request)
        if auth_error:
            return auth_error

        try:
            payload = self.parse_body(request, request_id)
            data = FulfillmentWebhookService.process(credential.supplier, payload, request_id=request_id)
        except IntegrationValidationError as exc:
            return error_response(str(exc), exc.code, request_id, exc.status_code, errors=exc.errors)

        return ok_response(data, request_id, status.HTTP_200_OK)
