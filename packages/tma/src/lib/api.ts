const API_BASE = '/api';

function getInitData(): string {
    try {
        const tg = (window as any).Telegram?.WebApp;
        return tg?.initData || '';
    } catch {
        return '';
    }
}

function getDevToken(): string {
    // If we're not inside Telegram (no initData), use a dev bearer token so the app works in laptop browser
    if (!getInitData() && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'Bearer tg:123456789'; // Dummy user ID for dev
    }
    return '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const initData = getInitData();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
    } else {
        const devToken = getDevToken();
        if (devToken) headers['Authorization'] = devToken;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
}

export const api = {
    // Users
    getMe: () => request<any>('/users/me'),
    updateMe: (data: any) => request<any>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
    getUser: (id: string) => request<any>(`/users/${id}`),

    // Communities
    getCommunities: (search?: string) =>
        request<any[]>(`/communities${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    getCommunity: (id: string) => request<any>(`/communities/${id}`),
    createCommunity: (data: any) =>
        request<any>('/communities', { method: 'POST', body: JSON.stringify(data) }),
    joinCommunity: (id: string) => request<any>(`/communities/${id}/join`, { method: 'POST' }),
    leaveCommunity: (id: string) => request<any>(`/communities/${id}/leave`, { method: 'POST' }),

    // Offers
    getOffers: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return request<{ data: any[]; pagination: any }>(`/offers${query}`);
    },
    getOffer: (id: string) => request<any>(`/offers/${id}`),
    createOffer: (data: any) =>
        request<any>('/offers', { method: 'POST', body: JSON.stringify(data) }),
    deleteOffer: (id: string) =>
        request<any>(`/offers/${id}`, { method: 'DELETE' }),
    getMyOffers: () => request<any[]>('/offers/my/list'),

    // Orders
    getOrders: (status?: string) =>
        request<any[]>(`/orders${status ? `?status=${status}` : ''}`),
    getProducerOrders: (status?: string) =>
        request<any[]>(`/orders/producer${status ? `?status=${status}` : ''}`),
    createOrder: (data: any) =>
        request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    updateOrderStatus: (id: string, status: string) =>
        request<any>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    bulkConfirmPayments: (orderIds: string[]) =>
        request<any>('/orders/bulk-confirm', { method: 'POST', body: JSON.stringify({ order_ids: orderIds }) }),

    // Logistics
    getAvailableDeliveries: () => request<any[]>('/logistics/available'),
    pickupDelivery: (id: string) => request<any>(`/logistics/${id}/pickup`, { method: 'POST' }),
    deliverDelivery: (id: string) => request<any>(`/logistics/${id}/deliver`, { method: 'POST' }),
    getRoute: (pickup: string, dropoff: string) =>
        request<{ url: string }>(`/logistics/route?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}`),
    getMyDeliveries: () => request<any[]>('/logistics/my'),

    // Subscriptions
    getSubscriptions: () => request<any[]>('/subscriptions'),
    subscribe: (producerId: string) => request<any>(`/subscriptions/${producerId}`, { method: 'POST' }),
    unsubscribe: (producerId: string) => request<any>(`/subscriptions/${producerId}`, { method: 'DELETE' }),

    // Reputation
    getMyReputation: () => request<any>('/reputation/me'),
    getLeaderboard: () => request<any[]>('/reputation/leaderboard'),

    // AI
    aiMatch: (need: string) =>
        request<{ matches: any[] }>('/ai/match', { method: 'POST', body: JSON.stringify({ need }) }),
    aiSummary: (communityId: string) =>
        request<{ summary: string }>('/ai/summary', { method: 'POST', body: JSON.stringify({ community_id: communityId }) }),
    aiSmartCart: () => request<{ suggestions: any[] }>('/ai/smart-cart'),
};
