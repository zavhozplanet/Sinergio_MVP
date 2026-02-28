import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authMiddleware } from './middleware/auth.js';
import { usersRouter } from './routes/users.js';
import { communitiesRouter } from './routes/communities.js';
import { offersRouter } from './routes/offers.js';
import { ordersRouter } from './routes/orders.js';
import { logisticsRouter } from './routes/logistics.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { reputationRouter } from './routes/reputation.js';

const app = new Hono();

// ─── Global Middleware ─────────────────────────────────
app.use('*', logger());
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
}));

// ─── Health Check ──────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', ts: Date.now() }));

// ─── Protected API Routes ──────────────────────────────
const api = new Hono();
api.use('*', authMiddleware);

api.route('/users', usersRouter);
api.route('/communities', communitiesRouter);
api.route('/offers', offersRouter);
api.route('/orders', ordersRouter);
api.route('/logistics', logisticsRouter);
api.route('/subscriptions', subscriptionsRouter);
api.route('/reputation', reputationRouter);

app.route('/api', api);

// ─── Start Server ──────────────────────────────────────
const port = parseInt(process.env.PORT || '3001', 10);
serve({ fetch: app.fetch, port }, () => {
    console.log(`🚀 Sinergio Backend running on http://localhost:${port}`);
});

export default app;
