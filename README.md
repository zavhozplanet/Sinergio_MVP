# Sinergio Node — MVP

**Статус:** ✅ MVP реализован, этап тестирования

Локализованная социально-экономическая сеть в экосистеме Telegram. Параллельная кооперативная экономика: взаимное обеспечение, репутация (C-Index), фрактальные локальные сообщества (осередки), децентрализованная логистика.

---

## Архитектура

```
Sinergio_MVP/                   # Monorepo (npm workspaces)
├── packages/backend/           # API-сервер (Hono + Prisma + PostgreSQL)
│   ├── prisma/schema.prisma    # БД: 8 моделей, 7 enum
│   └── src/
│       ├── middleware/auth.ts   # Dual Auth: TG InitData + Bearer
│       ├── lib/                # Бизнес-логика (C-Index, State Machine)
│       └── routes/             # 8 модулей API (users, offers, orders, ai, ...)
├── packages/bot/               # Telegram-бот (grammY)
│   └── src/
│       ├── commands/           # /start, /profile, /help
│       └── services/           # Social Sync → Супергруппа
└── packages/tma/               # Telegram Mini App (React + Vite + TailwindCSS)
    └── src/
        ├── screens/            # 8 экранов (Marketplace, Profile, Logistics, ...)
        └── lib/                # API client, i18n (uk/ru/en)
```

## Стек технологий

| Модуль | Технологии |
|--------|-----------|
| Backend | Node.js, TypeScript, Hono, Prisma, Zod |
| DB | PostgreSQL (Supabase) |
| Bot | grammY, Telegram Bot API |
| TMA | React 18, Vite 6, TailwindCSS 3, @twa-dev/sdk |
| AI | Google Gemini 2.0 Flash (@google/generative-ai) |
| i18n | i18next (uk, ru, en) |

## Ключевая бизнес-логика

### C-Index (Кооперативный Индекс)
- **+10** продюсеру при `COMPLETED`
- **+5** покупателю при `COMPLETED`
- **+3** курьеру при завершении доставки
- **Заморозка** при `DISPUTED` (0 очков, запись в леджер)
- **Сброс до 0** при подтверждённом scam

### Payment Routing (Маршрутизація платежів)
- **Path A (Прямий P2P):** C-Index ≥ 50 → `PREPAY_PATH_A`
- **Path B (Ескроу):** C-Index < 50 → `PREPAY_PATH_B` (через Treasurer осередку)
- **FACT:** оплата по факту доставки
- **PREORDER:** резервування, оплата пізніше

### Жизненный цикл заказа
```
CREATED → FUNDING (Pool) → AWAITING_PAYMENT → PAID → IN_PROGRESS
  → READY_FOR_LOGISTICS → IN_TRANSIT → COMPLETED
              ↕ DISPUTED (из любого статуса)
```

## Переменные окружения

Файл `.env` в корне проекта:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
BOT_TOKEN=...
BOT_USERNAME=@Sinergio_bot
SUPERGROUP_CHAT_ID=-1003779091657
TMA_URL=https://t.me/Sinergio_bot/app
GOOGLE_AI_API_KEY=...
PORT=3001
NODE_ENV=development
```

## Запуск

```bash
# 1. Установка зависимостей
npm install --legacy-peer-deps

# 2. Генерация Prisma клиента (из корня backend)
cd packages/backend && npx prisma generate

# 3. Push схемы в БД (первый раз)
cd packages/backend && npx prisma db push

# 4. Запуск Backend API (порт 3001)
cd packages/backend && npm run dev

# 5. Запуск Telegram бота
cd packages/bot && npm run dev

# 6. Запуск TMA (порт 5173, проксирует /api → :3001)
cd packages/tma && npm run dev
```

## API Endpoints

| Модуль | Маршруты |
|--------|----------|
| Health | `GET /api/health` |
| Users | `GET/PUT /api/users/me` |
| Communities | `CRUD /api/communities`, join/leave/member roles |
| Offers | `CRUD /api/offers`, pagination, filters |
| Orders | Create, status transitions, bulk-confirm |
| Logistics | `/available`, pickup, deliver, route |
| Subscriptions | `GET/POST/DELETE /api/subscriptions` |
| Reputation | C-Index history, leaderboard, scam report |
| AI | Semantic match, daily summary, smart cart |

## Аутентификация

- **TMA**: заголовок `X-Telegram-Init-Data` (HMAC-SHA256 валидация)
- **API/Dev**: `Authorization: Bearer tg:{telegram_id}`
