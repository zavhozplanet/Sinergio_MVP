import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';

export const subscriptionsRouter = new Hono();

// GET /api/subscriptions — My subscriptions
subscriptionsRouter.get('/', async (c) => {
    const userId = c.get('userId') as bigint;

    const subscriptions = await prisma.subscription.findMany({
        where: { subscriber_id: userId },
        include: {
            producer: {
                select: { tg_id: true, name: true, username: true, bio: true, c_index: true, role: true },
            },
        },
        orderBy: { created_at: 'desc' },
    });

    return c.json(subscriptions.map((s) => ({
        ...s,
        subscriber_id: s.subscriber_id.toString(),
        producer_id: s.producer_id.toString(),
        producer: { ...s.producer, tg_id: s.producer.tg_id.toString() },
    })));
});

// GET /api/subscriptions/subscribers — My subscribers (for producers)
subscriptionsRouter.get('/subscribers', async (c) => {
    const userId = c.get('userId') as bigint;

    const subscribers = await prisma.subscription.findMany({
        where: { producer_id: userId },
        include: {
            subscriber: {
                select: { tg_id: true, name: true, username: true, c_index: true },
            },
        },
        orderBy: { created_at: 'desc' },
    });

    return c.json(subscribers.map((s) => ({
        ...s,
        subscriber_id: s.subscriber_id.toString(),
        producer_id: s.producer_id.toString(),
        subscriber: { ...s.subscriber, tg_id: s.subscriber.tg_id.toString() },
    })));
});

// POST /api/subscriptions/:producerId — Subscribe
subscriptionsRouter.post('/:producerId', async (c) => {
    const userId = c.get('userId') as bigint;
    const producerId = BigInt(c.req.param('producerId'));

    if (userId === producerId) {
        return c.json({ error: 'Cannot subscribe to yourself' }, 400);
    }

    const existing = await prisma.subscription.findUnique({
        where: { subscriber_id_producer_id: { subscriber_id: userId, producer_id: producerId } },
    });

    if (existing) return c.json({ error: 'Already subscribed' }, 409);

    const subscription = await prisma.subscription.create({
        data: { subscriber_id: userId, producer_id: producerId },
    });

    return c.json({
        ...subscription,
        subscriber_id: subscription.subscriber_id.toString(),
        producer_id: subscription.producer_id.toString(),
    }, 201);
});

// DELETE /api/subscriptions/:producerId — Unsubscribe
subscriptionsRouter.delete('/:producerId', async (c) => {
    const userId = c.get('userId') as bigint;
    const producerId = BigInt(c.req.param('producerId'));

    await prisma.subscription.deleteMany({
        where: { subscriber_id: userId, producer_id: producerId },
    });

    return c.json({ success: true });
});
