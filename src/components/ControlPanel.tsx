'use client';

import React, { useState } from 'react';
import { AspectRatio } from '@/types';

interface ControlPanelProps {
  defaultRatio: AspectRatio;
  defaultMuted: boolean;
  onStart: (ratio: AspectRatio, muted: boolean, autoDownload?: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ defaultRatio, defaultMuted, onStart }) => {
  const [selected, setSelected] = useState<AspectRatio>(defaultRatio);
  const [muted, setMuted]       = useState(defaultMuted);

  return (
    <div className="cp-overlay">
      <div className="cp-bg-glow" />
      <div className="cp-grain" />

      <div className="cp-panel">
        {/* Badge */}
        <div className="cp-badge">
          <span className="cp-badge-dot" />
          REVEAL GENERATOR
          <span className="cp-badge-dot" />
        </div>

        <h1 className="cp-title">CREATE YOUR REVEAL</h1>
        <p className="cp-subtitle">Choose your format, then hit start to begin recording</p>

        {/* Format Buttons */}
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

        <p className="cp-hint">Choose the format for your video</p>

        {/* Mute toggle */}
        <button className="cp-mute-btn" onClick={() => setMuted(m => !m)}>
          {muted ? '🔇  AUDIO OFF' : '🔊  AUDIO ON'}
        </button>

        {/* Divider */}
        <div className="cp-divider" />

        {/* CTA buttons */}
        <div className="cp-cta-stack">
          <button className="cp-start-btn" onClick={() => onStart(selected, muted, false)}>
            ▶ &nbsp; START REVEAL
          </button>
          <button className="cp-start-download-btn" onClick={() => onStart(selected, muted, true)}>
            ⬇ &nbsp; START REVEAL + DOWNLOAD
          </button>
        </div>

        <p className="cp-warning">
          ⚠️ &nbsp; Ensure your screen recorder is running before clicking START
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;