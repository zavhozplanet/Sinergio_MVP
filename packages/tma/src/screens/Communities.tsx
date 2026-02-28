import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function Communities() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', location_tags: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => { load(); }, []);

    async function load(searchQuery?: string) {
        setLoading(true);
        try {
            const data = await api.getCommunities(searchQuery);
            setCommunities(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            await api.createCommunity(form);
            setShowCreate(false);
            setForm({ name: '', description: '', location_tags: '' });
            load();
        } catch (err: any) { alert(err.message); }
        finally { setCreating(false); }
    }

    return (
        <div className="page">
            <div className="flex items-center justify-between mb-4">
                <h1 className="page-header" style={{ marginBottom: 0 }}>🏘️ {t('communities')}</h1>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setShowCreate(!showCreate)}>
                    + {t('create_community')}
                </button>
            </div>

            {/* Search */}
            <div className="mb-4 flex gap-2">
                <input className="input-field flex-1" placeholder="🔍 Пошук..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(search)} />
                <button className="btn-secondary" onClick={() => load(search)}>🔍</button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <form onSubmit={handleCreate} className="glass-card p-4 mb-4 animate-fade-in flex flex-col gap-3">
                    <input className="input-field" placeholder={t('name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <textarea className="input-field" placeholder={t('description')} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <input className="input-field" placeholder={`📍 ${t('location')} (наприклад: Дніпро, Тополь-3)`} required value={form.location_tags} onChange={(e) => setForm({ ...form, location_tags: e.target.value })} />
                    <button className="btn-primary" type="submit" disabled={creating}>
                        {creating ? '⏳' : '🏘️'} {t('create_community')}
                    </button>
                </form>
            )}

            {/* List */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
                </div>
            ) : communities.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--tg-hint)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🏘️</div>
                    <p>Немає осередків</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {communities.map((c, idx) => (
                        <div
                            key={c.id}
                            className="glass-card p-4 cursor-pointer animate-fade-in"
                            style={{ animationDelay: `${idx * 50}ms` }}
                            onClick={() => navigate(`/community/${c.id}`)}
                        >
                            <h3 className="font-semibold mb-1">{c.name}</h3>
                            <p className="text-sm mb-2" style={{ color: 'var(--tg-hint)' }}>{c.description}</p>
                            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--tg-hint)' }}>
                                <span>📍 {c.location_tags}</span>
                                <span>👥 {c._count?.members || 0}</span>
                                <span>📦 {c._count?.offers || 0}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
