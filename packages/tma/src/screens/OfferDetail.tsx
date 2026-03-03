import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { getTgUser } from '../lib/telegram';
import { ORDER_STATUS } from '../lib/constants';

export default function OfferDetail() {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [offer, setOffer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showOrder, setShowOrder] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [paymentMode, setPaymentMode] = useState('FACT');
    const [ordering, setOrdering] = useState(false);

    useEffect(() => {
        if (id) loadOffer();
    }, [id]);

    async function loadOffer() {
        try {
            const data = await api.getOffer(id!);
            setOffer(data);
            // Default to PREPAY for pools
            if (data.type === 'POOL') setPaymentMode('PREPAY_PATH_A');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleOrder() {
        setOrdering(true);
        try {
            await api.createOrder({
                offer_id: id,
                quantity,
                payment_mode: paymentMode,
            });
            setShowOrder(false);
            loadOffer();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setOrdering(false);
        }
    }

    if (loading) {
        return (
            <div className="page">
                <div className="skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 40, borderRadius: 12, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
            </div>
        );
    }

    if (!offer) return <div className="page"><p>{t('error')}</p></div>;

    const poolPercent = offer.type === 'POOL' && offer.target_quantity
        ? Math.min(100, (Number(offer.current_quantity) / Number(offer.target_quantity)) * 100)
        : 0;

    const tgUser = getTgUser();
    const isOwner = tgUser?.id?.toString() === offer.producer?.tg_id?.toString();

    async function handleDelete() {
        if (!window.confirm(t('confirm_delete'))) return;
        try {
            await api.deleteOffer(id!);
            navigate(-1);
        } catch (err: any) {
            alert(err.message);
        }
    }

    return (
        <div className="page">

            <div className="glass-card p-5 mb-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: 24 }}>{offer.type === 'POOL' ? '👥' : '🛒'}</span>
                    <h1 className="text-xl font-bold">{offer.title}</h1>
                </div>

                <p className="mb-4" style={{ color: 'var(--tg-hint)', lineHeight: 1.6 }}>{offer.description}</p>

                <div className="flex items-center justify-between mb-3">
                    <span style={{ color: 'var(--tg-hint)' }}>{t('price')}</span>
                    <span className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{offer.price} ₴</span>
                </div>

                {/* Producer */}
                <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--glass-bg)' }}>
                        👤
                    </div>
                    <div>
                        <div className="font-medium">{offer.producer?.name}</div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--tg-hint)' }}>
                            <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: 10 }}>
                                ⭐S {offer.producer?.c_index || 0}
                            </span>
                            {offer.producer?.username && <span>@{offer.producer.username}</span>}
                        </div>
                    </div>
                </div>

                {/* Community */}
                {offer.community && (
                    <div className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--tg-hint)' }}>
                        <span>🏘️</span>
                        <span>{offer.community.name}</span>
                        <span>·</span>
                        <span>📍 {offer.community.location_tags}</span>
                    </div>
                )}

                {/* Pool Progress */}
                {offer.type === 'POOL' && offer.target_quantity && (
                    <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(108, 92, 231, 0.1)' }}>
                        <div className="flex justify-between text-sm mb-2">
                            <span>{t('progress')}</span>
                            <span className="font-semibold">{offer.current_quantity} / {offer.target_quantity}</span>
                        </div>
                        <div className="progress-bar" style={{ height: 10 }}>
                            <div className="progress-bar-fill" style={{ width: `${poolPercent}%` }} />
                        </div>
                        <div className="text-xs mt-1 text-right" style={{ color: 'var(--accent-light)' }}>
                            {poolPercent.toFixed(0)}%
                        </div>
                    </div>
                )}
            </div>

            {/* Main Action Button */}
            {isOwner ? (
                <button className="btn-danger w-full" style={{ fontSize: 16, padding: '14px', background: 'var(--danger)', color: '#fff', borderRadius: 12, border: 'none', fontWeight: 600 }} onClick={handleDelete}>
                    🗑️ {t('delete_offer')}
                </button>
            ) : !showOrder ? (
                <button className="btn-primary w-full" style={{ fontSize: 16, padding: '14px' }} onClick={() => setShowOrder(true)}>
                    {t('order_now')} 🛒
                </button>
            ) : (
                <div className="glass-card p-4 animate-fade-in">
                    <h3 className="font-semibold mb-3">{t('place_order')}</h3>

                    <label className="block text-sm mb-1" style={{ color: 'var(--tg-hint)' }}>{t('quantity')}</label>
                    <input
                        type="number"
                        className="input-field mb-3"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                    />

                    <label className="block text-sm mb-1" style={{ color: 'var(--tg-hint)' }}>{t('payment_method')}</label>
                    <select
                        className="input-field mb-3"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                    >
                        {offer.type !== 'POOL' && <option value="FACT">{t('payment_fact')}</option>}
                        {offer.type !== 'POOL' && <option value="PREORDER">{t('payment_preorder')}</option>}
                        <option value="PREPAY_PATH_A">{t('payment_prepay_a')}</option>
                        <option value="PREPAY_PATH_B">{t('payment_prepay_b')}</option>
                    </select>

                    <div className="flex justify-between items-center mb-4 p-3 rounded-xl" style={{ background: 'rgba(0, 206, 201, 0.1)' }}>
                        <span>{t('total')}</span>
                        <span className="text-xl font-bold" style={{ color: 'var(--success)' }}>
                            {(Number(offer.price) * quantity).toFixed(2)} ₴
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <button className="btn-secondary flex-1" onClick={() => setShowOrder(false)}>{t('cancel')}</button>
                        <button className="btn-primary flex-1" onClick={handleOrder} disabled={ordering}>
                            {ordering ? '⏳' : '✅'} {t('place_order')}
                        </button>
                    </div>
                </div>
            )}

            {/* Orders for this offer */}
            {offer.orders && offer.orders.length > 0 && (
                <div className="mt-4">
                    <h3 className="font-semibold mb-2">{t('orders')} ({offer.orders.length})</h3>
                    {offer.orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="glass-card p-3 mb-2" style={{ transform: 'none', boxShadow: 'none' }}>
                            <div className="flex justify-between text-sm">
                                <span className="badge badge-accent">{ORDER_STATUS[order.status] || order.status}</span>
                                <span style={{ color: 'var(--tg-hint)' }}>x{order.quantity}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
