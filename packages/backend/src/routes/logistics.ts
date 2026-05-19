import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { AppEnv } from '../types.js';

export const logisticsRouter = new Hono<AppEnv>();

// GET /api/logistics/available — Orders ready for logistics
logisticsRouter.get('/available', async (c) => {
    const orders = await prisma.order.findMany({
        where: { status: 'READY_FOR_LOGISTICS' },
        include: {
            offer: {
                select: { title: true, producer_id: true },
                include: {
                    producer: { select: { tg_id: true, name: true, username: true } },
                    community: { select: { name: true, location_tags: true } },
                },
            },
            buyer: { select: { tg_id: true, name: true, username: true } },
            logistics: true,
        },
        orderBy: { created_at: 'desc' },
    });

    return c.json(orders.map((o) => ({
        ...o,
        buyer_id: o.buyer_id.toString(),
        offer: {
            ...o.offer,
            producer_id: o.offer.producer_id.toString(),
            producer: { ...o.offer.producer, tg_id: o.offer.producer.tg_id.toString() },
        },
        buyer: { ...o.buyer, tg_id: o.buyer.tg_id.toString() },
        logistics: o.logistics ? {
            ...o.logistics,
            carrier_id: o.logistics.carrier_id?.toString(),
        } : null,
    })));
});

// POST /api/logistics — Create logistics entry for an order
logisticsRouter.post('/', async (c) => {
    const body = await c.req.json();
    const { order_id, pickup_location, dropoff_location } = body;

    if (!order_id || !pickup_location || !dropoff_location) {
        return c.json({ error: 'order_id, pickup_location, dropoff_location required' }, 400);
    }

    const order = await prisma.order.findUnique({ where: { id: order_id } });
    if (!order) return c.json({ error: 'Order not found' }, 404);

    const logistics = await prisma.logistics.create({
        data: { order_id, pickup_location, dropoff_location },
    });

    return c.json(logistics, 201);
});

// POST /api/logistics/:id/pickup — Carrier claims delivery
logisticsRouter.post('/:id/pickup', async (c) => {
    const userId = c.get('userId') as bigint;
    const logisticsId = c.req.param('id');

    const logistics = await prisma.logistics.findUnique({ where: { id: logisticsId } });
    if (!logistics) return c.json({ error: 'Logistics entry not found' }, 404);

    const updated = await prisma.$transaction(async (tx) => {
        const log = await tx.logistics.update({
            where: { id: logisticsId },
            data: { carrier_id: userId, status: 'PICKED_UP' },
        });

        await tx.order.update({
            where: { id: logistics.order_id },
            data: { status: 'IN_TRANSIT' },
        });

        return log;
    });

    return c.json({ ...updated, carrier_id: updated.carrier_id?.toString() });
});

// POST /api/logistics/:id/deliver — Mark as delivered
logisticsRouter.post('/:id/deliver', async (c) => {
    const userId = c.get('userId') as bigint;
    const logisticsId = c.req.param('id');

    const logistics = await prisma.logistics.findUnique({ where: { id: logisticsId } });
    if (!logistics) return c.json({ error: 'Logistics entry not found' }, 404);
    if (logistics.carrier_id !== userId) return c.json({ error: 'Not the carrier' }, 403);

    const updated = await prisma.$transaction(async (tx) => {
        const log = await tx.logistics.update({
            where: { id: logisticsId },
            data: { status: 'DELIVERED' },
        });

        await tx.order.update({
            where: { id: logistics.order_id },
            data: { status: 'COMPLETED' },
        });

        return log;
    });

    // Award C-Index points
    const { awardCompletionPoints } = await import('../lib/c-index.js');
    await awardCompletionPoints(logistics.order_id);

    return c.json({ ...updated, carrier_id: updated.carrier_id?.toString() });
});

// GET /api/logistics/route — Generate Google Maps deep link
logisticsRouter.get('/route', async (c) => {
    const pickup = c.req.query('pickup');
    const dropoff = c.req.query('dropoff');

    if (!pickup || !dropoff) {
        return c.json({ error: 'pickup and dropoff query params required' }, 400);
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(dropoff)}&travelmode=driving`;

    return c.json({ url: mapsUrl });
});

// GET /api/logistics/my — Current user's deliveries
logisticsRouter.get('/my', async (c) => {
    const userId = c.get('userId') as bigint;

    const deliveries = await prisma.logistics.findMany({
        where: { carrier_id: userId },
        include: {
            order: {
                select: { id: true, status: true, total_price: true },
                include: {
                    offer: { select: { title: true } },
                    buyer: { select: { tg_id: true, name: true } },
                },
            },
        },
        orderBy: { order: { created_at: 'desc' } },
    });

    return c.json(deliveries.map((d) => ({
        ...d,
        carrier_id: d.carrier_id?.toString(),
        order: {
            ...d.order,
            buyer: { ...d.order.buyer, tg_id: d.order.buyer.tg_id.toString() },
        },
    })));
});
