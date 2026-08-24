// src/components/ImageCropper.tsx
'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);

  const isDragging = useRef(false);
  const dragStart  = useRef({ x: 0, y: 0 });
  const lastCrop   = useRef({ x: 0, y: 0 });

  const [cropPos,   setCropPos]   = useState({ x: 0, y: 0 });
  const [cropSize,  setCropSize]  = useState(200);
  const [scale,     setScale]     = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [moveStep,  setMoveStep]  = useState(4);
  // Store dimensions in state so render never needs imgRef
  const [imgDims,   setImgDims]   = useState({ w: 0, h: 0 });

  const cropPosRef  = useRef({ x: 0, y: 0 });
  const cropSizeRef = useRef(200);
  const scaleRef    = useRef(1);

  const DISPLAY_SIZE = 400;

  useEffect(() => { cropPosRef.current  = cropPos;  }, [cropPos]);
  useEffect(() => { cropSizeRef.current = cropSize; }, [cropSize]);
  useEffect(() => { scaleRef.current    = scale;    }, [scale]);

  const clampCrop = useCallback((
    x: number, y: number, size: number, imgW: number, imgH: number
  ) => ({
    x: Math.max(0, Math.min(x, imgW - size)),
    y: Math.max(0, Math.min(y, imgH - size)),
  }), []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const minDim  = Math.min(img.naturalWidth, img.naturalHeight);
      const s       = DISPLAY_SIZE / Math.max(img.naturalWidth, img.naturalHeight);
      const initS   = minDim * s;
      const initX   = (img.naturalWidth  * s - initS) / 2;
      const initY   = (img.naturalHeight * s - initS) / 2;
      setScale(s);
      setCropSize(initS);
      setCropPos({ x: initX, y: initY });
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      cropPosRef.current  = { x: initX, y: initY };
      cropSizeRef.current = initS;
      scaleRef.current    = s;
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  /* ── Slider value derived purely from state (no refs) ───── */
  const sizeSliderValue = useMemo(() => {
    if (!imgDims.w || !imgDims.h) return 100;
    const dW   = imgDims.w * scale;
    const dH   = imgDims.h * scale;
    const minS = Math.min(dW, dH) * 0.15;
    const maxS = Math.min(dW, dH);
    if (maxS <= minS) return 100;
    return ((cropSize - minS) / (maxS - minS)) * 100;
  }, [imgDims, scale, cropSize]);

  const redraw = useCallback(() => {
    if (!imgLoaded || !imgRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;
    const dW  = img.naturalWidth  * scale;
    const dH  = img.naturalHeight * scale;
    canvas.width  = dW;
    canvas.height = dH;

    ctx.clearRect(0, 0, dW, dH);
    ctx.drawImage(img, 0, 0, dW, dH);

    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, dW, dH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(cropPos.x, cropPos.y, cropSize, cropSize);
    ctx.clip();
    ctx.drawImage(img, 0, 0, dW, dH);
    ctx.restore();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth   = Math.max(1.5, dW * 0.003);
    ctx.strokeRect(cropPos.x, cropPos.y, cropSize, cropSize);

    const hS = Math.max(10, cropSize * 0.05);
    const hw  = Math.max(2, hS * 0.25);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth   = hw;
    ctx.lineCap     = 'square';
    [
      { x: cropPos.x,            y: cropPos.y,            d: [1, 1]   },
      { x: cropPos.x + cropSize, y: cropPos.y,            d: [-1, 1]  },
      { x: cropPos.x,            y: cropPos.y + cropSize, d: [1, -1]  },
      { x: cropPos.x + cropSize, y: cropPos.y + cropSize, d: [-1, -1] },
    ].forEach(({ x, y, d }) => {
      ctx.beginPath();
      ctx.moveTo(x + d[0] * hS, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + d[1] * hS);
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(255,215,0,0.22)';
    ctx.lineWidth   = Math.max(1, dW * 0.001);
    ctx.lineCap     = 'butt';
    for (let i = 1; i < 3; i++) {
      const gx = cropPos.x + (cropSize / 3) * i;
      const gy = cropPos.y + (cropSize / 3) * i;
      ctx.beginPath(); ctx.moveTo(gx, cropPos.y); ctx.lineTo(gx, cropPos.y + cropSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cropPos.x, gy); ctx.lineTo(cropPos.x + cropSize, gy); ctx.stroke();
    }

    const preview = previewRef.current;
    if (preview) {
      const pc = preview.getContext('2d');
      if (pc) {
        const P = 320;
        preview.width  = P;
        preview.height = P;
        const srcX = cropPos.x / scale;
        const srcY = cropPos.y / scale;
        const srcS = cropSize / scale;
        pc.clearRect(0, 0, P, P);
        pc.save();
        pc.beginPath();
        pc.roundRect(0, 0, P, P, 12);
        pc.clip();
        pc.drawImage(img, srcX, srcY, srcS, srcS, 0, 0, P, P);
        pc.restore();
      }
    }
  }, [imgLoaded, cropPos, cropSize, scale]);

  useEffect(() => { redraw(); }, [redraw]);

  const move = useCallback((dx: number, dy: number) => {
    const img = imgRef.current;
    if (!img) return;
    const dW = img.naturalWidth  * scaleRef.current;
    const dH = img.naturalHeight * scaleRef.current;
    const cur = cropPosRef.current;
    const sz  = cropSizeRef.current;
    const clamped = clampCrop(cur.x + dx, cur.y + dy, sz, dW, dH);
    setCropPos(clamped);
  }, [clampCrop]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const step = moveStep;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); move(-step, 0); }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(step,  0); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); move(0, -step); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); move(0,  step); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move, moveStep]);

  const getCanvasPos = (
    e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement
  ) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getCanvasPos(e, canvas);
    const cp  = cropPosRef.current;
    const cs  = cropSizeRef.current;
    if (pos.x >= cp.x && pos.x <= cp.x + cs && pos.y >= cp.y && pos.y <= cp.y + cs) {
      isDragging.current = true;
      dragStart.current  = pos;
      lastCrop.current   = { ...cp };
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const pos = getCanvasPos(e, canvas);
    const dx  = pos.x - dragStart.current.x;
    const dy  = pos.y - dragStart.current.y;
    const dW  = img.naturalWidth  * scaleRef.current;
    const dH  = img.naturalHeight * scaleRef.current;
    const clamped = clampCrop(
      lastCrop.current.x + dx,
      lastCrop.current.y + dy,
      cropSizeRef.current, dW, dH
    );
    setCropPos(clamped);
  }, [clampCrop]);

  const handleMouseUp = () => { isDragging.current = false; };

  const handleTouchStart = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getCanvasPos(e, canvas);
    const cp  = cropPosRef.current;
    const cs  = cropSizeRef.current;
    if (pos.x >= cp.x && pos.x <= cp.x + cs && pos.y >= cp.y && pos.y <= cp.y + cs) {
      isDragging.current = true;
      dragStart.current  = pos;
      lastCrop.current   = { ...cp };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const pos = getCanvasPos(e, canvas);
    const dx  = pos.x - dragStart.current.x;
    const dy  = pos.y - dragStart.current.y;
    const dW  = img.naturalWidth  * scaleRef.current;
    const dH  = img.naturalHeight * scaleRef.current;
    const clamped = clampCrop(
      lastCrop.current.x + dx,
      lastCrop.current.y + dy,
      cropSizeRef.current, dW, dH
    );
    setCropPos(clamped);
  };

  const resizeCrop = useCallback((delta: number) => {
    const img = imgRef.current;
    if (!img) return;
    const dW   = img.naturalWidth  * scaleRef.current;
    const dH   = img.naturalHeight * scaleRef.current;
    const minS = Math.min(dW, dH) * 0.15;
    const maxS = Math.min(dW, dH);
    const cur  = cropSizeRef.current;
    const cp   = cropPosRef.current;
    const newS = Math.max(minS, Math.min(maxS, cur + delta));
    const cx   = cp.x + cur / 2;
    const cy   = cp.y + cur / 2;
    const clamped = clampCrop(cx - newS / 2, cy - newS / 2, newS, dW, dH);
    setCropSize(newS);
    setCropPos(clamped);
  }, [clampCrop]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    resizeCrop(e.deltaY > 0 ? -12 : 12);
  };

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const OUT  = 1024;
    const out  = document.createElement('canvas');
    out.width  = OUT;
    out.height = OUT;
    const ctx  = out.getContext('2d');
    if (!ctx) return;
    const srcX = cropPosRef.current.x / scaleRef.current;
    const srcY = cropPosRef.current.y / scaleRef.current;
    const srcS = cropSizeRef.current  / scaleRef.current;
    ctx.clearRect(0, 0, OUT, OUT);
    ctx.drawImage(img, srcX, srcY, srcS, srcS, 0, 0, OUT, OUT);
    onCropComplete(out.toDataURL('image/jpeg', 0.93));
  }, [onCropComplete]);

  /* Event handler — refs are fine here */
  const handleSizeSlider = (val: number) => {
    if (!imgDims.w || !imgDims.h) return;
    const dW   = imgDims.w * scale;
    const dH   = imgDims.h * scale;
    const minS = Math.min(dW, dH) * 0.15;
    const maxS = Math.min(dW, dH);
    const newS = minS + (val / 100) * (maxS - minS);
    const cx   = cropPos.x + cropSize / 2;
    const cy   = cropPos.y + cropSize / 2;
    const clamped = clampCrop(cx - newS / 2, cy - newS / 2, newS, dW, dH);
    setCropSize(newS);
    setCropPos(clamped);
  };

  const arrowBtnStyle = (disabled = false): React.CSSProperties => ({
    width: 'clamp(34px, 8vw, 38px)',
    height: 'clamp(34px, 8vw, 38px)',
    background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(120,40,255,0.15)',
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(180,100,255,0.35)'}`,
    borderRadius: '8px',
    color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)',
    fontSize: '15px', fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Montserrat, sans-serif',
    transition: 'all 0.15s',
    flexShrink: 0,
    userSelect: 'none',
    touchAction: 'manipulation',
  });

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 'clamp(9px, 1.6vw, 10px)',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    margin: 0,
  };

  return (
    <div className="ic-overlay">
      <div className="ic-panel">
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={labelStyle}>CROP PROFILE IMAGE</p>
          <h3 style={{
            color: '#fff', fontSize: 'clamp(15px, 3vw, 17px)',
            fontWeight: 800, margin: '5px 0 0', letterSpacing: '1px',
          }}>
            Select 1:1 Area
          </h3>
          <p style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 'clamp(10px, 1.8vw, 11px)', margin: '3px 0 0',
          }}>
            Drag to move · Scroll or slider to resize · Arrow keys supported
          </p>
        </div>

        {/* Canvas */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%', maxWidth: `${DISPLAY_SIZE}px`,
              cursor: 'move', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'block', touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          />
        </div>

        {/* Arrow controls + step slider */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '10px',
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px', flexWrap: 'wrap',
          }}>
            <p style={labelStyle}>MOVE CROP</p>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '8px', flex: '1 1 140px', justifyContent: 'flex-end',
              minWidth: '140px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', whiteSpace: 'nowrap' }}>
                step: <span style={{ color: '#ffd700', fontWeight: 700 }}>{moveStep}px</span>
              </span>
              <input
                type="range" min={0} max={30} step={1} value={moveStep}
                onChange={e => setMoveStep(Number(e.target.value))}
                style={{ width: '80px', accentColor: '#ffd700', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '4px',
          }}>
            <button style={arrowBtnStyle()} onClick={() => move(0, -moveStep)} title="Move Up">▲</button>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button style={arrowBtnStyle()} onClick={() => move(-moveStep, 0)} title="Move Left">◀</button>
              <div style={{
                width: 'clamp(34px, 8vw, 38px)',
                height: 'clamp(34px, 8vw, 38px)',
                borderRadius: '50%',
                background: 'rgba(255,215,0,0.08)',
                border: '1px solid rgba(255,215,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px',
              }}>✛</div>
              <button style={arrowBtnStyle()} onClick={() => move(moveStep, 0)}  title="Move Right">▶</button>
            </div>
            <button style={arrowBtnStyle()} onClick={() => move(0, moveStep)}  title="Move Down">▼</button>
          </div>
        </div>

        {/* Preview + size slider */}
        <div className="ic-preview-row">
          <div className="ic-preview-col">
            <p style={{ ...labelStyle, textAlign: 'center' }}>PREVIEW</p>
            <canvas ref={previewRef} className="ic-preview-canvas" />
          </div>

          <div className="ic-size-col">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={labelStyle}>CROP SIZE</p>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>scroll or drag</span>
            </div>
            <input
              type="range" min={0} max={100} step={0.5}
              value={sizeSliderValue}
              onChange={e => handleSizeSlider(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#9933ff', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>min</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>1024×1024</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>max</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onCancel}
            style={{
              flex: '1 1 100px', padding: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 'clamp(11px, 2vw, 12px)', fontWeight: 600,
              letterSpacing: '2px', cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: '2 1 180px', padding: '12px',
              background: 'linear-gradient(135deg, #9933ff 0%, #6600cc 100%)',
              border: '1px solid rgba(180,100,255,0.45)', borderRadius: '10px',
              color: '#fff',
              fontSize: 'clamp(11px, 2vw, 12px)', fontWeight: 800,
              letterSpacing: '3px', cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              boxShadow: '0 0 28px rgba(120,40,255,0.38)',
            }}
          >
            ✓ USE THIS CROP
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;