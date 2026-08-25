'use client';

import React, { useState, useRef, useCallback } from 'react';
import { AspectRatio, PlatformConfig, UserConfig } from '@/types';
import { CONFIG } from '@/config';
import ImageCropper from './ImageCropper';
import PlatformConfigurator from './PlatformConfigurator';

// Pull developer URLs and handles directly from the immutable CONFIG file
const DEV_INFO = {
  username: '@OverthinkerImam',
  socials: [
    { id: 'instagram', name: 'instagram', url: CONFIG.instagramUrl },
    { id: 'youtube',   name: 'youtube',   url: CONFIG.youtubeUrl },
    { id: 'facebook',  name: 'facebook',  url: CONFIG.facebookUrl },
    { id: 'github',    name: 'github',    url: CONFIG.githubUrl },
  ]
};

// Inline SVGs for brand identities
const BRAND_ICONS = {
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.31.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.28-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  ),
};

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
          
          {/* Developer Navigation Dock (Direct reference to CONFIG URLs) */}
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              width: '100%',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffd700', letterSpacing: '2px' }}>
                CREATOR CHANNELS ({DEV_INFO.username})
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DEV_INFO.socials.map(social => {
                return (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${social.name}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.65)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.color = '#ffd700';
                      e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)';
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    }}
                  >
                    {BRAND_ICONS[social.name as keyof typeof BRAND_ICONS] || '🔗'}
                  </a>
                );
              })}
            </div>
          </div>

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