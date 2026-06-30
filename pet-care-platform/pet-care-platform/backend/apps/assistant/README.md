# ИИ-ассистент «Пуф» (`apps.assistant`)

Самодостаточное приложение: диалоговый ассистент с тремя способностями —
**поддержка/FAQ**, **здоровье питомца**, **подбор корма**. Без своих моделей и
миграций (stateless v1) — общую БД не затрагивает.

## Поток

```
POST /api/assistant/chat/  (JWT)
  → RouterService.classify()         тема: support | health | food
  → <capability>_service.build()     грунтинг: факты из БД/FAQ в системный промпт
  → get_provider().generate()        LLM по ASSISTANT_LLM_BACKEND
  → {reply, capability, sources, disclaimer, provider, needs_pet}
```

- **support** — ответ из `knowledge/faq_ru.py` (черновая база, согласовать с реальными правилами).
- **health** — строго owner-scoped (`Pet.objects.get(id, owner=user)`, чужой → 404), всегда вет-дисклеймер, без диагнозов.
- **food** — вызывает существующий движок `apps.pets.food_recipe_candidate_provider.select_ration`; ассистент только поясняет уже подобранных кандидатов (аллергии — хард-блок, бизнес ≤30%).

Ограничение частоты — `ScopedRateThrottle` scope `assistant`, ставка из `ASSISTANT_RATE_LIMIT`.

## Подключить реальную модель

Сейчас `ASSISTANT_LLM_BACKEND=stub` — детерминированная заглушка без сети. Чтобы
включить настоящую модель, заполните env и переключите бэкенд:

### YandexGPT (RU-native, рекомендуется первым)
```
ASSISTANT_LLM_BACKEND=yandex
ASSISTANT_YANDEX_API_KEY=<api-key сервисного аккаунта>
ASSISTANT_YANDEX_FOLDER_ID=<folder id>
```

### GigaChat (Сбер, RU-native)
```
ASSISTANT_LLM_BACKEND=gigachat
ASSISTANT_GIGACHAT_AUTH_KEY=<Base64(client_id:client_secret)>
ASSISTANT_GIGACHAT_SCOPE=GIGACHAT_API_PERS
ASSISTANT_GIGACHAT_CA_BUNDLE=/path/to/russian-trusted-root-ca.pem   # либо ASSISTANT_GIGACHAT_VERIFY=false на стенде
```

### Claude (Anthropic)
```
ASSISTANT_LLM_BACKEND=claude
ASSISTANT_ANTHROPIC_API_KEY=<key>
ASSISTANT_HTTP_PROXY=http://user:pass@proxy:port   # api.anthropic.com из РФ обычно заблокирован
```

> Адаптеры реализованы по спецификациям API, но не обкатаны против живых сервисов
> (нет ключей в окружении разработки). Перед боевым включением — проверить на стенде.

## Добавить нового провайдера

1. Создать `providers/<name>.py` с классом-наследником `LLMProvider` (метод `generate(...) -> LLMResult`), по образцу `providers/yandex.py`.
2. Зарегистрировать ветку в фабрике `providers/__init__.py::get_provider`.
3. Добавить переменные в `config/settings.py` и `.env.example`.

## Тесты

```
python manage.py test apps.assistant      # изолированная test_БД, не общая dev-БД
```
- `test_router` / `test_providers` / `test_support` — без БД;
- `test_health_isolation` — проверка owner-изоляции (чужой питомец → 404).
