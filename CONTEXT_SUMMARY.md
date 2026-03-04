# Sinergio MVP — Контекст для продолжения работы

---

## Часть 1 — Code Review, Рефакторинг, UX-фиксы (2026-03-03)

### Общая информация о проекте

**Sinergio** — кооперативная платформа взаимного забезпечення (cooperative mutual provisioning network) для украиноязычного рынка. Запускается как Telegram Mini App (TMA) с ботом.

#### Технологический стек

| Компонент | Технологии |
|-----------|-----------|
| **TMA (фронтенд)** | React, Vite, TailwindCSS, react-i18next, react-router-dom, @twa-dev/sdk |
| **Backend** | Node.js, TypeScript, Hono, Prisma, Zod |
| **Bot** | grammY, Telegram Bot API |
| **DB** | PostgreSQL (Supabase) |
| **AI** | Google Gemini 2.0 Flash (@google/generative-ai) |

#### Структура проекта

```
Sinergio_MVP/
├── packages/
│   ├── tma/           # Telegram Mini App (React + Vite)
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── api.ts         # HTTP клиент к бэкенду
│   │       │   ├── i18n.ts        # Локализация (uk + en)
│   │       │   ├── constants.ts   # [NEW] ORDER_STATUS, LOGISTICS_STATUS
│   │       │   └── telegram.ts    # [NEW] getTg, getTgUser, openChatLink, SUPERGROUP_LINK
│   │       ├── screens/
│   │       │   ├── Home.tsx           # Маркетплейс — список предложений
│   │       │   ├── Profile.tsx        # Профиль пользователя с режимом редактирования
│   │       │   ├── OfferDetail.tsx    # Детали предложения + заказ/удаление
│   │       │   ├── CreateOffer.tsx    # Создание нового предложения
│   │       │   ├── Communities.tsx    # Список осередків (communities)
│   │       │   ├── CommunityDetail.tsx# Детали осередку
│   │       │   ├── Logistics.tsx      # Доставки
│   │       │   └── ProducerDashboard.tsx # CRM панель виробника
│   │       ├── App.tsx            # Router + NavBar + глобальный BackButton
│   │       └── index.css          # Дизайн-система (glassmorphism, dark theme)
│   ├── backend/       # Hono API сервер
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── offers.ts      # CRUD предложений
│   │       │   ├── orders.ts      # Заказы
│   │       │   ├── users.ts       # Пользователи, роли
│   │       │   ├── communities.ts # Осередки
│   │       │   └── logistics.ts   # Доставки
│   │       └── lib/
│   │           ├── ai.ts          # Gemini AI интеграция
│   │           └── auth.ts        # Telegram InitData + Bearer token auth
│   └── bot/           # grammY бот
│       └── src/
│           ├── index.ts           # Бот: start, profile, help, chat команды
│           ├── commands/
│           │   ├── start.ts       # /start — регистрация + приветствие
│           │   ├── profile.ts     # /profile — просмотр профиля
│           │   └── help.ts        # /help — справка
│           └── services/
│               └── social-sync.ts # Синхронизация с TG группой
├── prisma/
│   └── schema.prisma  # Модель БД
└── .env               # Основные env переменные
```

#### Ключевые env переменные

| Переменная | Где | Описание |
|-----------|-----|---------|
| `VITE_SUPERGROUP_LINK` | `packages/tma/.env` | Invite-ссылка на суперграппу (`https://t.me/+9VMozYg_a704OWQ6`) |
| `SUPERGROUP_CHAT_ID` | `.env` (корень) | ID чата суперграппы (`-1003779091657`) |
| `SUPERGROUP_INVITE_LINK` | `packages/bot/.env` | Invite-ссылка для бота |
| `BOT_TOKEN` | `packages/bot/.env` | Токен Telegram бота |
| `TMA_URL` | `packages/bot/.env` | URL TMA для WebApp-кнопок |

#### Аутентификация

- Основная: `X-Telegram-Init-Data` (HMAC-SHA256 валидация)
- Dev-fallback: `Bearer tg:123456789` — mock-токен для браузера на localhost

#### Терминология проекта (финальная)

| Старое | Новое (украинское) |
|--------|-------------------|
| Продюсер | **Виробник** |
| Покупатель | **Споживач** |
| Диспут | **Вирішення питань** |
| Офферы | **Пропозиції** |
| Ячейки | **Осередки** |

---

### Что сделано в этой сессии

#### 1. Полный Code Review (аудит 15 исходных файлов)

Найдено и исправлено **14 проблем**:

##### 🔴 Баги (исправлено)

1. **Operator precedence bug в `api.ts`** — `!getInitData() && hostname === 'localhost' || hostname === '127.0.0.1'` — из-за приоритета `||` условие всегда срабатывало на `127.0.0.1`, даже при наличии `initData`. Добавлены скобки.

2. **Мёртвая логика `SUPERGROUP_NUMERIC`** — в `Communities.tsx` и `CommunityDetail.tsx` URL вида `t.me/c/...` конструировался из invite-ссылки через `.replace('https://t.me/c/', '')`, что давало сломанные ссылки. Заменено на `openChatLink(SUPERGROUP_LINK)` из общего модуля.

3. **Bot `/chat`** использовал приватный формат `t.me/c/{numericId}` — не работал для не-участников группы. Заменён на invite-ссылку из `SUPERGROUP_INVITE_LINK`.

4. **BackButton конфликт** — `App.tsx` (глобальный обработчик), `Home.tsx` и `Profile.tsx` (per-screen) одновременно вызывали `BackButton.show()/hide()`, создавая гонки состояний. Per-screen обработчики убраны.

##### 🟡 Качество кода (исправлено)

5. **`STATUS_MAP` дублировался в 4 файлах** → создан `lib/constants.ts` с единым `ORDER_STATUS` и `LOGISTICS_STATUS`.

6. **`getTg()` дублировался в 5 файлах** → создан `lib/telegram.ts` с хелперами `getTg()`, `getTgUser()`, `openChatLink()`, `SUPERGROUP_LINK`.

7. **Hardcoded украинские строки** в `Logistics.tsx`, `ProducerDashboard.tsx`, `Home.tsx` — перенесены в i18n. Добавлено ~10 новых ключей (`ai_search`, `ai_recommends`, `unknown`, `completed_label`, `in_progress_label`, `no_orders`, `start_work`, `ready_label`, `finish_label`, `no_my_deliveries`).

8. **Фальшивая `ru` локаль** — была копией `uk` с мем-переводом `delete_offer: 'Конфисковать пропозицію'`. Удалена; `ru` теперь фолбечится на `uk`.

9. **Избыточные i18n ключи** (`participant`, `producer_role`, `switch_to_participant`) — удалены.

##### 🟢 Чистка (исправлено)

10. **Удалены 3 мусорных скрипта:** `fix-test-data.js`, `force-fix-db.ts`, `get-link.js`.

11. **Мёртвые fallback-строки в `t()` вызовах** (типа `t('key') || 'Hardcoded fallback'`) — удалены.

12. **CSS-класс `.no-transform`** — добавлен для `glass-card` без hover-эффекта, заменяя `style={{ transform: 'none' }}`.

13. **Bot `profile.ts`** — `Оферти` → `Пропозиції`.

**Итоговый коммит:** `63de144` — 19 файлов, 339 ins / 553 del (чистое удаление 214 строк).

---

#### 2. Фикс поиска в Маркете (Home.tsx)

**Баг:** после поиска кнопка «назад» очищала текст, но не перезагружала список карточек. Пустой экран оставался, вернуться можно было только переключением вкладок.

**Причина:** `clearSearch()` вызывала `setFilter('all')` + `setSearch('')`, но `useEffect([filter])` не срабатывал потому что `filter` уже был `'all'` до поиска. React `setState` асинхронный — `loadOffers()` читала стayе значения из стейта.

**Решение:** `loadOffers()` получила параметр `overrideParams?` — при вызове из `clearSearch()` передаётся `{}` напрямую, минуя стейт.

**Коммит:** Включён в основной рефакторинг.

---

#### 3. Кнопка «назад» в поиске Осередків (Communities.tsx)

По аналогии с маркетом добавлены:
- `isSearchActive` флаг
- `clearSearch()` с немедленной перезагрузкой `load(undefined)`  
- Кнопка `✕` рядом с полем поиска
- Кнопка `← Назад` в пустом результате поиска

---

#### 4. Кнопка «назад» в редактировании профиля (Profile.tsx)

Полноценная система отслеживания несохранённых изменений:

| Состояние | `← Назад` | `Скасувати` |
|-----------|-----------|-------------|
| Ничего не менялось | тихий выход | игнорируется (затемнена 0.4) |
| Изменено, **не сохранено** | `confirm()` → откат → выход | откат, **остаёмся** в редактировании |
| Изменено и **сохранено** | тихий выход | игнорируется (затемнена 0.4) |

**Реализация:**
- `formSnapshot` — снимок формы при входе в редактирование
- `isDirty` — пользователь что-то менял
- `savedOnce` — `handleSave()` выполнился успешно
- `enterEdit()` — сбрасывает флаги, делает снимок
- `updateForm(patch)` — ставит `isDirty = true`
- `handleBack()` — если dirty && !saved → confirm → revert → exit
- `handleCancel()` — если dirty && !saved → revert (остаётся в edit)

**Дополнительно:** `autoComplete="off"` на полях имени и bio — иначе Android Chrome предлагал сохранить bio как «пароль».

**Коммиты:** `d49ab02`, `0041a80`

---

#### 5. S-Index и иконки ролей на карточках предложений (Home.tsx)

**S-Index:** перемещён из правого столбца (под ценой) в строку с именем автора (та же строка).

**Иконки ролей:**
- `🏢` — у участника включён статус «Виробник» (`is_producer = true`)
- `❤️` — у участника включён статус «Споживач» (`is_consumer = true`)
- Обе иконки отображаются одновременно, если у пользователя оба статуса

**Итоговая строка автора:**  
`🏢 ❤️ [Ім'я] · ⭐S [число] · 🏘️ [Осередок]`

Правый столбец теперь содержит **только цену** (чище выглядит).

**Коммит:** `f82e469`

---

### Все коммиты сессии (хронологически)

| Коммит | Описание |
|--------|---------|
| `78c4a7a` | Pre-refactor checkpoint: i18n keys + force-fix-db script |
| `63de144` | **Основной рефакторинг: 14 issues, 19 файлов, -214 строк** |
| Search fix | Home.tsx: clearSearch → loadOffers({}) bypass |
| Communities | Communities.tsx: search ✕ button + empty-state back |
| `d49ab02` | Profile edit: back button + unsaved changes warning |
| `0041a80` | Profile edit: autoComplete=off (password manager fix) |
| `b79d773` | S-Index badge: remove > 0 guard (always show) |
| `f82e469` | S-Index moved to name row, ❤️ icon for consumers |

---

### Текущее состояние проекта

**Работает:**
- ✅ Маркетплейс с поиском, AI-поиском, фильтрами
- ✅ Карточки предложений с иконками ролей и S-Index
- ✅ Профиль с dual-role toggles (Виробник/Споживач)
- ✅ Редактирование профиля с unsaved-changes protection
- ✅ Детали предложения с кнопкой удаления для владельца
- ✅ Осередки (communities) с поиском
- ✅ Логістика
- ✅ CRM панель виробника
- ✅ Бот: /start, /profile, /help, /chat
- ✅ Суперграппа доступна через invite-link
- ✅ i18n: uk (основная) + en
- ✅ Dev-mode работает в браузере с mock-auth

**Известные ограничения:**

- README содержит устаревшую терминологию (не исправлено, out of scope)
- Topic-ссылки для осередків (chat topics in supergroup) не реализованы — все ведут на главную ссылку суперграппы

### Паттерны и подходы, которых придерживаться

1. **Shared utilities** — общий код вынесен в `lib/constants.ts` и `lib/telegram.ts`. Не дублировать.
2. **i18n** — все UI-строки через `t('key')`. Без hardcode, без fallback-строк после `t()`.
3. **Локали** — только `uk` (основная) + `en`. Русская убрана (fallback на uk).
4. **BackButton** — управляется глобально в `App.tsx`. Не трогать `BackButton.show()/hide()` в screen-компонентах.
5. **CSS** — glassmorphism dark theme. `.no-transform` для статических карточек. `.glass-card` для интерактивных.
6. **State management в формах** — snapshot + isDirty + savedOnce для отслеживания несохранённых изменений.
7. **Коммиты** — атомарные, с описательными сообщениями. Каждый фикс — отдельный коммит.

## Часть 2 — Инфраструктура и База Данных (Обновлено: Март 2026)

### Текущее состояние серверов и БД
1. **Хостинг:** Проект запущен на домашнем сервере (Linux) с устойчивостью к блэкаутам.
2. **Менеджер процессов (PM2):** Все сервисы крутятся в фоне. Команды для управления: `pm2 status`, `pm2 restart all`, `pm2 logs`. Запущены 4 процесса: `backend`, `bot`, `tma`, `ngrok`.
3. **Сеть:** Фронтенд доступен по статическому домену ngrok: `https://ionogenic-madge-arousedly.ngrok-free.dev`.
4. **База Данных (Supabase):** 
   - Выполнен переезд на **новый, абсолютно чистый проект** Supabase.
   - Настроено подключение через IPv4 Pooler (порт 6543 для `DATABASE_URL` и 5432 для `DIRECT_URL`).
   - Команда `npx prisma db push` выполнена успешно. Схема `sinergio` создана.
   - **ВАЖНО:** База данных сейчас пустая. Для тестирования UI потребуется создание seed-скрипта.
