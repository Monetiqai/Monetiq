"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Asset = {
  id: string;
  project_id: string;
  kind: "image" | "video";
  role: string;
  status: string;
  category: string;
  is_primary: boolean;
  group_id: string | null;
  displayUrl: string | null;
  created_at: string;
  meta?: any;
};

type Category = "ads_mode" | "director_mode" | "uploads" | null;
type Filter = "all" | "images" | "videos";

export default function AssetLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);

  const [category, setCategory] = useState<Category>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(60);

  // Ads Mode specific filters
  const [shotType, setShotType] = useState<string>("");
  const [adPackId, setAdPackId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  async function loadAssets() {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (filter !== 'all') params.set('kind', filter === 'images' ? 'image' : 'video');
      params.set('limit', limit.toString());
      params.set('offset', '0');

      // Ads Mode filters
      if (category === 'ads_mode') {
        if (shotType) params.set('shot_type', shotType);
        if (adPackId) params.set('ad_pack_id', adPackId);
        if (variantId) params.set('variant_id', variantId);
      }

      const res = await fetch(`/api/assets/list?${params}`);
      const data = await res.json();

      if (data.ok) {
        setAssets(data.assets);
        setTotal(data.total);
      } else {
        console.error('Failed to load assets:', data.error);
      }
    } catch (e) {
      console.error('Error loading assets:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [category, filter, limit, shotType, adPackId, variantId]);

  const counts = {
    images: assets.filter(a => a.kind === 'image').length,
    videos: assets.filter(a => a.kind === 'video').length,
    total: assets.length
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0b", color: "white" }}>
      <style>{`
        :root {
          --sky: #38BDF8;
          --gold: #ffa726;
          --purple: #8b5cf6;
          --green: #10b981;
        }
        .wrap { max-width: 1400px; margin: 0 auto; padding: 24px; }
        .header { margin-bottom: 32px; }
        .title { font-size: 32px; font-weight: 900; margin: 0; }
        .subtitle { margin-top: 8px; opacity: 0.7; font-size: 14px; }
        
        /* Category Tabs */
        .tabs { display: flex; gap: 12px; margin: 24px 0; flex-wrap: wrap; }
        .tab {
          padding: 12px 20px;
          border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab:hover { border-color: rgba(255,255,255,0.3); }
        .tab.active-director { border-color: var(--gold); background: rgba(255, 167, 38, 0.15); box-shadow: 0 0 20px rgba(255, 167, 38, 0.3); }
        .tab.active-ads { border-color: var(--sky); background: rgba(56, 189, 248, 0.15); box-shadow: 0 0 20px rgba(56, 189, 248, 0.3); }
        .tab.active-uploads { border-color: var(--green); background: rgba(16, 185, 129, 0.15); box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
        .tab.active-all { border-color: white; background: rgba(255, 255, 255, 0.1); }
        
        /* Filters */
        .filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 16px 0; }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chip:hover { border-color: rgba(56,189,248,0.45); }
        .chip.active { border-color: rgba(56,189,248,0.55); box-shadow: 0 0 0 4px rgba(56,189,248,0.15); }
        
        .select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.5);
          color: white;
          font-size: 12px;
        }
        
        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn:hover { border-color: rgba(56,189,248,0.45); }
        
        /* Ads Mode Filters */
        .ads-filters {
          margin: 16px 0;
          padding: 16px;
          border-radius: 12px;
          background: rgba(56, 189, 248, 0.05);
          border: 1px solid rgba(56, 189, 248, 0.2);
        }
        
        /* Grid */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        
        .card {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card:hover {
          border-color: rgba(56,189,248,0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          padding: 10px 12px;
          font-size: 11px;
          opacity: 0.9;
          background: rgba(0,0,0,0.2);
        }
        
        .media {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
          background: #000;
        }
        
        .card-footer {
          padding: 10px 12px;
          font-size: 10px;
          opacity: 0.6;
          word-break: break-all;
        }
        
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          background: rgba(56,189,248,0.2);
          color: var(--sky);
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          opacity: 0.7;
        }
        
        /* Mobile Responsive Modal */
        @media (max-width: 768px) {
          .modal-container {
            flex-direction: column !important;
            height: auto !important;
            max-height: 90vh !important;
            gap: 8px !important;
          }
          .modal-media {
            flex: none !important;
            height: 40vh !important;
            min-height: 40vh !important;
          }
          .modal-info {
            width: 100% !important;
            max-width: 100% !important;
            flex: 1 !important;
            overflow-y: auto !important;
            padding: 16px !important;
          }
        }
      `}</style>

      <div className="wrap">
        <div className="header">
          <h1 className="title">🎨 Asset Library</h1>
          <div className="subtitle">
            {total} assets • Organisés par catégorie
          </div>
        </div>

        {/* Category Tabs */}
        <div className="tabs">
          <button
            className={`tab ${category === null ? 'active-all' : ''}`}
            onClick={() => setCategory(null)}
          >
            📂 All Categories
          </button>
          <button
            className={`tab ${category === 'director_mode' ? 'active-director' : ''}`}
            onClick={() => setCategory('director_mode')}
          >
            🎬 Director Mode
          </button>
          <button
            className={`tab ${category === 'ads_mode' ? 'active-ads' : ''}`}
            onClick={() => setCategory('ads_mode')}
          >
            📱 Ads Mode
          </button>
          <button
            className={`tab ${category === 'uploads' ? 'active-uploads' : ''}`}
            onClick={() => setCategory('uploads')}
          >
            📤 Uploads
          </button>
        </div>

        {/* Filters */}
        <div className="filters">
          <span
            className={`chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({counts.total})
          </span>
          <span
            className={`chip ${filter === 'images' ? 'active' : ''}`}
            onClick={() => setFilter('images')}
          >
            📷 Images ({counts.images})
          </span>
          <span
            className={`chip ${filter === 'videos' ? 'active' : ''}`}
            onClick={() => setFilter('videos')}
          >
            🎥 Videos ({counts.videos})
          </span>

          <select className="select" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[40, 60, 100, 150].map((n) => (
              <option key={n} value={n}>Show {n}</option>
            ))}
          </select>

          <button className="btn" onClick={loadAssets}>🔄 Refresh</button>
          <Link className="btn" href="/">🏠 Home</Link>
        </div>

        {/* Ads Mode Specific Filters */}
        {category === 'ads_mode' && (
          <div className="ads-filters">
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: 8 }}>
              Ads Mode Filters
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="select"
                value={shotType}
                onChange={(e) => setShotType(e.target.value)}
                style={{ minWidth: '150px' }}
              >
                <option value="">All Shot Types</option>
                <option value="hook">🎣 Hook</option>
                <option value="proof">✅ Proof</option>
                <option value="variation">🔄 Variation</option>
                <option value="winner">🏆 Winner</option>
              </select>

              <input
                type="text"
                className="select"
                placeholder="Ad Pack ID"
                value={adPackId}
                onChange={(e) => setAdPackId(e.target.value)}
                style={{ minWidth: '200px' }}
              />

              <input
                type="text"
                className="select"
                placeholder="Variant ID"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                style={{ minWidth: '200px' }}
              />

              <button
                className="btn"
                onClick={() => {
                  setShotType('');
                  setAdPackId('');
                  setVariantId('');
                }}
              >
                🗑️ Clear Filters
              </button>
            </div>
          </div>
        )}

        {loading && <div className="loading">Loading assets...</div>}

        {/* Grid */}
        <div className="grid">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="card"
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="card-header">
                <span>{asset.role}</span>
                <span>{asset.status}</span>
              </div>

              {asset.kind === 'image' ? (
                asset.displayUrl ? (
                  <img className="media" src={asset.displayUrl} alt={asset.role} />
                ) : (
                  <div className="media" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                    No preview
                  </div>
                )
              ) : (
                asset.displayUrl ? (
                  <video className="media" src={asset.displayUrl} />
                ) : (
                  <div className="media" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                    No preview
                  </div>
                )
              )}

              <div className="card-footer">
                {asset.is_primary && <span className="badge">Primary</span>}
                {' '}
                {asset.id.substring(0, 8)}...
              </div>
            </div>
          ))}
        </div>

        {!loading && assets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5 }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <div>No assets found in this category</div>
          </div>
        )}

        {/* Preview Modal */}
        {selectedAsset && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.95)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px'
            }}
            onClick={() => setSelectedAsset(null)}
          >
            <div
              className="modal-container"
              style={{
                maxWidth: '1400px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                gap: '10px',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left: Media */}
              <div className="modal-media" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                {selectedAsset.kind === 'image' ? (
                  <img
                    src={selectedAsset.displayUrl || '/placeholder.png'}
                    alt={selectedAsset.role}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <video
                    src={selectedAsset.displayUrl || ''}
                    controls
                    autoPlay
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                  />
                )}
              </div>

              {/* Right: Info Panel */}
              <div className="modal-info" style={{ width: '400px', background: 'rgba(20,20,20,0.95)', borderRadius: '12px', padding: '24px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {selectedAsset.role.replace(/_/g, ' ')}
                  </h2>
                  <button
                    onClick={() => setSelectedAsset(null)}
                    style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', opacity: 0.7 }}
                  >
                    ✕
                  </button>
                </div>

                {/* Prompt */}
                {selectedAsset.meta?.prompt && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6 }}>
                        Prompt
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedAsset.meta.prompt);
                            alert('Prompt copied!');
                          }}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(56,189,248,0.2)',
                            border: '1px solid rgba(56,189,248,0.4)',
                            borderRadius: '6px',
                            color: '#38BDF8',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                          }}
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={() => setPromptExpanded(!promptExpanded)}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                          }}
                        >
                          {promptExpanded ? '▲ Collapse' : '▼ View All'}
                        </button>
                      </div>
                    </div>
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      border: '1px solid rgba(255,255,255,0.1)',
                      maxHeight: promptExpanded ? 'none' : '5.2em',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {selectedAsset.meta.prompt}
                    </div>
                  </div>
                )}


                {/* Information */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: 8 }}>
                    Information
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ opacity: 0.7 }}>Category</span>
                      <span style={{ fontWeight: 600 }}>{selectedAsset.category}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ opacity: 0.7 }}>Kind</span>
                      <span style={{ fontWeight: 600 }}>{selectedAsset.kind}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ opacity: 0.7 }}>Status</span>
                      <span style={{ fontWeight: 600 }}>{selectedAsset.status}</span>
                    </div>
                    {selectedAsset.meta?.shot_type && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ opacity: 0.7 }}>Shot Type</span>
                        <span style={{ fontWeight: 600 }}>{selectedAsset.meta.shot_type}</span>
                      </div>
                    )}
                    {selectedAsset.meta?.spatial_role && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ opacity: 0.7 }}>Spatial Role</span>
                        <span style={{ fontWeight: 600 }}>{selectedAsset.meta.spatial_role}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ opacity: 0.7 }}>Created</span>
                      <span style={{ fontWeight: 600 }}>{new Date(selectedAsset.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                {selectedAsset.displayUrl && (
                  <a
                    href={selectedAsset.displayUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      textAlign: 'center',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '12px',
                      marginBottom: '12px'
                    }}
                  >
                    ⬇️ DOWNLOAD
                  </a>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const currentIndex = assets.findIndex(a => a.id === selectedAsset.id);
                      if (currentIndex > 0) setSelectedAsset(assets[currentIndex - 1]);
                    }}
                    disabled={assets.findIndex(a => a.id === selectedAsset.id) === 0}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    ← PREVIOUS
                  </button>
                  <button
                    onClick={() => {
                      const currentIndex = assets.findIndex(a => a.id === selectedAsset.id);
                      if (currentIndex < assets.length - 1) setSelectedAsset(assets[currentIndex + 1]);
                    }}
                    disabled={assets.findIndex(a => a.id === selectedAsset.id) === assets.length - 1}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    NEXT →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
