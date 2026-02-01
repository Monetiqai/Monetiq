'use client';

import { Node } from 'reactflow';

// Provider configuration (inline to avoid import issues)
type ProviderConfig = {
    id: string;
    label: string;
    resolutions: Array<{
        resolution: string;
        label: string;
        durations: number[];
    }>;
    defaultResolution: string;
    defaultDuration: number;
};

const VIDEO_PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
    minimax: {
        id: 'minimax',
        label: 'MiniMax-Hailuo-2.3',
        resolutions: [
            { resolution: '768p', label: '768p', durations: [6, 10] },
            { resolution: '1080p', label: '1080p', durations: [6] }
        ],
        defaultResolution: '768p',
        defaultDuration: 6
    },
    veo: {
        id: 'veo',
        label: 'Veo',
        resolutions: [
            { resolution: '1080p', label: '1080p', durations: [5, 8] }
        ],
        defaultResolution: '1080p',
        defaultDuration: 5
    }
};

function getProviderDefaults(provider: string) {
    const config = VIDEO_PROVIDER_CONFIGS[provider];
    if (!config) return { resolution: '768p', duration: 6 };
    return {
        resolution: config.defaultResolution,
        duration: config.defaultDuration
    };
}

interface PropertiesPanelProps {
    node: Node;
    onUpdate: (data: any) => void;
    onClose: () => void;
}

export function PropertiesPanel({ node, onUpdate, onClose }: PropertiesPanelProps) {
    return (
        <div
            className="w-80 p-4 overflow-y-auto"
            style={{
                background: 'var(--node-bg)',
                borderLeft: '1px solid var(--node-border)',
                backdropFilter: 'var(--glass-blur)'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2
                    className="nodeTitle"
                    style={{
                        fontSize: '15px',
                        whiteSpace: 'normal',
                        overflow: 'visible'
                    }}
                >
                    {node.type} Properties
                </h2>
                <button
                    onClick={onClose}
                    className="transition-colors"
                    style={{
                        color: 'var(--text-dim)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px 8px',
                        borderRadius: '8px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-dim)';
                        e.currentTarget.style.background = 'none';
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Node ID */}
            <div className="mb-4">
                <label className="block mb-1 nodeMeta">Node ID</label>
                <div
                    className="px-3 py-2 rounded nodeMeta"
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--node-border)',
                        borderRadius: '12px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: 'var(--text-dim)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {node.id}
                </div>
            </div>

            {/* Dynamic Properties based on node type */}
            {node.type === 'Prompt' && (
                <div className="mb-4">
                    <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                        Prompt Text
                    </label>
                    <textarea
                        value={node.data.text || ''}
                        onChange={(e) => onUpdate({ text: e.target.value })}
                        className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2 nodeEditor"
                        placeholder="Enter your prompt..."
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--node-border)',
                            borderRadius: '12px',
                            minHeight: '100px',
                            maxHeight: '200px',
                            fontSize: '12px'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--sky)';
                            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--node-border)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                </div>
            )}

            {node.type === 'CombineText' && (
                <div className="mb-4">
                    <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                        Separator
                    </label>
                    <input
                        type="text"
                        value={node.data.separator || ' '}
                        onChange={(e) => onUpdate({ separator: e.target.value })}
                        className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                        placeholder="Space"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--node-border)',
                            borderRadius: '12px',
                            fontSize: '13px'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--sky)';
                            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(56, 189, 248, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--node-border)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                </div>
            )}

            {node.type === 'ImageGen' && (
                <>
                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Provider
                        </label>
                        <select
                            value={node.data.provider || 'nano_banana'}
                            onChange={(e) => onUpdate({ provider: e.target.value })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        >
                            <option value="nano_banana" style={{ color: 'white' }}>Nano Banana</option>
                            <option value="chatgpt_image" style={{ color: 'white' }}>ChatGPT Image</option>
                            <option value="seeddream" style={{ color: 'white' }}>SeedDream</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Runs
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="8"
                            value={node.data.runs || 1}
                            onChange={(e) => onUpdate({ runs: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                </>
            )}

            {node.type === 'VideoGen' && (() => {
                // Normalize provider value (old nodes might have 'kling' or other values)
                let provider = (node.data.provider || 'minimax') as string;
                const originalProvider = provider;

                // Map old provider names to new ones
                if (provider === 'kling') provider = 'minimax';
                if (!VIDEO_PROVIDER_CONFIGS[provider]) provider = 'minimax';

                // If provider was normalized, update node data
                if (provider !== originalProvider) {
                    console.log(`[PropertiesPanel] Migrating provider from "${originalProvider}" to "${provider}"`);
                    // Update node data to use new provider
                    setTimeout(() => {
                        onUpdate({ provider: provider });
                    }, 0);
                }

                console.log('[PropertiesPanel] Provider (normalized):', provider);
                console.log('[PropertiesPanel] VIDEO_PROVIDER_CONFIGS keys:', Object.keys(VIDEO_PROVIDER_CONFIGS));

                const providerConfig = VIDEO_PROVIDER_CONFIGS[provider];

                if (!providerConfig) {
                    console.error('[PropertiesPanel] CRITICAL: providerConfig is STILL undefined after normalization!');
                    console.error('[PropertiesPanel] Provider:', provider);
                    console.error('[PropertiesPanel] typeof provider:', typeof provider);
                    console.error('[PropertiesPanel] VIDEO_PROVIDER_CONFIGS:', VIDEO_PROVIDER_CONFIGS);

                    // Last resort fallback
                    const fallbackConfig = VIDEO_PROVIDER_CONFIGS['minimax'];
                    const resolution = node.data.resolution || fallbackConfig.defaultResolution;
                    const duration = node.data.duration || fallbackConfig.defaultDuration;

                    return (
                        <>
                            <div className="mb-4 p-3" style={{ background: 'rgba(255,165,0,0.1)', borderRadius: '8px', marginBottom: '12px' }}>
                                <p style={{ color: '#ffa500', fontSize: '11px', margin: 0 }}>
                                    ⚠️ Provider config error. Using fallback (MiniMax).
                                </p>
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                                    Provider
                                </label>
                                <select
                                    value="minimax"
                                    onChange={(e) => onUpdate({ provider: e.target.value })}
                                    className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--node-border)',
                                        borderRadius: '12px',
                                        fontSize: '13px'
                                    }}
                                >
                                    <option value="minimax" style={{ color: 'white' }}>MiniMax-Hailuo-2.3</option>
                                    <option value="veo" style={{ color: 'white' }}>Veo</option>
                                </select>
                            </div>
                        </>
                    );
                }

                const resolution = node.data.resolution || providerConfig.defaultResolution;
                const duration = node.data.duration || providerConfig.defaultDuration;

                const currentResConfig = providerConfig.resolutions.find((r: any) => r.resolution === resolution);
                const availableDurations = currentResConfig?.durations || [];

                const handleProviderChange = (newProvider: 'minimax' | 'veo') => {
                    const defaults = getProviderDefaults(newProvider);
                    onUpdate({
                        provider: newProvider,
                        resolution: defaults.resolution,
                        duration: defaults.duration
                    });
                };

                const handleResolutionChange = (newResolution: string) => {
                    const resConfig = providerConfig.resolutions.find((r: any) => r.resolution === newResolution);
                    const newDurations = resConfig?.durations || [];
                    const newDuration = newDurations.includes(duration) ? duration : newDurations[0];

                    onUpdate({
                        resolution: newResolution,
                        duration: newDuration
                    });
                };

                return (
                    <>
                        <div className="mb-4">
                            <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                                Provider
                            </label>
                            <select
                                value={provider}
                                onChange={(e) => handleProviderChange(e.target.value as 'minimax' | 'veo')}
                                className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--node-border)',
                                    borderRadius: '12px',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="minimax" style={{ color: 'white' }}>MiniMax-Hailuo-2.3</option>
                                <option value="veo" style={{ color: 'white' }}>Veo</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                                Resolution
                            </label>
                            <select
                                value={resolution}
                                onChange={(e) => handleResolutionChange(e.target.value)}
                                className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--node-border)',
                                    borderRadius: '12px',
                                    fontSize: '13px'
                                }}
                            >
                                {providerConfig.resolutions.map((res: any) => (
                                    <option key={res.resolution} value={res.resolution} style={{ color: 'white' }}>
                                        {res.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                                Duration (seconds)
                            </label>
                            <select
                                value={duration}
                                onChange={(e) => onUpdate({ duration: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--node-border)',
                                    borderRadius: '12px',
                                    fontSize: '13px'
                                }}
                            >
                                {availableDurations.map((dur: number) => (
                                    <option key={dur} value={dur} style={{ color: 'white' }}>
                                        {dur}s
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                );
            })()}


            {/* DirectorStyle Node */}
            {node.type === 'DirectorStyle' && (
                <div className="mb-4">
                    <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                        Director Style
                    </label>
                    <select
                        value={node.data.director || 'nolan'}
                        onChange={(e) => onUpdate({ director: e.target.value })}
                        className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--node-border)',
                            borderRadius: '12px',
                            fontSize: '13px'
                        }}
                    >
                        <option value="nolan">Christopher Nolan</option>
                        <option value="tarantino">Quentin Tarantino</option>
                        <option value="spielberg">Steven Spielberg</option>
                        <option value="besson">Luc Besson</option>
                        <option value="kubrick">Stanley Kubrick</option>
                        <option value="anderson">Wes Anderson</option>
                        <option value="cameron">James Cameron</option>
                        <option value="burton">Tim Burton</option>
                        <option value="scorsese">Martin Scorsese</option>
                    </select>
                </div>
            )}

            {/* CinematicSetup Node */}
            {node.type === 'CinematicSetup' && (
                <>
                    {/* Camera */}
                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Camera
                        </label>
                        <select
                            value={node.data.camera || 'red_vraptor'}
                            onChange={(e) => onUpdate({ camera: e.target.value })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        >
                            <option value="red_vraptor">Red V-Raptor</option>
                            <option value="sony_venice">Sony Venice</option>
                            <option value="imax">IMAX Film Camera</option>
                            <option value="arri_alexa">Arri Alexa</option>
                            <option value="arriflex_16sr">Arriflex 16SR</option>
                            <option value="panavision_dxl2">Panavision Millennium DXL2</option>
                        </select>
                    </div>

                    {/* Lens */}
                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Lens
                        </label>
                        <select
                            value={node.data.lens || 'cooke_s4'}
                            onChange={(e) => onUpdate({ lens: e.target.value })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        >
                            <option value="lensbaby">Lensbaby</option>
                            <option value="hawk_vlite">Hawk V-Lite</option>
                            <option value="laowa_macro">Laowa Macro</option>
                            <option value="canon_k35">Canon K-35</option>
                            <option value="panavision_c">Panavision C-Series</option>
                            <option value="arri_signature">Arri Signature Prime</option>
                            <option value="cooke_s4">Cooke S4</option>
                            <option value="petzval">Petzval</option>
                            <option value="helios">Helios</option>
                            <option value="zeiss_ultra">Zeiss Ultra Prime</option>
                        </select>
                    </div>

                    {/* Focal Length */}
                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Focal Length
                        </label>
                        <select
                            value={node.data.focal || '35mm'}
                            onChange={(e) => onUpdate({ focal: e.target.value })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        >
                            <option value="8mm">8mm (Ultra Wide)</option>
                            <option value="14mm">14mm (Wide)</option>
                            <option value="35mm">35mm (Balanced)</option>
                            <option value="50mm">50mm (Intimate)</option>
                        </select>
                    </div>

                    {/* Aperture */}
                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Aperture
                        </label>
                        <select
                            value={node.data.aperture || 'f4'}
                            onChange={(e) => onUpdate({ aperture: e.target.value })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        >
                            <option value="f1_4">f/1.4 (Artistic)</option>
                            <option value="f4">f/4 (Balanced)</option>
                            <option value="f11">f/11 (Clinical)</option>
                        </select>
                    </div>

                    {/* Quality */}
                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Quality
                        </label>
                        <select
                            value={node.data.quality || '2K'}
                            onChange={(e) => onUpdate({ quality: e.target.value })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        >
                            <option value="1K">1K</option>
                            <option value="2K">2K</option>
                            <option value="4K">4K</option>
                        </select>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Aspect Ratio
                        </label>
                        <select
                            value={node.data.aspectRatio || '21:9'}
                            onChange={(e) => onUpdate({ aspectRatio: e.target.value })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        >
                            <option value="1:1">1:1</option>
                            <option value="4:5">4:5</option>
                            <option value="5:4">5:4</option>
                            <option value="9:16">9:16</option>
                            <option value="16:9">16:9</option>
                            <option value="21:9">21:9</option>
                        </select>
                    </div>
                </>
            )}

            {/* CombineImage Properties */}
            {node.type === 'CombineImage' && (
                <>
                    <div className="mb-4">
                        <label className="block mb-2 nodeTitle" style={{ whiteSpace: 'normal' }}>
                            Number of Inputs
                        </label>
                        <select
                            value={node.data.input_count || 4}
                            onChange={(e) => onUpdate({ input_count: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 rounded text-white focus:outline-none focus:ring-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--node-border)',
                                borderRadius: '12px',
                                fontSize: '13px'
                            }}
                        >
                            <option value="4">4 inputs</option>
                            <option value="5">5 inputs</option>
                            <option value="6">6 inputs</option>
                            <option value="7">7 inputs</option>
                            <option value="8">8 inputs</option>
                            <option value="9">9 inputs</option>
                            <option value="10">10 inputs</option>
                        </select>
                    </div>
                    <div className="nodeMeta" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Gemini supports up to 14 reference images
                    </div>
                </>
            )}

            {/* Run Button */}
            <button
                className="w-full px-4 py-2 rounded font-medium transition-all mt-4"
                onClick={() => {
                    console.log('[Director Node] Run node:', node.id);
                    // TODO: Implement in Phase 3
                }}
                style={{
                    background: '#10b981',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#059669';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#10b981';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                ▶️ Run Node
            </button>
        </div>
    );
}
