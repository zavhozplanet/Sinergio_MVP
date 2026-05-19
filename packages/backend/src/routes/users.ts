import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { AppEnv } from '../types.js';

export const usersRouter = new Hono<AppEnv>();

const updateUserSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    role: z.enum(['PARTICIPANT', 'PRODUCER']).optional(),
    is_producer: z.boolean().optional(),
    is_consumer: z.boolean().optional(),
    language: z.enum(['uk', 'en', 'ru']).optional(),
});

// GET /api/users/me — Current user profile
usersRouter.get('/me', async (c) => {
    const userId = c.get('userId') as bigint;

    let user = await prisma.user.findUnique({
        where: { tg_id: userId },
        include: {
            communities: { include: { community: true } },
            _count: { select: { subscribers: true, subscriptions: true, offers: true, orders: true } },
        },
    });

    if (!user) {
        // Auto-create user on first access
        user = await prisma.user.create({
            data: { tg_id: userId, name: `User ${userId}` },
            include: {
                communities: { include: { community: true } },
                _count: { select: { subscribers: true, subscriptions: true, offers: true, orders: true } },
            },
        });
    }

    return c.json(serializeUser(user));
});

// PUT /api/users/me — Update current user
usersRouter.put('/me', async (c) => {
    const userId = c.get('userId') as bigint;
    const body = await c.req.json();
    const data = updateUserSchema.parse(body);

    // Sync legacy role field from new flags
    const updateData: any = { ...data };
    if (data.is_producer !== undefined || data.is_consumer !== undefined) {
        // If is_producer is being set to true, also set legacy role
        if (data.is_producer) updateData.role = 'PRODUCER';
        else if (data.is_producer === false) updateData.role = 'PARTICIPANT';
    }

    const user = await prisma.user.upsert({
        where: { tg_id: userId },
        update: updateData,
        create: { tg_id: userId, name: data.name || `User ${userId}`, ...data },
        include: {
            communities: { include: { community: true } },
            _count: { select: { subscribers: true, subscriptions: true, offers: true, orders: true } },
        },
    });

    return c.json(serializeUser(user));
});

// GET /api/users/:id — View any user's public profile
usersRouter.get('/:id', async (c) => {
    const id = BigInt(c.req.param('id'));

    const user = await prisma.user.findUnique({
        where: { tg_id: id },
        include: {
            _count: { select: { subscribers: true, offers: true } },
        },
    });

    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json({
        tg_id: user.tg_id.toString(),
        name: user.name,
        username: user.username,
        bio: user.bio,
        role: user.role,
        c_index: user.c_index,
        created_at: user.created_at,
        _count: user._count,
    });
});

// Helper: serialize BigInt fields to string for JSON
function serializeUser(user: any) {
    return {
        ...user,
        tg_id: user.tg_id.toString(),
        communities: user.communities?.map((cm: any) => ({
            ...cm,
            user_id: cm.user_id.toString(),
            community: cm.community,
        })),
    };
}
