'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/browser';

type AudioAsset = {
    id: string;
    public_url: string;
    created_at: string;
    meta: {
        preset?: string;
        duration_sec: number;
        type: string;
        text?: string;
        mock?: boolean;
    };
};

export default function MusicLibraryPage() {
    const [assets, setAssets] = useState<AudioAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const supabase = supabaseBrowser();
            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .eq('kind', 'audio')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssets(data || []);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this audio?')) return;

        try {
            const supabase = supabaseBrowser();
            const { error } = await supabase
                .from('assets')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAssets(assets.filter(a => a.id !== id));
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete audio');
        }
    };

    const filteredAssets = filterType === 'all'
        ? assets
        : assets.filter(a => a.meta.type === filterType);

    return (
        <main style={{ minHeight: '100vh', background: '#0b0b0b', color: 'white', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <Link href="/music/create" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '14px' }}>
                        ← Back to Create
                    </Link>
                    <h1 style={{ fontSize: '48px', fontWeight: 900, margin: '20px 0 10px', background: 'linear-gradient(135deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📚 Music Library
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>
                        {assets.length} audio files
                    </p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    {['all', 'instrumental', 'voice_standard', 'voice_premium'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            style={{
                                padding: '12px 20px',
                                background: filterType === type ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'rgba(255,255,255,0.06)',
                                border: filterType === type ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '10px',
                                color: filterType === type ? '#000' : 'white',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                            }}
                        >
                            {type === 'all' ? 'All' : type.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
                        Loading...
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredAssets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎵</div>
                        <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                            No audio files yet
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                            Create your first audio file to get started
                        </p>
                        <Link
                            href="/music/create"
                            style={{
                                display: 'inline-block',
                                padding: '14px 28px',
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#000',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '16px'
                            }}
                        >
                            ✨ Create Audio
                        </Link>
                    </div>
                )}

                {/* Assets Grid */}
                {!loading && filteredAssets.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                        {filteredAssets.map((asset) => (
                            <div
                                key={asset.id}
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {/* Type Badge */}
                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '6px 12px',
                                        background: asset.meta.type === 'instrumental' ? 'rgba(255, 215, 0, 0.2)' :
                                            asset.meta.type === 'voice_premium' ? 'rgba(162, 155, 254, 0.2)' :
                                                'rgba(116, 185, 255, 0.2)',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        color: asset.meta.type === 'instrumental' ? '#FFD700' :
                                            asset.meta.type === 'voice_premium' ? '#A29BFE' :
                                                '#74B9FF'
                                    }}>
                                        {asset.meta.type === 'instrumental' ? '🎹 Instrumental' :
                                            asset.meta.type === 'voice_premium' ? '🎙️ Premium Voice' :
                                                '🎤 Standard Voice'}
                                    </span>
                                </div>

                                {/* Metadata */}
                                <div style={{ marginBottom: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                                    {asset.meta.preset && <div>Preset: {asset.meta.preset}</div>}
                                    <div>Duration: {asset.meta.duration_sec}s</div>
                                    {asset.meta.text && <div style={{ marginTop: '8px', fontStyle: 'italic' }}>"{asset.meta.text.substring(0, 60)}{asset.meta.text.length > 60 ? '...' : ''}"</div>}
                                    <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.5 }}>
                                        {new Date(asset.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Audio Player */}
                                <audio
                                    src={asset.public_url}
                                    controls
                                    style={{
                                        width: '100%',
                                        marginBottom: '12px',
                                        borderRadius: '8px'
                                    }}
                                />

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <a
                                        href={asset.public_url}
                                        download
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            textAlign: 'center',
                                            textDecoration: 'none',
                                            fontSize: '13px',
                                            fontWeight: 600
                                        }}
                                    >
                                        ⬇️ Download
                                    </a>
                                    <button
                                        onClick={() => handleDelete(asset.id)}
                                        style={{
                                            padding: '10px 16px',
                                            background: 'rgba(255,0,0,0.1)',
                                            border: '1px solid rgba(255,0,0,0.3)',
                                            borderRadius: '8px',
                                            color: '#ff6b6b',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
