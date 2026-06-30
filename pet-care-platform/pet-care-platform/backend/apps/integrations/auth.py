import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import timedelta, timezone as datetime_timezone

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.pets.food_recipe_models import Supplier


class IntegrationAuthError(Exception):
    def __init__(self, message, code='UNAUTHORIZED', status_code=401):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


@dataclass(frozen=True)
class DistributorCredential:
    apikey: str
    secret: str
    supplier: Supplier


def _iter_configured_credentials():
    raw = getattr(settings, 'DISTRIBUTOR_INTEGRATION_KEYS_JSON', '') or ''
    if raw:
        try:
            items = json.loads(raw)
        except json.JSONDecodeError:
            items = []
        if isinstance(items, dict):
            items = [items]
        for item in items:
            if isinstance(item, dict):
                yield item

    apikey = getattr(settings, 'DINOZAVRIK_DISTRIBUTOR_API_KEY', '') or ''
    secret = getattr(settings, 'DINOZAVRIK_DISTRIBUTOR_SECRET', '') or ''
    supplier_code = getattr(settings, 'DINOZAVRIK_SUPPLIER_CODE', 'dinozavrik') or 'dinozavrik'
    if apikey and secret:
        yield {
            'apikey': apikey,
            'secret': secret,
            'supplier_code': supplier_code,
        }


def get_distributor_credential(apikey: str) -> DistributorCredential:
    for item in _iter_configured_credentials():
        if item.get('apikey') != apikey:
            continue
        supplier_code = item.get('supplier_code') or 'dinozavrik'
        try:
            supplier = Supplier.objects.get(code=supplier_code, is_active=True)
        except Supplier.DoesNotExist as exc:
            raise IntegrationAuthError(
                'Поставщик для API-ключа не найден или отключён',
                code='SUPPLIER_NOT_CONFIGURED',
                status_code=401,
            ) from exc
        return DistributorCredential(
            apikey=apikey,
            secret=item.get('secret') or '',
            supplier=supplier,
        )

    raise IntegrationAuthError('API-ключ не найден', code='UNAUTHORIZED', status_code=401)


def _parse_timestamp(timestamp: str):
    dt = parse_datetime(timestamp)
    if not dt:
        raise IntegrationAuthError('Некорректный timestamp', code='TIMESTAMP_EXPIRED', status_code=403)
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone=datetime_timezone.utc)
    return dt


def _expected_signature(secret: str, timestamp: str, raw_body: bytes) -> str:
    payload = timestamp.encode('utf-8') + b'.' + raw_body
    digest = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()
    return f'sha256={digest}'


def verify_distributor_request(request) -> DistributorCredential:
    apikey = request.headers.get('X-Distributor-Api-Key')
    signature = request.headers.get('X-Distributor-Signature')
    timestamp = request.headers.get('X-Distributor-Timestamp')

    if not apikey:
        raise IntegrationAuthError('Не передан X-Distributor-Api-Key', code='UNAUTHORIZED', status_code=401)
    if not signature:
        raise IntegrationAuthError('Не передан X-Distributor-Signature', code='INVALID_SIGNATURE', status_code=403)
    if not timestamp:
        raise IntegrationAuthError('Не передан X-Distributor-Timestamp', code='TIMESTAMP_EXPIRED', status_code=403)

    credential = get_distributor_credential(apikey)
    timestamp_dt = _parse_timestamp(timestamp)
    drift = abs(timezone.now() - timestamp_dt)
    max_drift = timedelta(seconds=getattr(settings, 'DISTRIBUTOR_SIGNATURE_MAX_DRIFT_SECONDS', 300))
    if drift > max_drift:
        raise IntegrationAuthError('Timestamp за пределами допустимого окна', code='TIMESTAMP_EXPIRED', status_code=403)

    expected = _expected_signature(credential.secret, timestamp, request.body or b'')
    if not hmac.compare_digest(expected, signature):
        raise IntegrationAuthError('Подпись HMAC не прошла проверку', code='INVALID_SIGNATURE', status_code=403)

    return credential


def build_pitomets_signature(secret: str, timestamp: str, raw_body: bytes) -> str:
    return _expected_signature(secret, timestamp, raw_body)


def utc_timestamp() -> str:
    return timezone.now().strftime('%Y-%m-%dT%H:%M:%SZ')


def check_rate_limit(apikey: str, scope: str):
    if getattr(settings, 'DISTRIBUTOR_RATE_LIMIT_ENABLED', True) is False:
        return True, None

    limits = getattr(settings, 'DISTRIBUTOR_RATE_LIMITS', {}) or {}
    limit = int(limits.get(scope, limits.get('default', 60)))
    now = timezone.now()
    cache_key = f'distributor-rate:{apikey}:{scope}:{now:%Y%m%d%H%M}'
    try:
        cache.add(cache_key, 0, timeout=70)
        count = cache.incr(cache_key)
    except ValueError:
        cache.set(cache_key, 1, timeout=70)
        count = 1

    if count > limit:
        return False, 60 - now.second
    return True, None
