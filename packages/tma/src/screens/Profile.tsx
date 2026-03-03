import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { getTgUser } from '../lib/telegram';
import { ORDER_STATUS } from '../lib/constants';

export default function Profile() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [reputation, setReputation] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', bio: '' });
    const tgUser = getTgUser();

    useEffect(() => { load(); }, []);

    // No per-screen BackButton — managed globally by App.tsx TelegramBackButton

    async function load() {
        setLoading(true);
        try {
            const [me, rep, ord] = await Promise.all([
                api.getMe(),
                api.getMyReputation(),
                api.getOrders(),
            ]);
            setUser(me);
            setReputation(rep);
            setOrders(ord);
            setForm({ name: me.name, bio: me.bio || '' });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    async function handleSave() {
        try {
            await api.updateMe(form);
            setEditing(false);
            load();
        } catch (err: any) { alert(err.message); }
    }

    async function toggleRole(field: 'is_producer' | 'is_consumer') {
        if (!user) return;
        const newValue = !user[field];
        // Don't allow both off
        if (!newValue && field === 'is_consumer' && !user.is_producer) return;
        if (!newValue && field === 'is_producer' && !user.is_consumer) return;

        try {
            await api.updateMe({ [field]: newValue });
            load();
        } catch (err: any) { alert(err.message); }
    }

    if (loading) return (
        <div className="page">
            <div className="skeleton" style={{ height: 180, borderRadius: 16, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 100, borderRadius: 16 }} />
        </div>
    );

    if (!user) return <div className="page"><p style={{ color: 'var(--tg-hint)', textAlign: 'center', paddingTop: 40 }}>⚠️ {t('error')}</p></div>;

    const avatarUrl = tgUser?.photo_url;
    const isProducer = user.is_producer ?? user.role === 'PRODUCER';
    const isConsumer = user.is_consumer ?? true;

    return (
        <div className="page">
            <h1 className="page-header">👤 {t('my_profile')}</h1>

            <div className="glass-card p-5 mb-4 animate-fade-in">
                {!editing ? (
                    <>
                        {/* Avatar + Name */}
                        <div className="flex items-center gap-4 mb-4">
                            <div style={{ flexShrink: 0 }}>
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={user.name}
                                        style={{
                                            width: 64, height: 64, borderRadius: '50%',
                                            objectFit: 'cover',
                                            boxShadow: '0 4px 16px rgba(108,92,231,0.35)',
                                            border: '2px solid var(--accent)',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 64, height: 64, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 28,
                                        background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                                        boxShadow: '0 4px 16px rgba(108,92,231,0.3)',
                                    }}>
                                        👤
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold truncate">{user.name}</h2>
                                {user.username && <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>@{user.username}</p>}
                            </div>
                        </div>

                        {user.bio && <p className="text-sm mb-4" style={{ color: 'var(--tg-hint)' }}>{user.bio}</p>}

                        {/* ⚡ Dual Role Toggles */}
                        <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="text-xs font-medium mb-2" style={{ color: 'var(--tg-hint)' }}>{t('role')}</div>
                            <div className="flex flex-col gap-2">
                                {/* Consumer toggle */}
                                <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg" style={{ background: isConsumer ? 'rgba(0,206,201,0.1)' : 'transparent' }}>
                                    <span className="flex items-center gap-2">
                                        <span>🛒</span>
                                        <span className="text-sm font-medium">{t('consumer')}</span>
                                    </span>
                                    <div
                                        onClick={() => toggleRole('is_consumer')}
                                        style={{
                                            width: 44, height: 24, borderRadius: 12,
                                            background: isConsumer ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                                            position: 'relative', cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: '#fff',
                                            position: 'absolute', top: 2,
                                            left: isConsumer ? 22 : 2,
                                            transition: 'left 0.2s',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                        }} />
                                    </div>
                                </label>

                                {/* Producer toggle */}
                                <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg" style={{ background: isProducer ? 'rgba(108,92,231,0.1)' : 'transparent' }}>
                                    <span className="flex items-center gap-2">
                                        <span>🏭</span>
                                        <span className="text-sm font-medium">{t('switch_to_producer')}</span>
                                    </span>
                                    <div
                                        onClick={() => toggleRole('is_producer')}
                                        style={{
                                            width: 44, height: 24, borderRadius: 12,
                                            background: isProducer ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                            position: 'relative', cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: '#fff',
                                            position: 'absolute', top: 2,
                                            left: isProducer ? 22 : 2,
                                            transition: 'left 0.2s',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                        }} />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* S-Index Badge */}
                        <div className="p-4 rounded-xl mb-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,201,0.15))' }}>
                            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-light)' }}>⭐ {reputation?.c_index || 0}</div>
                            <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>{t('s_index')}</div>
                            <div className="text-xs mt-1" style={{ color: 'var(--tg-hint)', opacity: 0.7 }}>{t('s_index_description')}</div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {[
                                { val: user._count?.offers || 0, label: t('my_offers') },
                                { val: user._count?.orders || 0, label: t('my_orders') },
                                { val: user._count?.subscriptions || 0, label: t('subscriptions') },
                                { val: user._count?.subscribers || 0, label: t('subscribers') },
                            ].map((s) => (
                                <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <div className="text-lg font-bold">{s.val}</div>
                                    <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button className="btn-secondary flex-1" onClick={() => setEditing(true)}>✏️ {t('edit_profile')}</button>
                            {isProducer && (
                                <button className="btn-primary flex-1" onClick={() => navigate('/dashboard')}>📊 {t('crm_dashboard')}</button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-sm mb-1 font-medium">{t('name')}</label>
                            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm mb-1 font-medium">{t('bio')}</label>
                            <textarea className="input-field" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                            <button className="btn-secondary flex-1" onClick={() => setEditing(false)}>{t('cancel')}</button>
                            <button className="btn-primary flex-1" onClick={handleSave}>💾 {t('save')}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Orders */}
            {orders.length > 0 && (
                <div className="mb-4">
                    <h3 className="font-semibold mb-2">{t('my_orders')}</h3>
                    <div className="flex flex-col gap-2">
                        {orders.slice(0, 5).map((o) => (
                            <div key={o.id} className="glass-card p-3" style={{ transform: 'none' }}>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-sm">{o.offer?.title}</span>
                                    <span className={`badge ${o.status === 'COMPLETED' ? 'badge-success' : o.status === 'DISPUTED' ? 'badge-danger' : 'badge-accent'}`} style={{ fontSize: 10 }}>
                                        {ORDER_STATUS[o.status] || o.status}
                                    </span>
                                </div>
                                <div className="text-xs mt-1" style={{ color: 'var(--tg-hint)' }}>
                                    {o.total_price} ₴ · x{o.quantity}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* S-Index History */}
            {reputation?.history && reputation.history.length > 0 && (
                <div className="mt-4">
                    <h3 className="font-semibold mb-2">📊 {t('s_index')} — Історія</h3>
                    <div className="flex flex-col gap-2">
                        {reputation.history.slice(0, 10).map((entry: any) => (
                            <div key={entry.id} className="glass-card p-3 flex justify-between items-center" style={{ transform: 'none' }}>
                                <span className="text-sm">{entry.reason}</span>
                                <span className={`font-bold ${entry.points_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {entry.points_change > 0 ? '+' : ''}{entry.points_change}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
