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
  { id: 'instagram', name: 'instagram', handle: CONFIG.instagramHandle, enabled: true, order: 0 },
  { id: 'youtube', name: 'youtube', handle: CONFIG.youtubeHandle, enabled: true, order: 1 },
  { id: 'facebook', name: 'facebook', handle: CONFIG.facebookHandle, enabled: true, order: 2 },
  { id: 'github', name: 'github', handle: CONFIG.githubHandle, enabled: true, order: 3 },
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  defaultRatio, defaultMuted, defaultUserConfig, onStart,
}) => {
  const [selected, setSelected] = useState<AspectRatio>(defaultRatio);
  const [muted, setMuted] = useState(defaultMuted);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(
    defaultUserConfig?.platforms ?? DEFAULT_PLATFORMS
  );
  const [username, setUsername] = useState(defaultUserConfig?.username ?? CONFIG.username);

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(
    defaultUserConfig?.profileImageDataUrl ?? null
  );
  const [showCropper, setShowCropper] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildUserConfig = useCallback((): UserConfig => ({
    profileImageDataUrl: croppedImage,
    cropX: 0, cropY: 0, cropSize: 1,
    username,
    platforms,
  }), [croppedImage, username, platforms]);

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
    e.target.value = '';
  };

  const handleCropComplete = useCallback((dataUrl: string) => {
    setCroppedImage(dataUrl);
    setRawImageSrc(null);
    setShowCropper(false);

    const img = new Image();
    img.onload = () => { window.__croppedProfileImg_ref__ = img; };
    img.src = dataUrl;
  }, []);

  const handleCropCancel = () => {
    setRawImageSrc(null);
    setShowCropper(false);
  };

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

        <div className="cp-panel">

          {/* Header */}
          <div className="cp-header">
            <div className="cp-badge">
              <span className="cp-badge-dot" /> REVEAL GENERATOR <span className="cp-badge-dot" />
            </div>
            <h1 className="cp-title">CREATE YOUR REVEAL</h1>
            <p className="cp-subtitle">Customize your identity & platforms, then render.</p>
          </div>

          {/* Grid Container */}
          <div className="cp-grid">

            {/* Left Column: Identity & Format */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0 }}>

              {/* Profile Card */}
              <div className="cp-card">
                <span className="cp-label">PROFILE IMAGE</span>
                <div className="flex-row-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '72px', height: '72px', flexShrink: 0,
                      borderRadius: '12px', overflow: 'hidden',
                      border: '2px solid rgba(150,80,255,0.4)',
                      cursor: 'pointer', background: 'rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {croppedImage ? (
                      <img src={croppedImage} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '24px' }}>📸</span>
                    )}
                  </div>
                  <div className="flex-col">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '10px 16px', background: 'rgba(150,80,255,0.15)',
                        border: '1px solid rgba(150,80,255,0.3)', borderRadius: '8px',
                        color: '#fff', fontSize: '12px', fontWeight: 600,
                        letterSpacing: '1px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif'
                      }}
                    >
                      {croppedImage ? 'Change Image' : 'Upload Image'}
                    </button>
                    {!croppedImage && (
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                        Default avatar will be used if skipped.
                      </p>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
              </div>

              {/* Username Card */}
              <div className="cp-card">
                <span className="cp-label">USERNAME / HANDLE</span>
                <input
                  className="cp-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="@yourhandle"
                />
              </div>

              {/* Format Card */}
              <div className="cp-card">
                <span className="cp-label">OUTPUT FORMAT</span>
                <div className="cp-format-row">
                  {(['16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      className={`cp-format-btn${selected === ratio ? ' active' : ''}`}
                      onClick={() => setSelected(ratio)}
                    >
                      <span className="cp-format-icon">{ratio === '16:9' ? '⬛' : '▮'}</span>
                      <span className="cp-format-label">{ratio === '16:9' ? '16:9' : '9:16'}</span>
                      <span className="cp-format-sub">{ratio === '16:9' ? 'LANDSCAPE' : 'PORTRAIT'}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Socials & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0 }}>

              {/* Social Platforms Card */}
              <div className="cp-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="cp-label">SOCIAL PLATFORMS</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                    {platforms.filter(p => p.enabled).length} ACTIVE
                  </span>
                </div>
                <PlatformConfigurator platforms={platforms} onChange={setPlatforms} />
              </div>

              {/* Actions Box */}
              <div className="cp-card cp-actions-card">
                <button className="cp-mute-btn" onClick={() => setMuted(m => !m)}>
                  {muted ? '🔇  AUDIO IS OFF' : '🔊  AUDIO IS ON'}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    className="cp-start-btn"
                    onClick={() => onStart(selected, muted, false, buildUserConfig())}
                  >
                    ▶  START REVEAL
                  </button>
                  <button
                    className="cp-start-download-btn"
                    onClick={() => onStart(selected, muted, true, buildUserConfig())}
                  >
                    ⬇  START REVEAL + DOWNLOAD
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(251, 191, 36, 0.5)', textAlign: 'center', letterSpacing: '0.5px' }}>
                  ⚠️  Ensure your screen recorder is active before clicking start.
                </p>
              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ControlPanel;