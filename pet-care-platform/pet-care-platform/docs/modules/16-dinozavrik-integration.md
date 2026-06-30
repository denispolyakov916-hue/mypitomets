# Интеграция Dinozavrik

## Входящие вызовы Dinozavrik -> Питомец+

Base URL:

```text
https://betapitometsplus.ru/api/integrations/distributor/v1/
```

Эндпоинты:

```text
GET  /ping
POST /catalog/sync
POST /webhooks/fulfillment
```

Обязательные заголовки:

```text
Content-Type: application/json; charset=utf-8
X-Distributor-Api-Key: <public key>
X-Distributor-Signature: sha256=<hmac hex>
X-Distributor-Timestamp: 2026-06-30T10:00:00Z
X-Request-ID: req_...
```

Подпись считается как HMAC-SHA256 от:

```text
timestamp + "." + raw_request_body
```

Для `GET /ping` тело пустое, то есть подписывается `timestamp + "."`.

## Что обновляет catalog.sync

Синхронизация идёт по паре:

```text
supplier api key + article_number
```

При успешной позиции обновляются:

- `SupplierOffer.in_stock`, `SupplierOffer.price`, `SupplierOffer.raw.last_catalog_sync`
- связанные `ProductSKU.available`, `ProductSKU.stock_quantity`, `ProductSKU.price`, `ProductSKU.compare_price`
- витринный `Product.is_available`, `Product.price`, `Product.compare_price`, `Product.sku_count`

После успешных изменений очищается кэш каталога, чтобы витрина не показывала старые остатки.

## Webhook статусов

Поддерживаются события:

```text
order.confirmed
order.cancelled
fulfillment.packed
fulfillment.shipped
fulfillment.delivered
fulfillment.delivery_failed
```

Дедупликация выполняется по `event_id`. Повтор того же события возвращает `200` без повторного изменения заказа.

## Исходящие вызовы Питомец+ -> Dinozavrik

Оплата ведётся на стороне Питомец+. Покупатель платит в нашем сервисе, а Dinozavrik получает уже оплаченный заказ только для исполнения. Dinozavrik не участвует в заморозке средств, списании оплаты, возвратах покупателю и разделении платежа.

Расчёт с Dinozavrik выполняется вне клиентского платежа: Питомец+ раз в неделю сверяет исполненные заказы и оплачивает подрядчику его часть.

Клиент реализован для:

```text
GET  /ping
POST /orders
POST /orders/{platform_order_id}/cancel
```

Автоматическая отправка заказа после оплаты выключена по умолчанию. Включать только после sandbox-приёмки:

```text
DINOZAVRIK_ORDER_SYNC_ENABLED=True
DINOZAVRIK_API_BASE_URL=https://api.dinozavrik.ru/pitomets-integration/v1
DINOZAVRIK_PITOMETS_API_KEY=pk_live_...
DINOZAVRIK_PITOMETS_SECRET=...
DINOZAVRIK_PAYMENT_COLLECTOR=pitometsplus
DINOZAVRIK_SETTLEMENT_MODEL=weekly_payout
```

В `POST /orders` блок `payment` передаётся только информационно:

```json
{
  "status": "paid",
  "payment_collector": "pitometsplus",
  "paid_at": "2026-06-30T10:00:00Z",
  "psp_reference": "payment-id-if-any",
  "settlement_model": "weekly_payout"
}
```

Dinozavrik должен использовать этот блок как подтверждение, что заказ уже оплачен в Питомец+, а не как команду на проведение оплаты.

Если нужен строгий режим, когда ошибка отправки в Dinozavrik должна ломать пост-оплатную активацию заказа:

```text
DINOZAVRIK_ORDER_SYNC_STRICT=True
```

По умолчанию строгий режим выключен, чтобы не ломать текущую оплату до боевого тестирования.
