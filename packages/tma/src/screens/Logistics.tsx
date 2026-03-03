import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { LOGISTICS_STATUS } from '../lib/constants';

export default function Logistics() {
    const { t } = useTranslation();
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'available' | 'my'>('available');

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [avail, mine] = await Promise.all([
                api.getAvailableDeliveries(),
                api.getMyDeliveries(),
            ]);
            setDeliveries(avail);
            setMyDeliveries(mine);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    async function handlePickup(logisticsId: string) {
        try {
            await api.pickupDelivery(logisticsId);
            load();
        } catch (err: any) { alert(err.message); }
    }

    async function handleDeliver(logisticsId: string) {
        try {
            await api.deliverDelivery(logisticsId);
            load();
        } catch (err: any) { alert(err.message); }
    }

    async function openRoute(pickup: string, dropoff: string) {
        try {
            const { url } = await api.getRoute(pickup, dropoff);
            window.open(url, '_blank');
        } catch (err: any) { alert(err.message); }
    }

    return (
        <div className="page">
            <h1 className="page-header">📦 {t('logistics')}</h1>

            <div className="flex gap-2 mb-4">
                <button className={`badge ${tab === 'available' ? 'badge-accent' : ''}`} style={{ cursor: 'pointer', padding: '8px 16px' }} onClick={() => setTab('available')}>
                    {t('available_deliveries')}
                </button>
                <button className={`badge ${tab === 'my' ? 'badge-accent' : ''}`} style={{ cursor: 'pointer', padding: '8px 16px' }} onClick={() => setTab('my')}>
                    {t('my_deliveries')}
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
                </div>
            ) : tab === 'available' ? (
                deliveries.length === 0 ? (
                    <div className="text-center py-12" style={{ color: 'var(--tg-hint)' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                        <p>{t('no_deliveries')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {deliveries.map((order, idx) => (
                            <div key={order.id} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold">{order.offer?.title}</h3>
                                    <span className="badge badge-success">{order.total_price} ₴</span>
                                </div>

                                <div className="text-sm mb-2" style={{ color: 'var(--tg-hint)' }}>
                                    <div>👤 {t('buyer')}: {order.buyer?.name}</div>
                                    <div>🏭 {t('producer')}: {order.offer?.producer?.name}</div>
                                </div>

                                {order.logistics && (
                                    <div className="text-sm mb-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <div>📍 {t('pickup')}: {order.logistics.pickup_location}</div>
                                        <div>🏠 {t('deliver')}: {order.logistics.dropoff_location}</div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {order.logistics && (
                                        <>
                                            <button className="btn-primary flex-1" onClick={() => handlePickup(order.logistics.id)}>
                                                🚗 {t('pickup')}
                                            </button>
                                            <button className="btn-secondary flex-1" onClick={() => openRoute(order.logistics.pickup_location, order.logistics.dropoff_location)}>
                                                🗺️ {t('build_route')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                myDeliveries.length === 0 ? (
                    <div className="text-center py-12" style={{ color: 'var(--tg-hint)' }}>
                        <p>{t('no_my_deliveries')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {myDeliveries.map((d) => (
                            <div key={d.id} className="glass-card p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">{d.order?.offer?.title}</h3>
                                    <span className={`badge ${d.status === 'DELIVERED' ? 'badge-success' : 'badge-warning'}`}>{LOGISTICS_STATUS[d.status] || d.status}</span>
                                </div>
                                <div className="text-sm" style={{ color: 'var(--tg-hint)' }}>
                                    <div>📍 {d.pickup_location} → 🏠 {d.dropoff_location}</div>
                                </div>
                                {d.status === 'PICKED_UP' && (
                                    <button className="btn-primary w-full mt-2" onClick={() => handleDeliver(d.id)}>
                                        ✅ {t('deliver')}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
