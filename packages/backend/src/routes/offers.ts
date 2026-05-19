import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { AppEnv } from '../types.js';

export const offersRouter = new Hono<AppEnv>();

const createOfferSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    price: z.number().positive(),
    type: z.enum(['INDIVIDUAL', 'POOL']),
    visibility: z.enum(['GLOBAL', 'COMMUNITY_ONLY']).default('GLOBAL'),
    community_id: z.string().uuid().optional(),
    target_quantity: z.number().positive().optional(),
    deadline: z.string().datetime().optional(),
});

// GET /api/offers — List offers with filters
offersRouter.get('/', async (c) => {
    const communityId = c.req.query('community_id');
    const type = c.req.query('type') as 'INDIVIDUAL' | 'POOL' | undefined;
    const search = c.req.query('search');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const where: any = { is_active: true };
    if (communityId) where.community_id = communityId;
    if (type) where.type = type;
    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [offers, total] = await Promise.all([
        prisma.offer.findMany({
            where,
            include: {
                producer: { select: { tg_id: true, name: true, username: true, c_index: true, is_producer: true, is_consumer: true } },
                community: { select: { id: true, name: true, location_tags: true } },
                _count: { select: { orders: true } },
            },
            orderBy: { created_at: 'desc' },
            skip: offset,
            take: limit,
        }),
        prisma.offer.count({ where }),
    ]);

    return c.json({
        data: offers.map(serializeOffer),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
});

// GET /api/offers/:id — Offer detail
offersRouter.get('/:id', async (c) => {
    const id = c.req.param('id');

    const offer = await prisma.offer.findUnique({
        where: { id },
        include: {
            producer: { select: { tg_id: true, name: true, username: true, c_index: true, bio: true, is_producer: true, is_consumer: true } },
            community: { select: { id: true, name: true, location_tags: true } },
            orders: {
                select: { id: true, buyer_id: true, quantity: true, status: true, created_at: true },
                orderBy: { created_at: 'desc' },
            },
            _count: { select: { orders: true } },
        },
    });

    if (!offer) return c.json({ error: 'Offer not found' }, 404);

    return c.json(serializeOffer(offer));
});

// POST /api/offers — Create offer
offersRouter.post('/', async (c) => {
    const userId = c.get('userId') as bigint;
    const body = await c.req.json();
    const data = createOfferSchema.parse(body);

    // Ensure user is a PRODUCER
    const user = await prisma.user.findUnique({ where: { tg_id: userId } });
    if (!user || user.role !== 'PRODUCER') {
        return c.json({ error: 'Only producers can create offers' }, 403);
    }

    // Pool offers require target_quantity
    if (data.type === 'POOL' && !data.target_quantity) {
        return c.json({ error: 'Pool offers require target_quantity' }, 400);
    }

    const offer = await prisma.offer.create({
        data: {
            producer_id: userId,
            title: data.title,
            description: data.description,
            price: data.price,
            type: data.type,
            visibility: data.visibility,
            community_id: data.community_id,
            target_quantity: data.target_quantity,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
        },
        include: {
            producer: { select: { tg_id: true, name: true, username: true, c_index: true, is_producer: true, is_consumer: true } },
            community: { select: { id: true, name: true, location_tags: true } },
        },
    });

    return c.json(serializeOffer(offer), 201);
});

// PUT /api/offers/:id — Update offer
offersRouter.put('/:id', async (c) => {
    const userId = c.get('userId') as bigint;
    const id = c.req.param('id');
    const body = await c.req.json();

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return c.json({ error: 'Offer not found' }, 404);
    if (offer.producer_id !== userId) return c.json({ error: 'Not the owner' }, 403);

    const updated = await prisma.offer.update({
        where: { id },
        data: body,
        include: {
            producer: { select: { tg_id: true, name: true, username: true, c_index: true, is_producer: true, is_consumer: true } },
        },
    });

    return c.json(serializeOffer(updated));
});

// DELETE /api/offers/:id — Deactivate offer
offersRouter.delete('/:id', async (c) => {
    const userId = c.get('userId') as bigint;
    const id = c.req.param('id');

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return c.json({ error: 'Offer not found' }, 404);
    if (offer.producer_id !== userId) return c.json({ error: 'Not the owner' }, 403);

    await prisma.offer.update({ where: { id }, data: { is_active: false } });

    return c.json({ success: true });
});

// GET /api/offers/my — Producer's own offers
offersRouter.get('/my/list', async (c) => {
    const userId = c.get('userId') as bigint;

    const offers = await prisma.offer.findMany({
        where: { producer_id: userId },
        include: {
            community: { select: { id: true, name: true } },
            _count: { select: { orders: true } },
        },
        orderBy: { created_at: 'desc' },
    });

    return c.json(offers.map(serializeOffer));
});

function serializeOffer(offer: any) {
    return {
        ...offer,
        producer_id: offer.producer_id?.toString(),
        producer: offer.producer ? { ...offer.producer, tg_id: offer.producer.tg_id.toString() } : undefined,
        orders: offer.orders?.map((o: any) => ({ ...o, buyer_id: o.buyer_id.toString() })),
    };
}
