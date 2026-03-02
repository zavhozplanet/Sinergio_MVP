import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function Profile() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [reputation, setReputation] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', bio: '', role: '' });

    useEffect(() => { load(); }, []);

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
            setForm({ name: me.name, bio: me.bio || '', role: me.role });
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

    if (loading) return (
        <div className="page">
            <div className="skeleton" style={{ height: 180, borderRadius: 16, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 100, borderRadius: 16 }} />
        </div>
    );

    if (!user) return <div className="page"><p>{t('error')}</p></div>;

    return (
        <div className="page">
            <h1 className="page-header">👤 {t('my_profile')}</h1>

            {/* Profile Card */}
            <div className="glass-card p-5 mb-4 animate-fade-in">
                {!editing ? (
                    <>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', boxShadow: '0 4px 16px rgba(108, 92, 231, 0.3)' }}>
                                {user.role === 'PRODUCER' ? '🏭' : '👤'}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">{user.name}</h2>
                                {user.username && <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>@{user.username}</p>}
                                <span className={`badge ${user.role === 'PRODUCER' ? 'badge-accent' : 'badge-success'}`}>
                                    {user.role === 'PRODUCER' ? t('producer_role') : t('participant')}
                                </span>
                            </div>
                        </div>

                        {user.bio && <p className="text-sm mb-4" style={{ color: 'var(--tg-hint)' }}>{user.bio}</p>}

                        {/* C-Index Badge */}
                        <div className="p-4 rounded-xl mb-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,201,0.15))', animation: 'pulse-glow 3s ease infinite' }}>
                            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-light)' }}>⭐ {reputation?.c_index || 0}</div>
                            <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>{t('s_index')}</div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="text-lg font-bold">{user._count?.offers || 0}</div>
                                <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>{t('my_offers')}</div>
                            </div>
                            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="text-lg font-bold">{user._count?.orders || 0}</div>
                                <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>{t('my_orders')}</div>
                            </div>
                            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="text-lg font-bold">{user._count?.subscriptions || 0}</div>
                                <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>{t('subscriptions')}</div>
                            </div>
                            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="text-lg font-bold">{user._count?.subscribers || 0}</div>
                                <div className="text-xs" style={{ color: 'var(--tg-hint)' }}>{t('subscribers')}</div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="btn-primary flex-1" onClick={() => setEditing(true)}>✏️ {t('edit_profile')}</button>
                            {user.role === 'PRODUCER' && (
                                <button className="btn-secondary flex-1" onClick={() => navigate('/dashboard')}>📊 CRM</button>
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
                            <label className="block text-sm mb-1 font-medium">Bio</label>
                            <textarea className="input-field" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm mb-1 font-medium">{t('role')}</label>
                            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                <option value="PARTICIPANT">{t('participant')}</option>
                                <option value="PRODUCER">{t('producer_role')}</option>
                            </select>
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
                <div>
                    <h3 className="font-semibold mb-2">{t('my_orders')}</h3>
                    <div className="flex flex-col gap-2">
                        {orders.slice(0, 5).map((o) => (
                            <div key={o.id} className="glass-card p-3" style={{ transform: 'none' }}>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-sm">{o.offer?.title}</span>
                                    <span className={`badge ${o.status === 'COMPLETED' ? 'badge-success' : o.status === 'DISPUTED' ? 'badge-danger' : 'badge-accent'}`} style={{ fontSize: 10 }}>
                                        {o.status}
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

            {/* C-Index History */}
            {reputation?.history && reputation.history.length > 0 && (
                <div className="mt-4">
                    <h3 className="font-semibold mb-2">📊 {t('s_index')} Історія</h3>
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
