'use client';

import { useState } from 'react';
import Link from 'next/link';

const PRESETS = ['Cinematic', 'Upbeat', 'Calm', 'Epic', 'Dramatic', 'Ambient'] as const;
const DURATIONS = [6, 15, 30] as const;
const AUDIO_TYPES = ['instrumental', 'voice_standard', 'voice_premium'] as const;

type AudioType = typeof AUDIO_TYPES[number];
type JobStatus = 'idle' | 'creating' | 'queued' | 'running' | 'succeeded' | 'failed';

export default function MusicCreatePage() {
    const [preset, setPreset] = useState<string>('Cinematic');
    const [duration, setDuration] = useState<number>(15);
    const [audioType, setAudioType] = useState<AudioType>('instrumental');
    const [text, setText] = useState<string>('');
    const [status, setStatus] = useState<JobStatus>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setStatus('creating');
        setError(null);
        setAudioUrl(null);
        setJobId(null);

        try {
            // Create job
            const response = await fetch('/api/music/jobs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preset,
                    duration,
                    type: audioType,
                    text: audioType !== 'instrumental' ? text : undefined
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Job creation failed');
            }

            const data = await response.json();
            setJobId(data.jobId);
            setStatus('queued');

            // Start polling
            pollJobStatus(data.jobId);

        } catch (err: any) {
            setError(err.message);
            setStatus('failed');
        }
    };

    const pollJobStatus = async (id: string) => {
        const maxAttempts = 60; // 60 seconds max
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`/api/music/jobs/${id}`);
                if (!response.ok) throw new Error('Failed to fetch job status');

                const job = await response.json();
                setStatus(job.status);

                if (job.status === 'succeeded') {
                    // Get outputs
                    const outputsResponse = await fetch(`/api/music/jobs/${id}/outputs`);
                    if (outputsResponse.ok) {
                        const { outputs } = await outputsResponse.json();
                        if (outputs.length > 0 && outputs[0].assets) {
                            setAudioUrl(outputs[0].assets.public_url);
                        }
                    }
                    return;
                }

                if (job.status === 'failed') {
                    setError(job.errorMessage || 'Generation failed');
                    return;
                }

                // Continue polling if queued or running
                if ((job.status === 'queued' || job.status === 'running') && attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 1000);
                } else if (attempts >= maxAttempts) {
                    setError('Timeout: Job took too long');
                    setStatus('failed');
                }

            } catch (err: any) {
                setError(err.message);
                setStatus('failed');
            }
        };

        poll();
    };

    const canGenerate = audioType === 'instrumental' || text.trim().length > 0;

    const getStatusMessage = () => {
        switch (status) {
            case 'creating': return '⏳ Creating job...';
            case 'queued': return '🕐 Queued...';
            case 'running': return '🎵 Generating...';
            case 'succeeded': return '✅ Ready!';
            case 'failed': return '❌ Failed';
            default: return '✨ Generate Audio';
        }
    };

    return (
        <main style={{ minHeight: '100vh', background: '#0b0b0b', color: 'white', padding: '40px 20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '14px' }}>
                        ← Back to Home
                    </Link>
                    <h1 style={{ fontSize: '48px', fontWeight: 900, margin: '20px 0 10px', background: 'linear-gradient(135deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        🎵 Music Mode
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>
                        Generate instrumental music and voiceovers (Queue System + Mock Providers)
                    </p>
                </div>

                {/* Form */}
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '32px' }}>
                    {/* Audio Type */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>
                            Audio Type
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {AUDIO_TYPES.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setAudioType(type)}
                                    disabled={status !== 'idle' && status !== 'failed' && status !== 'succeeded'}
                                    style={{
                                        padding: '16px',
                                        background: audioType === type ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'rgba(255,255,255,0.06)',
                                        border: audioType === type ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '12px',
                                        color: audioType === type ? '#000' : 'white',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: (status !== 'idle' && status !== 'failed' && status !== 'succeeded') ? 0.5 : 1
                                    }}
                                >
                                    {type === 'instrumental' ? '🎹 Instrumental' :
                                        type === 'voice_standard' ? '🎤 Voice (Standard)' :
                                            '🎙️ Voice (Premium)'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preset (for instrumental) */}
                    {audioType === 'instrumental' && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                Preset
                            </label>
                            <select
                                value={preset}
                                onChange={(e) => setPreset(e.target.value)}
                                disabled={status !== 'idle' && status !== 'failed' && status !== 'succeeded'}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                {PRESETS.map((p) => (
                                    <option key={p} value={p} style={{ background: '#1a1a1a' }}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Text (for voice) */}
                    {audioType !== 'instrumental' && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                Text to Speak
                            </label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                disabled={status !== 'idle' && status !== 'failed' && status !== 'succeeded'}
                                placeholder="Enter the text you want to convert to speech..."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '16px',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                    )}

                    {/* Duration */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>
                            Duration
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {DURATIONS.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDuration(d)}
                                    disabled={status !== 'idle' && status !== 'failed' && status !== 'succeeded'}
                                    style={{
                                        padding: '16px',
                                        background: duration === d ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'rgba(255,255,255,0.06)',
                                        border: duration === d ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '12px',
                                        color: duration === d ? '#000' : 'white',
                                        fontWeight: 700,
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: (status !== 'idle' && status !== 'failed' && status !== 'succeeded') ? 0.5 : 1
                                    }}
                                >
                                    {d}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Job ID (for debugging) */}
                    {jobId && (
                        <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
                            Job ID: {jobId}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={!canGenerate || (status !== 'idle' && status !== 'failed' && status !== 'succeeded')}
                        style={{
                            width: '100%',
                            padding: '18px',
                            background: canGenerate && (status === 'idle' || status === 'failed' || status === 'succeeded')
                                ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                                : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '12px',
                            color: canGenerate && (status === 'idle' || status === 'failed' || status === 'succeeded') ? '#000' : 'rgba(255,255,255,0.3)',
                            fontSize: '16px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            cursor: canGenerate && (status === 'idle' || status === 'failed' || status === 'succeeded') ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                        }}
                    >
                        {getStatusMessage()}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ padding: '16px', background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: '12px', marginBottom: '24px', color: '#ff6b6b' }}>
                        ❌ {error}
                    </div>
                )}

                {/* Audio Player */}
                {audioUrl && status === 'succeeded' && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#FFD700' }}>
                            ✅ Audio Generated!
                        </h3>
                        <audio
                            src={audioUrl}
                            controls
                            style={{
                                width: '100%',
                                marginBottom: '16px',
                                borderRadius: '8px'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Link
                                href="/music/library"
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    textAlign: 'center',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    fontSize: '14px'
                                }}
                            >
                                📚 View Library
                            </Link>
                            <a
                                href={audioUrl}
                                download
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#000',
                                    textAlign: 'center',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    fontSize: '14px'
                                }}
                            >
                                ⬇️ Download
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
