import { prisma } from './prisma.js';

/**
 * C-Index (Cooperative Index) — Reputation Engine
 * 
 * Rules:
 * - +10 points on order COMPLETED (for producer)
 * - +5 points on order COMPLETED (for buyer — rewarding participation)
 * - +3 points for completing a delivery (carrier)
 * - DISPUTED: freeze C-index (no changes allowed)
 * - Unresolved scam: drop C-Index to 0
 */

export async function awardCompletionPoints(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            offer: { select: { producer_id: true } },
            logistics: { select: { carrier_id: true } },
        },
    });

    if (!order) return;

    const entries = [
        // Producer gets +10
        {
            user_id: order.offer.producer_id,
            points_change: 10,
            reason: 'Order completed as producer',
            order_id: orderId,
        },
        // Buyer gets +5
        {
            user_id: order.buyer_id,
            points_change: 5,
            reason: 'Order completed as buyer',
            order_id: orderId,
        },
    ];

    // Carrier gets +3 if logistics was involved
    if (order.logistics?.carrier_id) {
        entries.push({
            user_id: order.logistics.carrier_id,
            points_change: 3,
            reason: 'Delivery completed as carrier',
            order_id: orderId,
        });
    }

    // Create ledger entries and update user c_index atomically
    await prisma.$transaction(async (tx) => {
        for (const entry of entries) {
            await tx.cIndexLedger.create({ data: entry });
            await tx.user.update({
                where: { tg_id: entry.user_id },
                data: { c_index: { increment: entry.points_change } },
            });
        }
    });
}

export async function handleDispute(orderId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: orderId },
            data: { status: 'DISPUTED', is_disputed: true },
        });

        // Log dispute in ledger (no points change — freeze)
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { offer: { select: { producer_id: true } } },
        });
        if (!order) return;

        await tx.cIndexLedger.create({
            data: {
                user_id: order.offer.producer_id,
                points_change: 0,
                reason: 'Order disputed — C-Index frozen',
                order_id: orderId,
            },
        });
    });
}

export async function handleScam(userId: bigint, orderId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
        // Drop C-Index to 0
        const user = await tx.user.findUnique({ where: { tg_id: userId } });
        if (!user) return;

        await tx.user.update({
            where: { tg_id: userId },
            data: { c_index: 0 },
        });

        await tx.cIndexLedger.create({
            data: {
                user_id: userId,
                points_change: -user.c_index,
                reason: 'Scam confirmed — C-Index reset to 0',
                order_id: orderId,
            },
        });
    });
}
