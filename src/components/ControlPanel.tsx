// src/components/ControlPanel.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { AspectRatio, PlatformConfig, UserConfig } from '@/types';
import { CONFIG } from '@/config';
import ImageCropper from './ImageCropper';
import PlatformConfigurator from './PlatformConfigurator';

interface ControlPanelProps {
  defaultRatio: AspectRatio;
  defaultMuted: boolean;
  defaultUserConfig?: UserConfig;
  onStart: (ratio: AspectRatio, muted: boolean, autoDownload?: boolean, userConfig?: UserConfig) => void;
}

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  { id: 'instagram', name: 'instagram', handle: CONFIG.instagramHandle, enabled: true,  order: 0 },
  { id: 'youtube',   name: 'youtube',   handle: CONFIG.youtubeHandle,   enabled: true,  order: 1 },
  { id: 'facebook',  name: 'facebook',  handle: CONFIG.facebookHandle,  enabled: true,  order: 2 },
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  defaultRatio, defaultMuted, defaultUserConfig, onStart,
}) => {
  const [selected, setSelected] = useState<AspectRatio>(defaultRatio);
  const [muted, setMuted]       = useState(defaultMuted);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(
    defaultUserConfig?.platforms ?? DEFAULT_PLATFORMS
  );
  const [username, setUsername] = useState(defaultUserConfig?.username ?? CONFIG.username);

  const [rawImageSrc, setRawImageSrc]     = useState<string | null>(null);
  const [croppedImage, setCroppedImage]   = useState<string | null>(
    defaultUserConfig?.profileImageDataUrl ?? null
  );
  const [showCropper, setShowCropper]     = useState(false);
  const [showAdvanced, setShowAdvanced]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Build user config ────────────────────────────────────── */
  const buildUserConfig = useCallback((): UserConfig => ({
    profileImageDataUrl: croppedImage,
    cropX: 0, cropY: 0, cropSize: 1,
    username,
    platforms,
  }), [croppedImage, username, platforms]);

  /* ── Image upload ─────────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setRawImageSrc(src);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleCropComplete = useCallback((dataUrl: string) => {
    setCroppedImage(dataUrl);
    setRawImageSrc(null);
    setShowCropper(false);

    // Preload into global ref
    const img = new Image();
    img.onload = () => {
      window.__croppedProfileImg_ref__ = img;
    };
    img.src = dataUrl;
  }, []);

  const handleCropCancel = () => {
    setRawImageSrc(null);
    setShowCropper(false);
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <>
      {showCropper && rawImageSrc && (
        <ImageCropper
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      <div className="cp-overlay">
        <div className="cp-bg-glow" />
        <div className="cp-grain" />

        <div className="cp-panel" style={{ maxWidth: '640px', gap: '16px', overflowY: 'auto', maxHeight: '96vh' }}>
          {/* Badge */}
          <div className="cp-badge">
            <span className="cp-badge-dot" />
            REVEAL GENERATOR
            <span className="cp-badge-dot" />
          </div>

          <h1 className="cp-title">CREATE YOUR REVEAL</h1>
          <p className="cp-subtitle">Customize your reveal, then hit start</p>

          {/* ── Profile Image ──────────────────────────────── */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase' }}>
              PROFILE IMAGE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Preview */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '72px', height: '72px', flexShrink: 0,
                  borderRadius: '10px', overflow: 'hidden',
                  border: '2px solid rgba(180,100,255,0.4)',
                  cursor: 'pointer', position: 'relative',
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {croppedImage ? (
                  <img src={croppedImage} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '28px' }}>📷</span>
                )}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.2s',
                  fontSize: '18px',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  ✏️
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '9px 16px', background: 'rgba(120,40,255,0.15)',
                    border: '1px solid rgba(180,100,255,0.4)', borderRadius: '8px',
                    color: '#fff', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '2px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                    textAlign: 'left',
                  }}
                >
                  {croppedImage ? '🔄  CHANGE IMAGE' : '⬆  UPLOAD IMAGE'}
                </button>
                {croppedImage && (
                  <button
                    onClick={() => { setRawImageSrc(croppedImage); setShowCropper(true); }}
                    style={{
                      padding: '7px 16px', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                      color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600,
                      letterSpacing: '2px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                      textAlign: 'left',
                    }}
                  >
                    ✂  RE-CROP
                  </button>
                )}
                {!croppedImage && (
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                    Uses default image if none uploaded
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* ── Username ───────────────────────────────────── */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase' }}>
              USERNAME / HANDLE
            </span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="@yourhandle"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                padding: '10px 14px', color: '#fff', fontSize: '14px',
                fontFamily: 'Montserrat, sans-serif', outline: 'none',
              }}
            />
          </div>

          {/* ── Format ────────────────────────────────────── */}
          <div className="cp-format-row">
            {(['16:9', '9:16'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                className={`cp-format-btn${selected === ratio ? ' active' : ''}`}
                onClick={() => setSelected(ratio)}
              >
                <span className="cp-format-icon">{ratio === '16:9' ? '⬛' : '▮'}</span>
                <span className="cp-format-label">{ratio === '16:9' ? '16 : 9' : '9 : 16'}</span>
                <span className="cp-format-sub">{ratio === '16:9' ? 'LANDSCAPE' : 'PORTRAIT'}</span>
                <span className="cp-format-desc">{ratio === '16:9' ? 'YouTube · Facebook' : 'Reels · Shorts'}</span>
              </button>
            ))}
          </div>

          {/* ── Advanced toggle ────────────────────────────── */}
          <button
            onClick={() => setShowAdvanced(v => !v)}
            style={{
              width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
              color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600,
              letterSpacing: '2px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <span>{showAdvanced ? '▲' : '▼'}</span>
            SOCIAL PLATFORMS
            {!showAdvanced && (
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>
                ({platforms.filter(p => p.enabled).length} active)
              </span>
            )}
          </button>

          {showAdvanced && (
            <PlatformConfigurator platforms={platforms} onChange={setPlatforms} />
          )}

          {/* ── Mute ──────────────────────────────────────── */}
          <button className="cp-mute-btn" onClick={() => setMuted(m => !m)}>
            {muted ? '🔇  AUDIO OFF' : '🔊  AUDIO ON'}
          </button>

          <div className="cp-divider" />

          {/* ── CTA ───────────────────────────────────────── */}
          <div className="cp-cta-stack">
            <button
              className="cp-start-btn"
              onClick={() => onStart(selected, muted, false, buildUserConfig())}
            >
              ▶ &nbsp; START REVEAL
            </button>
            <button
              className="cp-start-download-btn"
              onClick={() => onStart(selected, muted, true, buildUserConfig())}
            >
              ⬇ &nbsp; START REVEAL + DOWNLOAD
            </button>
          </div>

          <p className="cp-warning">
            ⚠️ &nbsp; Ensure your screen recorder is running before clicking START
          </p>
        </div>
      </div>
    </>
  );
};

export default ControlPanel;