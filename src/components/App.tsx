'use client';

import React, { useState, useCallback } from 'react';
import ControlPanel from './ControlPanel';
import RevealCanvas from './RevealCanvas';
import { AspectRatio, AppState } from '@/types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    phase: 'control',
    aspectRatio: '16:9',
    muted: false,
  });

  const [autoDownload, setAutoDownload] = useState(false);

  const handleStart = useCallback((ratio: AspectRatio, muted: boolean, wantDownload = false) => {
    setAutoDownload(wantDownload);
    setAppState({ phase: 'reveal', aspectRatio: ratio, muted });
  }, []);

  const handleReplay = useCallback((ratio?: AspectRatio) => {
    setAppState(prev => ({
      phase: 'control',
      aspectRatio: ratio || prev.aspectRatio,
      muted: prev.muted,
    }));
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', fontFamily: "'Montserrat', sans-serif" }}>
      {appState.phase === 'control' && (
        <ControlPanel
          defaultRatio={appState.aspectRatio}
          defaultMuted={appState.muted}
          onStart={handleStart}
        />
      )}
      {appState.phase === 'reveal' && (
        <RevealCanvas
          aspectRatio={appState.aspectRatio}
          muted={appState.muted}
          autoDownload={autoDownload}
          onReplay={handleReplay}
        />
      )}
    </div>
  );
};

export default App;