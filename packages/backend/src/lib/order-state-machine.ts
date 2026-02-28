import { OrderStatus, PaymentMode } from '@prisma/client';

/**
 * Order Status State Machine — defines valid transitions and business rules.
 * 
 * Payment Routing:
 * - Path A (Direct P2P): Trusted producers (high C-Index) — PREPAY_PATH_A
 * - Path B (Escrow): New producers via Community Treasurer — PREPAY_PATH_B
 * - FACT: Pay on delivery
 * - PREORDER: Reserve, pay later
 */

type StatusTransition = {
    from: OrderStatus;
    to: OrderStatus;
    condition?: string;
};

const VALID_TRANSITIONS: StatusTransition[] = [
    // Creation flow
    { from: 'CREATED', to: 'FUNDING', condition: 'Pool offer collecting orders' },
    { from: 'CREATED', to: 'AWAITING_PAYMENT', condition: 'Individual offer or pool reached target' },

    // Funding (Pool)
    { from: 'FUNDING', to: 'AWAITING_PAYMENT', condition: 'Pool target reached' },

    // Payment flow
    { from: 'AWAITING_PAYMENT', to: 'PAID', condition: 'Payment confirmed by producer or treasurer' },

    // Production flow
    { from: 'PAID', to: 'IN_PROGRESS', condition: 'Producer started working' },
    { from: 'CREATED', to: 'IN_PROGRESS', condition: 'FACT payment — work starts immediately' },

    // Logistics flow
    { from: 'IN_PROGRESS', to: 'READY_FOR_LOGISTICS', condition: 'Order ready for pickup' },
    { from: 'READY_FOR_LOGISTICS', to: 'IN_TRANSIT', condition: 'Carrier picked up' },
    { from: 'IN_TRANSIT', to: 'COMPLETED', condition: 'Delivered and confirmed' },

    // Direct completion (no logistics needed)
    { from: 'IN_PROGRESS', to: 'COMPLETED', condition: 'Pickup by buyer / digital delivery' },
    { from: 'READY_FOR_LOGISTICS', to: 'COMPLETED', condition: 'Buyer picked up directly' },

    // Dispute
    { from: 'CREATED', to: 'DISPUTED' },
    { from: 'FUNDING', to: 'DISPUTED' },
    { from: 'AWAITING_PAYMENT', to: 'DISPUTED' },
    { from: 'PAID', to: 'DISPUTED' },
    { from: 'IN_PROGRESS', to: 'DISPUTED' },
    { from: 'READY_FOR_LOGISTICS', to: 'DISPUTED' },
    { from: 'IN_TRANSIT', to: 'DISPUTED' },
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getValidNextStatuses(current: OrderStatus): OrderStatus[] {
    return VALID_TRANSITIONS.filter((t) => t.from === current).map((t) => t.to);
}

/**
 * Determine initial status based on offer type and payment mode
 */
export function getInitialStatus(offerType: string, paymentMode: PaymentMode): OrderStatus {
    if (offerType === 'POOL') {
        return 'FUNDING';
    }
    if (paymentMode === 'FACT') {
        return 'CREATED'; // Will transition to IN_PROGRESS when producer accepts
    }
    return 'AWAITING_PAYMENT';
}

/**
 * Determine payment path based on producer's C-Index
 */
export function getPaymentPath(cIndex: number): 'PREPAY_PATH_A' | 'PREPAY_PATH_B' {
    // Trusted producers (C-Index >= 50) get direct payments (Path A)
    // New/untrusted producers go through Escrow (Path B)
    return cIndex >= 50 ? 'PREPAY_PATH_A' : 'PREPAY_PATH_B';
}
