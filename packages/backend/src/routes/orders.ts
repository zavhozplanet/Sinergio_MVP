import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { canTransition, getInitialStatus, getValidNextStatuses } from '../lib/order-state-machine.js';
import { awardCompletionPoints, handleDispute } from '../lib/c-index.js';
import { OrderStatus } from '@prisma/client';

export const ordersRouter = new Hono();

const createOrderSchema = z.object({
    offer_id: z.string().uuid(),
    quantity: z.number().positive(),
    payment_mode: z.enum(['FACT', 'PREORDER', 'PREPAY_PATH_A', 'PREPAY_PATH_B']),
});

// GET /api/orders — List orders for current user (as buyer)
ordersRouter.get('/', async (c) => {
    const userId = c.get('userId') as bigint;
    const status = c.req.query('status') as OrderStatus | undefined;

    const where: any = { buyer_id: userId };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
        where,
        include: {
            offer: { select: { id: true, title: true, price: true, type: true, producer_id: true } },
            logistics: true,
        },
        orderBy: { created_at: 'desc' },
    });

    return c.json(orders.map(serializeOrder));
});

// GET /api/orders/producer — Orders for producer's offers
ordersRouter.get('/producer', async (c) => {
    const userId = c.get('userId') as bigint;
    const status = c.req.query('status') as OrderStatus | undefined;

    const where: any = { offer: { producer_id: userId } };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
        where,
        include: {
            offer: { select: { id: true, title: true, price: true, type: true } },
            buyer: { select: { tg_id: true, name: true, username: true } },
            logistics: true,
        },
        orderBy: { created_at: 'desc' },
    });

    return c.json(orders.map(serializeOrder));
});

// POST /api/orders — Create order
ordersRouter.post('/', async (c) => {
    const userId = c.get('userId') as bigint;
    const body = await c.req.json();
    const data = createOrderSchema.parse(body);

    const offer = await prisma.offer.findUnique({
        where: { id: data.offer_id },
        include: { producer: { select: { c_index: true } } },
    });

    if (!offer) return c.json({ error: 'Offer not found' }, 404);
    if (!offer.is_active) return c.json({ error: 'Offer is not active' }, 400);
    if (offer.producer_id === userId) return c.json({ error: 'Cannot order your own offer' }, 400);

    // Pool offers only allow PREPAY modes
    if (offer.type === 'POOL' && !['PREPAY_PATH_A', 'PREPAY_PATH_B'].includes(data.payment_mode)) {
        return c.json({ error: 'Pool offers only accept PREPAY payment modes' }, 400);
    }

    const totalPrice = Number(offer.price) * data.quantity;
    const initialStatus = getInitialStatus(offer.type, data.payment_mode);

    const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
            data: {
                offer_id: data.offer_id,
                buyer_id: userId,
                quantity: data.quantity,
                total_price: totalPrice,
                payment_mode: data.payment_mode,
                status: initialStatus,
            },
            include: {
                offer: { select: { id: true, title: true, price: true, type: true } },
            },
        });

        // Update pool progress
        if (offer.type === 'POOL') {
            const updatedOffer = await tx.offer.update({
                where: { id: data.offer_id },
                data: { current_quantity: { increment: data.quantity } },
            });

            // If pool target reached, transition all FUNDING orders to AWAITING_PAYMENT
            if (offer.target_quantity && Number(updatedOffer.current_quantity) >= Number(offer.target_quantity)) {
                await tx.order.updateMany({
                    where: { offer_id: data.offer_id, status: 'FUNDING' },
                    data: { status: 'AWAITING_PAYMENT' },
                });
            }
        }

        return newOrder;
    });

    return c.json(serializeOrder(order), 201);
});

// PATCH /api/orders/:id/status — Transition order status
ordersRouter.patch('/:id/status', async (c) => {
    const userId = c.get('userId') as bigint;
    const orderId = c.req.param('id');
    const body = await c.req.json();
    const newStatus = body.status as OrderStatus;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { offer: { select: { producer_id: true } } },
    });

    if (!order) return c.json({ error: 'Order not found' }, 404);

    // Only buyer or producer can change status
    if (order.buyer_id !== userId && order.offer.producer_id !== userId) {
        return c.json({ error: 'Not authorized' }, 403);
    }

    if (!canTransition(order.status, newStatus)) {
        return c.json({
            error: 'Invalid status transition',
            current: order.status,
            requested: newStatus,
            valid: getValidNextStatuses(order.status),
        }, 400);
    }

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
    });

    // Award C-Index points on completion
    if (newStatus === 'COMPLETED') {
        await awardCompletionPoints(orderId);
    }

    // Handle dispute
    if (newStatus === 'DISPUTED') {
        await handleDispute(orderId);
    }

    return c.json(serializeOrder(updated));
});

// POST /api/orders/bulk-confirm — Bulk confirm payments (Producer CRM)
ordersRouter.post('/bulk-confirm', async (c) => {
    const userId = c.get('userId') as bigint;
    const body = await c.req.json();
    const orderIds: string[] = body.order_ids;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return c.json({ error: 'order_ids array required' }, 400);
    }

    // Verify all orders belong to this producer's offers and are in AWAITING_PAYMENT
    const orders = await prisma.order.findMany({
        where: {
            id: { in: orderIds },
            offer: { producer_id: userId },
            status: 'AWAITING_PAYMENT',
        },
    });

    if (orders.length === 0) {
        return c.json({ error: 'No valid orders found' }, 400);
    }

    const result = await prisma.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { status: 'PAID' },
    });

    return c.json({ confirmed: result.count });
});

// GET /api/orders/:id — Order detail
ordersRouter.get('/:id', async (c) => {
    const orderId = c.req.param('id');

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            offer: {
                include: {
                    producer: { select: { tg_id: true, name: true, username: true, c_index: true } },
                },
            },
            buyer: { select: { tg_id: true, name: true, username: true } },
            logistics: true,
            reputation_log: true,
        },
    });

    if (!order) return c.json({ error: 'Order not found' }, 404);

    return c.json(serializeOrder(order));
});

function serializeOrder(order: any) {
    return {
        ...order,
        buyer_id: order.buyer_id?.toString(),
        buyer: order.buyer ? { ...order.buyer, tg_id: order.buyer.tg_id.toString() } : undefined,
        offer: order.offer ? {
            ...order.offer,
            producer_id: order.offer.producer_id?.toString(),
            producer: order.offer.producer ? { ...order.offer.producer, tg_id: order.offer.producer.tg_id.toString() } : undefined,
        } : undefined,
        logistics: order.logistics ? {
            ...order.logistics,
            carrier_id: order.logistics.carrier_id?.toString(),
        } : undefined,
        reputation_log: order.reputation_log?.map((l: any) => ({
            ...l,
            user_id: l.user_id.toString(),
        })),
    };
}
