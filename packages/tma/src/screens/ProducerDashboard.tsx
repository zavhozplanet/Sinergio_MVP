import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_MAP: Record<string, string> = {
    CREATED: 'Створено',
    PENDING: 'Очікує',
    FUNDING: 'Збір коштів',
    AWAITING_PAYMENT: 'Очікує оплати',
    PAID: 'Оплачено',
    IN_PROGRESS: 'В процесі',
    READY_FOR_LOGISTICS: 'Готово до відправки',
    COMPLETED: 'Завершено',
    DISPUTED: 'Вирішення питань',
};

export default function ProducerDashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('all');

    useEffect(() => { load(); }, [filter]);

    async function load() {
        setLoading(true);
        try {
            const [ord, off] = await Promise.all([
                api.getProducerOrders(filter !== 'all' ? filter : undefined),
                api.getMyOffers(),
            ]);
            setOrders(ord);
            setOffers(off);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    function toggleSelect(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleBulkConfirm() {
        try {
            await api.bulkConfirmPayments(Array.from(selected));
            setSelected(new Set());
            load();
        } catch (err: any) { alert(err.message); }
    }

    async function updateStatus(orderId: string, status: string) {
        try {
            await api.updateOrderStatus(orderId, status);
            load();
        } catch (err: any) { alert(err.message); }
    }

    const awaitingPayment = orders.filter((o) => o.status === 'AWAITING_PAYMENT');

    return (
        <div className="page">
            <h1 className="page-header">📊 {t('crm_dashboard')}</h1>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="glass-card p-3 text-center" style={{ transform: 'none' }}>
                    <div className="text-lg font-bold" style={{ color: 'var(--accent-light)' }}>{offers.length}</div>
                    <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>{t('my_offers')}</div>
                </div>
                <div className="glass-card p-3 text-center" style={{ transform: 'none' }}>
                    <div className="text-lg font-bold" style={{ color: 'var(--success)' }}>{orders.filter((o) => o.status === 'COMPLETED').length}</div>
                    <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>Виконано</div>
                </div>
                <div className="glass-card p-3 text-center" style={{ transform: 'none' }}>
                    <div className="text-lg font-bold" style={{ color: 'var(--warning)' }}>{orders.filter((o) => !['COMPLETED', 'DISPUTED'].includes(o.status)).length}</div>
                    <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>В роботі</div>
                </div>
            </div>

            {/* Bulk Confirm */}
            {awaitingPayment.length > 0 && (
                <div className="glass-card p-4 mb-4 animate-fade-in" style={{ background: 'rgba(253, 203, 110, 0.05)', borderColor: 'rgba(253, 203, 110, 0.2)' }}>
                    <h3 className="font-semibold mb-2">💰 {t('bulk_confirm')} ({awaitingPayment.length})</h3>
                    <div className="flex flex-col gap-2 mb-3">
                        {awaitingPayment.map((o) => (
                            <label key={o.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                                <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="w-4 h-4" />
                                <span className="text-sm flex-1">{o.offer?.title} — {o.buyer?.name}</span>
                                <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>{o.total_price} ₴</span>
                            </label>
                        ))}
                    </div>
                    <button className="btn-primary w-full" onClick={handleBulkConfirm} disabled={selected.size === 0}>
                        ✅ {t('confirm_payment')} ({selected.size})
                    </button>
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {['all', 'CREATED', 'FUNDING', 'AWAITING_PAYMENT', 'PAID', 'IN_PROGRESS', 'READY_FOR_LOGISTICS', 'COMPLETED'].map((status) => (
                    <button
                        key={status}
                        className={`badge ${filter === status ? 'badge-accent' : ''}`}
                        style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 11 }}
                        onClick={() => setFilter(status)}
                    >
                        {STATUS_MAP[status] || (status === 'all' ? t('all') : status)}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--tg-hint)' }}>
                    <p>Немає замовлень</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {orders.map((o) => (
                        <div key={o.id} className="glass-card p-3" style={{ transform: 'none' }}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-medium text-sm">{o.offer?.title}</span>
                                    <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                                        👤 {o.buyer?.name} · x{o.quantity}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-sm" style={{ color: 'var(--success)' }}>{o.total_price} ₴</div>
                                    <span className={`badge ${o.status === 'COMPLETED' ? 'badge-success' : o.status === 'DISPUTED' ? 'badge-danger' : 'badge-accent'}`} style={{ fontSize: 9 }}>
                                        {STATUS_MAP[o.status] || o.status}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                                {o.status === 'PAID' && (
                                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => updateStatus(o.id, 'IN_PROGRESS')}>
                                        🔨 В роботу
                                    </button>
                                )}
                                {o.status === 'IN_PROGRESS' && (
                                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => updateStatus(o.id, 'READY_FOR_LOGISTICS')}>
                                        📦 Готово
                                    </button>
                                )}
                                {['CREATED', 'PAID', 'IN_PROGRESS'].includes(o.status) && (
                                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11, color: 'var(--success)' }} onClick={() => updateStatus(o.id, 'COMPLETED')}>
                                        ✅ Завершити
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
