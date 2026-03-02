import { Context, Next } from 'hono';
import crypto from 'node:crypto';

/**
 * Dual Authentication Middleware:
 * 1. Telegram WebApp InitData validation (header: X-Telegram-Init-Data)
 * 2. Bearer Token fallback for API-first / external agents (header: Authorization)
 */
export async function authMiddleware(c: Context, next: Next) {
    // ─── Try Telegram InitData first ─────────────────────
    const initData = c.req.header('X-Telegram-Init-Data');
    if (initData) {
        const validated = validateTelegramInitData(initData);
        if (validated) {
            c.set('userId', validated.userId);
            c.set('authMethod', 'telegram');
            return next();
        }

        // Dev fallback: HMAC failed (ngrok/dev env) — trust userId from raw initData
        if (process.env.NODE_ENV === 'development') {
            const devUser = extractUserFromInitData(initData);
            if (devUser) {
                c.set('userId', devUser);
                c.set('authMethod', 'telegram-dev');
                return next();
            }
        }
    }

    // ─── Try Bearer Token ────────────────────────────────
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        // MVP: "tg:{tg_id}" for dev/testing — replace with JWT in production
        if (token.startsWith('tg:')) {
            const userId = BigInt(token.slice(3));
            c.set('userId', userId);
            c.set('authMethod', 'bearer');
            return next();
        }
    }

    return c.json({ error: 'Unauthorized' }, 401);
}

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

function validateTelegramInitData(initData: string): { userId: bigint; user: TelegramUser } | null {
    try {
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) return null;

        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return null;

        // Build data-check-string
        params.delete('hash');
        const entries = Array.from(params.entries());
        entries.sort(([a], [b]) => a.localeCompare(b));
        const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

        // HMAC-SHA256 validation
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (computedHash !== hash) return null;

        // Check auth_date is not too old (allow 24 hours)
        const authDate = parseInt(params.get('auth_date') || '0', 10);
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 86400) return null;

        // Extract user
        const userStr = params.get('user');
        if (!userStr) return null;
        const user: TelegramUser = JSON.parse(userStr);

        return { userId: BigInt(user.id), user };
    } catch {
        return null;
    }
}

/** Dev-only: extract userId from initData without HMAC validation */
function extractUserFromInitData(initData: string): bigint | null {
    try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        return user.id ? BigInt(user.id) : null;
    } catch {
        return null;
    }
}
