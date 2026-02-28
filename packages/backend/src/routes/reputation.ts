import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { handleScam } from '../lib/c-index.js';

export const reputationRouter = new Hono();

// GET /api/reputation/me — My C-Index + history
reputationRouter.get('/me', async (c) => {
    const userId = c.get('userId') as bigint;

    const [user, ledger] = await Promise.all([
        prisma.user.findUnique({
            where: { tg_id: userId },
            select: { tg_id: true, name: true, c_index: true },
        }),
        prisma.cIndexLedger.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 50,
        }),
    ]);

    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json({
        tg_id: user.tg_id.toString(),
        name: user.name,
        c_index: user.c_index,
        history: ledger.map((l) => ({
            ...l,
            user_id: l.user_id.toString(),
        })),
    });
});

// GET /api/reputation/leaderboard — Top users by C-Index
reputationRouter.get('/leaderboard', async (c) => {
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const users = await prisma.user.findMany({
        select: { tg_id: true, name: true, username: true, c_index: true, role: true },
        orderBy: { c_index: 'desc' },
        take: limit,
    });

    return c.json(users.map((u) => ({ ...u, tg_id: u.tg_id.toString() })));
});

// GET /api/reputation/:userId — User's C-Index history
reputationRouter.get('/:userId', async (c) => {
    const userId = BigInt(c.req.param('userId'));

    const [user, ledger] = await Promise.all([
        prisma.user.findUnique({
            where: { tg_id: userId },
            select: { tg_id: true, name: true, c_index: true },
        }),
        prisma.cIndexLedger.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 50,
        }),
    ]);

    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json({
        tg_id: user.tg_id.toString(),
        name: user.name,
        c_index: user.c_index,
        history: ledger.map((l) => ({ ...l, user_id: l.user_id.toString() })),
    });
});

// POST /api/reputation/scam — Report confirmed scam (admin action)
reputationRouter.post('/scam', async (c) => {
    const body = await c.req.json();
    const { user_id, order_id } = body;

    if (!user_id || !order_id) {
        return c.json({ error: 'user_id and order_id required' }, 400);
    }

    await handleScam(BigInt(user_id), order_id);

    return c.json({ success: true, message: 'C-Index reset to 0' });
});
