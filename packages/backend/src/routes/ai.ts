import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { semanticMatch, generateDailySummary, smartCartSuggestions } from '../lib/ai.js';

export const aiRouter = new Hono();

// POST /api/ai/match — Semantic Matcher (offers ↔ needs)
aiRouter.post('/match', async (c) => {
    const userId = c.get('userId') as bigint;
    const body = await c.req.json();
    const { need } = body;

    if (!need || typeof need !== 'string') {
        return c.json({ error: 'need (string) is required' }, 400);
    }

    // Get user's community info for local priority
    const userMemberships = await prisma.communityMember.findMany({
        where: { user_id: userId },
        include: { community: { select: { id: true, name: true, location_tags: true } } },
    });

    const userCommunity = userMemberships[0]?.community?.name;
    const userLocation = userMemberships[0]?.community?.location_tags;

    // Fetch active offers
    const offers = await prisma.offer.findMany({
        where: { is_active: true },
        include: {
            producer: { select: { name: true } },
            community: { select: { name: true, location_tags: true } },
        },
        take: 50,
        orderBy: { created_at: 'desc' },
    });

    const offersForAI = offers.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        price: Number(o.price),
        producer_name: o.producer.name,
        community_name: o.community?.name,
        location_tags: o.community?.location_tags,
    }));

    try {
        const matches = await semanticMatch({
            need,
            offers: offersForAI,
            userCommunity,
            userLocation,
        });

        return c.json({ matches });
    } catch (err: any) {
        console.error('AI match error:', err);
        return c.json({ error: 'AI service unavailable', details: err.message }, 503);
    }
});

// POST /api/ai/summary — Daily summary for a community
aiRouter.post('/summary', async (c) => {
    const body = await c.req.json();
    const { community_id } = body;

    if (!community_id) {
        return c.json({ error: 'community_id required' }, 400);
    }

    const community = await prisma.community.findUnique({
        where: { id: community_id },
    });

    if (!community) return c.json({ error: 'Community not found' }, 404);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Gather today's data
    const [newOffers, completedOrdersCount, newMembersCount, topProducers] = await Promise.all([
        prisma.offer.findMany({
            where: { community_id, created_at: { gte: oneDayAgo } },
            include: { producer: { select: { name: true } } },
            take: 10,
        }),
        prisma.order.count({
            where: {
                offer: { community_id },
                status: 'COMPLETED',
                created_at: { gte: oneDayAgo },
            },
        }),
        prisma.communityMember.count({
            where: { community_id, user: { created_at: { gte: oneDayAgo } } },
        }),
        prisma.user.findMany({
            where: { communities: { some: { community_id } } },
            select: { name: true, c_index: true },
            orderBy: { c_index: 'desc' },
            take: 3,
        }),
    ]);

    try {
        const summary = await generateDailySummary({
            communityName: community.name,
            newOffers: newOffers.map((o) => ({
                title: o.title,
                producer: o.producer.name,
                price: Number(o.price),
            })),
            completedOrders: completedOrdersCount,
            newMembers: newMembersCount,
            topProducers,
        });

        return c.json({ summary });
    } catch (err: any) {
        console.error('AI summary error:', err);
        return c.json({ error: 'AI service unavailable', details: err.message }, 503);
    }
});

// GET /api/ai/smart-cart — Smart Cart recommendations
aiRouter.get('/smart-cart', async (c) => {
    const userId = c.get('userId') as bigint;

    // Get user's order history
    const orders = await prisma.order.findMany({
        where: { buyer_id: userId, status: 'COMPLETED' },
        include: {
            offer: {
                select: { title: true },
                include: { producer: { select: { name: true } } },
            },
        },
        orderBy: { created_at: 'desc' },
        take: 20,
    });

    if (orders.length === 0) {
        return c.json({ suggestions: [], message: 'No order history yet' });
    }

    // Get available offers
    const availableOffers = await prisma.offer.findMany({
        where: { is_active: true },
        include: { producer: { select: { name: true } } },
        take: 30,
        orderBy: { created_at: 'desc' },
    });

    try {
        const suggestions = await smartCartSuggestions({
            orderHistory: orders.map((o) => ({
                title: o.offer.title,
                quantity: Number(o.quantity),
                date: o.created_at.toISOString().split('T')[0],
                producer: o.offer.producer.name,
            })),
            availableOffers: availableOffers.map((o) => ({
                id: o.id,
                title: o.title,
                price: Number(o.price),
                producer: o.producer.name,
            })),
        });

        return c.json({ suggestions });
    } catch (err: any) {
        console.error('AI smart cart error:', err);
        return c.json({ error: 'AI service unavailable', details: err.message }, 503);
    }
});
