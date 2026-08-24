// src/components/PlatformConfigurator.tsx
'use client';

import React, { useState } from 'react';
import { PlatformConfig } from '@/types';

interface PlatformConfiguratorProps {
  platforms: PlatformConfig[];
  onChange: (platforms: PlatformConfig[]) => void;
}

const PLATFORM_META: Record<string, { label: string; icon: string; placeholder: string; color: string }> = {
  instagram: { label: 'Instagram', icon: '📸', placeholder: '@username',    color: '#e1306c' },
  youtube:   { label: 'YouTube',   icon: '▶️',  placeholder: '@Channel',     color: '#ef4444' },
  facebook:  { label: 'Facebook',  icon: '👤',  placeholder: '@Page',        color: '#3b82f6' },
  github:    { label: 'GitHub',    icon: '🐙',  placeholder: '@developer',   color: '#8b5cf6' },
};

const PlatformConfigurator: React.FC<PlatformConfiguratorProps> = ({ platforms, onChange }) => {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragItem = React.useRef<string | null>(null);

  const togglePlatform = (id: string) => {
    onChange(platforms.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };
  const updateHandle = (id: string, handle: string) => {
    onChange(platforms.map(p => p.id === id ? { ...p, handle } : p));
  };
  const moveUp = (id: string) => {
    const sorted = [...platforms].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(p => p.id === id);
    if (idx <= 0) return;
    const newArr = [...sorted];
    [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
    onChange(newArr.map((p, i) => ({ ...p, order: i })));
  };
  const moveDown = (id: string) => {
    const sorted = [...platforms].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(p => p.id === id);
    if (idx >= sorted.length - 1) return;
    const newArr = [...sorted];
    [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
    onChange(newArr.map((p, i) => ({ ...p, order: i })));
  };

  const handleDragStart = (id: string) => { dragItem.current = id; };
  const handleDragOver  = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOver(id);
  };
  const handleDrop = (targetId: string) => {
    const srcId = dragItem.current;
    if (!srcId || srcId === targetId) { setDragOver(null); return; }
    const sorted = [...platforms].sort((a, b) => a.order - b.order);
    const srcIdx = sorted.findIndex(p => p.id === srcId);
    const tgtIdx = sorted.findIndex(p => p.id === targetId);
    const newArr = [...sorted];
    const [removed] = newArr.splice(srcIdx, 1);
    newArr.splice(tgtIdx, 0, removed);
    onChange(newArr.map((p, i) => ({ ...p, order: i })));
    setDragOver(null);
    dragItem.current = null;
  };
  const handleDragEnd = () => { setDragOver(null); dragItem.current = null; };

  const sorted = [...platforms].sort((a, b) => a.order - b.order);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sorted.map((platform, idx) => {
        const meta = PLATFORM_META[platform.name];
        const isDragTarget = dragOver === platform.id;
        
        return (
          <div
            key={platform.id}
            draggable
            onDragStart={() => handleDragStart(platform.id)}
            onDragOver={(e) => handleDragOver(e, platform.id)}
            onDrop={() => handleDrop(platform.id)}
            onDragEnd={handleDragEnd}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px',
              background: platform.enabled ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
              border: `1px solid ${isDragTarget ? 'rgba(150,80,255,0.6)' : platform.enabled ? 'rgba(150,80,255,0.25)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: '12px',
              transition: 'all 0.2s',
              cursor: 'grab',
              opacity: isDragTarget ? 0.7 : 1,
            }}
          >
            {/* Drag handle */}
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '14px', cursor: 'grab' }}>⠿</span>

            {/* Toggle Switch */}
            <button
              onClick={() => togglePlatform(platform.id)}
              style={{
                width: '38px', height: '22px', flexShrink: 0,
                background: platform.enabled ? meta.color : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                position: 'relative', transition: 'all 0.3s',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: platform.enabled ? '18px' : '2px',
                width: '18px', height: '18px',
                background: '#fff', borderRadius: '50%',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>

            <span style={{ fontSize: '18px', flexShrink: 0 }}>{meta.icon}</span>

            {/* Handle Input */}
            <input
              type="text"
              value={platform.handle}
              onChange={(e) => updateHandle(platform.id, e.target.value)}
              placeholder={meta.placeholder}
              disabled={!platform.enabled}
              style={{
                flex: 1, background: 'transparent',
                border: 'none',
                color: platform.enabled ? '#fff' : 'rgba(255,255,255,0.2)',
                fontSize: '13px', fontWeight: 500, fontFamily: 'Montserrat, sans-serif',
                outline: 'none', minWidth: '0'
              }}
            />

            {/* Reorder Arrows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
              <button
                onClick={() => moveUp(platform.id)}
                disabled={idx === 0}
                style={{
                  background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer',
                  color: idx === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.3)',
                  fontSize: '10px', padding: '0 4px', lineHeight: 1,
                }}
              >▲</button>
              <button
                onClick={() => moveDown(platform.id)}
                disabled={idx === sorted.length - 1}
                style={{
                  background: 'none', border: 'none',
                  cursor: idx === sorted.length - 1 ? 'default' : 'pointer',
                  color: idx === sorted.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.3)',
                  fontSize: '10px', padding: '0 4px', lineHeight: 1,
                }}
              >▼</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlatformConfigurator;