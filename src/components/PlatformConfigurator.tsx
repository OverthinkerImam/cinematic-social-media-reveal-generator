// src/components/PlatformConfigurator.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { PlatformConfig } from '@/types';

interface PlatformConfiguratorProps {
  platforms: PlatformConfig[];
  onChange: (platforms: PlatformConfig[]) => void;
}

const PLATFORM_META: Record<string, { label: string; icon: string; placeholder: string; color: string }> = {
  instagram: { label: 'Instagram', icon: '📸', placeholder: '@yourhandle',      color: '#e1306c' },
  youtube:   { label: 'YouTube',   icon: '▶️',  placeholder: '@YourChannel',     color: '#ff0000' },
  facebook:  { label: 'Facebook',  icon: '👤',  placeholder: '@YourPage',        color: '#1877f2' },
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

  // Drag-and-drop reorder
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
  const enabledCount = sorted.filter(p => p.enabled).length;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase' }}>
          SOCIAL PLATFORMS
        </span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>
          {enabledCount} selected · drag to reorder
        </span>
      </div>

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
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: platform.enabled
                ? 'rgba(120,40,255,0.08)'
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isDragTarget
                ? 'rgba(255,215,0,0.6)'
                : platform.enabled
                  ? 'rgba(180,100,255,0.3)'
                  : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '10px',
              transition: 'all 0.2s',
              cursor: 'grab',
              opacity: isDragTarget ? 0.7 : 1,
            }}
          >
            {/* Drag handle */}
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px', cursor: 'grab', flexShrink: 0 }}>
              ⠿
            </span>

            {/* Toggle */}
            <button
              onClick={() => togglePlatform(platform.id)}
              style={{
                width: '36px', height: '20px', flexShrink: 0,
                background: platform.enabled ? meta.color : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: '10px', cursor: 'pointer',
                position: 'relative', transition: 'all 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: platform.enabled ? '18px' : '2px',
                width: '16px', height: '16px',
                background: '#fff', borderRadius: '50%',
                transition: 'left 0.2s',
              }} />
            </button>

            {/* Icon + name */}
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{meta.icon}</span>
            <span style={{
              color: platform.enabled ? '#fff' : 'rgba(255,255,255,0.35)',
              fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
              width: '72px', flexShrink: 0,
            }}>
              {meta.label}
            </span>

            {/* Handle input */}
            <input
              type="text"
              value={platform.handle}
              onChange={(e) => updateHandle(platform.id, e.target.value)}
              placeholder={meta.placeholder}
              disabled={!platform.enabled}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', padding: '5px 10px',
                color: platform.enabled ? '#fff' : 'rgba(255,255,255,0.25)',
                fontSize: '12px', fontFamily: 'Montserrat, sans-serif',
                outline: 'none',
                minWidth: 0,
              }}
            />

            {/* Order arrows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
              <button
                onClick={() => moveUp(platform.id)}
                disabled={idx === 0}
                style={{
                  background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer',
                  color: idx === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.45)',
                  fontSize: '10px', padding: '1px 4px', lineHeight: 1,
                }}
              >▲</button>
              <button
                onClick={() => moveDown(platform.id)}
                disabled={idx === sorted.length - 1}
                style={{
                  background: 'none', border: 'none',
                  cursor: idx === sorted.length - 1 ? 'default' : 'pointer',
                  color: idx === sorted.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.45)',
                  fontSize: '10px', padding: '1px 4px', lineHeight: 1,
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