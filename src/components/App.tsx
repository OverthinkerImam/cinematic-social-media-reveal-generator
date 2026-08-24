// src/components/App.tsx
'use client';

import React, { useState, useCallback } from 'react';
import ControlPanel from './ControlPanel';
import RevealCanvas from './RevealCanvas';
import { AspectRatio, AppState, UserConfig, PlatformConfig } from '@/types';
import { CONFIG } from '@/config';

const DEFAULT_USER_CONFIG: UserConfig = {
  profileImageDataUrl: null,
  cropX: 0, cropY: 0, cropSize: 1,
  username: CONFIG.username,
  platforms: [
    { id: 'instagram', name: 'instagram', handle: CONFIG.instagramHandle, enabled: true,  order: 0 },
    { id: 'youtube',   name: 'youtube',   handle: CONFIG.youtubeHandle,   enabled: true,  order: 1 },
    { id: 'facebook',  name: 'facebook',  handle: CONFIG.facebookHandle,  enabled: true,  order: 2 },
    { id: 'github',    name: 'github',    handle: CONFIG.githubHandle,    enabled: true,  order: 3 },
  ],
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    phase: 'control',
    aspectRatio: '9:16',
    muted: false,
  });

  const [autoDownload, setAutoDownload]   = useState(false);
  const [userConfig, setUserConfig]       = useState<UserConfig>(DEFAULT_USER_CONFIG);
  const [savedUserConfig, setSavedUserConfig] = useState<UserConfig>(DEFAULT_USER_CONFIG);

  const handleStart = useCallback((ratio: AspectRatio, muted: boolean, wantDownload = false, cfg?: UserConfig) => {
    const finalCfg = cfg ?? userConfig;
    setAutoDownload(wantDownload);
    setSavedUserConfig(finalCfg);
    setUserConfig(finalCfg);

    // Apply username to CONFIG so all draw functions pick it up
    (CONFIG as { username: string }).username = finalCfg.username;

    setAppState({ phase: 'reveal', aspectRatio: ratio, muted });
  }, [userConfig]);

  const handleReplay = useCallback((ratio?: AspectRatio) => {
    setAppState(prev => ({
      phase: 'control',
      aspectRatio: ratio || prev.aspectRatio,
      muted: prev.muted,
    }));
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#000',
      overflow: 'hidden', fontFamily: "'Montserrat', sans-serif",
    }}>
      {appState.phase === 'control' && (
        <ControlPanel
          defaultRatio={appState.aspectRatio}
          defaultMuted={appState.muted}
          defaultUserConfig={savedUserConfig}
          onStart={handleStart}
        />
      )}
      {appState.phase === 'reveal' && (
        <RevealCanvas
          aspectRatio={appState.aspectRatio}
          muted={appState.muted}
          autoDownload={autoDownload}
          userConfig={userConfig}
          onReplay={handleReplay}
        />
      )}
    </div>
  );
};

export default App;