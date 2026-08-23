// src/components/ImageCropper.tsx
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const previewRef   = useRef<HTMLCanvasElement>(null);
  const imgRef       = useRef<HTMLImageElement | null>(null);
  const isDragging   = useRef(false);
  const dragStart    = useRef({ x: 0, y: 0 });
  const lastCrop     = useRef({ x: 0, y: 0 });

  const [cropPos, setCropPos]   = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(200);
  const [scale, setScale]       = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  const DISPLAY_SIZE = 420; // canvas display px
  const PREVIEW_SIZE = 180;

  // Load image and initialize crop
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      // Initial crop: centered square
      const initCropSize = minDim;
      const initX = (img.naturalWidth  - initCropSize) / 2;
      const initY = (img.naturalHeight - initCropSize) / 2;
      const s = DISPLAY_SIZE / Math.max(img.naturalWidth, img.naturalHeight);
      setScale(s);
      setCropSize(initCropSize * s);
      setCropPos({ x: initX * s, y: initY * s });
      lastCrop.current = { x: initX * s, y: initY * s };
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw on canvas whenever crop changes
  useEffect(() => {
    if (!imgLoaded || !imgRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;

    const dW = img.naturalWidth  * scale;
    const dH = img.naturalHeight * scale;
    canvas.width  = dW;
    canvas.height = dH;

    ctx.clearRect(0, 0, dW, dH);
    ctx.drawImage(img, 0, 0, dW, dH);

    // Darken outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, dW, dH);

    // Restore crop area
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropPos.x, cropPos.y, cropSize, cropSize);
    ctx.clip();
    ctx.drawImage(img, 0, 0, dW, dH);
    ctx.restore();

    // Crop border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth   = 2;
    ctx.strokeRect(cropPos.x, cropPos.y, cropSize, cropSize);

    // Corner handles
    const hSize = 12;
    ctx.fillStyle = '#ffd700';
    [
      [cropPos.x, cropPos.y],
      [cropPos.x + cropSize - hSize, cropPos.y],
      [cropPos.x, cropPos.y + cropSize - hSize],
      [cropPos.x + cropSize - hSize, cropPos.y + cropSize - hSize],
    ].forEach(([hx, hy]) => ctx.fillRect(hx, hy, hSize, hSize));

    // Rule of thirds
    ctx.strokeStyle = 'rgba(255,215,0,0.25)';
    ctx.lineWidth   = 1;
    for (let i = 1; i < 3; i++) {
      const x = cropPos.x + (cropSize / 3) * i;
      const y = cropPos.y + (cropSize / 3) * i;
      ctx.beginPath(); ctx.moveTo(x, cropPos.y); ctx.lineTo(x, cropPos.y + cropSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cropPos.x, y); ctx.lineTo(cropPos.x + cropSize, y); ctx.stroke();
    }

    // Update preview
    updatePreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgLoaded, cropPos, cropSize, scale]);

  const updatePreview = useCallback(() => {
    const preview = previewRef.current;
    const img = imgRef.current;
    if (!preview || !img) return;
    const ctx = preview.getContext('2d');
    if (!ctx) return;
    preview.width  = PREVIEW_SIZE;
    preview.height = PREVIEW_SIZE;

    const srcX = cropPos.x / scale;
    const srcY = cropPos.y / scale;
    const srcS = cropSize / scale;

    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE, 8);
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, srcS, srcS, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.restore();
  }, [cropPos, cropSize, scale]);

  const clampCrop = useCallback((x: number, y: number, size: number, imgW: number, imgH: number) => {
    const clampedX = Math.max(0, Math.min(x, imgW - size));
    const clampedY = Math.max(0, Math.min(y, imgH - size));
    return { x: clampedX, y: clampedY };
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
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
    const pos = getPos(e, canvas);
    if (
      pos.x >= cropPos.x && pos.x <= cropPos.x + cropSize &&
      pos.y >= cropPos.y && pos.y <= cropPos.y + cropSize
    ) {
      isDragging.current = true;
      dragStart.current  = pos;
      lastCrop.current   = { ...cropPos };
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const pos = getPos(e, canvas);
    const dx  = pos.x - dragStart.current.x;
    const dy  = pos.y - dragStart.current.y;
    const newX = lastCrop.current.x + dx;
    const newY = lastCrop.current.y + dy;
    const dW   = img.naturalWidth  * scale;
    const dH   = img.naturalHeight * scale;
    const clamped = clampCrop(newX, newY, cropSize, dW, dH);
    setCropPos(clamped);
  }, [clampCrop, cropSize, scale]);

  const handleMouseUp = () => { isDragging.current = false; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const dW  = img.naturalWidth  * scale;
    const dH  = img.naturalHeight * scale;
    const minS = Math.min(dW, dH) * 0.15;
    const maxS = Math.min(dW, dH);
    const delta   = e.deltaY > 0 ? -10 : 10;
    const newSize = Math.max(minS, Math.min(maxS, cropSize + delta));
    const cx  = cropPos.x + cropSize / 2;
    const cy  = cropPos.y + cropSize / 2;
    const newX = cx - newSize / 2;
    const newY = cy - newSize / 2;
    const clamped = clampCrop(newX, newY, newSize, dW, dH);
    setCropSize(newSize);
    setCropPos(clamped);
  };

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const output = document.createElement('canvas');
    const OUT_SIZE = 1024;
    output.width  = OUT_SIZE;
    output.height = OUT_SIZE;
    const ctx = output.getContext('2d');
    if (!ctx) return;

    const srcX = cropPos.x / scale;
    const srcY = cropPos.y / scale;
    const srcS = cropSize / scale;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, OUT_SIZE, OUT_SIZE, 0);
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, srcS, srcS, 0, 0, OUT_SIZE, OUT_SIZE);
    ctx.restore();

    onCropComplete(output.toDataURL('image/jpeg', 0.92));
  }, [cropPos, cropSize, scale, onCropComplete]);

  const canvasStyle: React.CSSProperties = {
    width:      '100%',
    maxWidth:   `${DISPLAY_SIZE}px`,
    cursor:     'move',
    borderRadius: '8px',
    border:     '1px solid rgba(255,255,255,0.12)',
    display:    'block',
    touchAction: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'rgba(15,5,30,0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '28px',
        maxWidth: '520px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 0 60px rgba(120,40,255,0.25)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>
            CROP PROFILE IMAGE
          </p>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: '6px 0 0', letterSpacing: '1px' }}>
            Select 1:1 Area
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '4px 0 0' }}>
            Drag to reposition · Scroll to resize
          </p>
        </div>

        {/* Canvas */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            style={canvasStyle}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>

        {/* Preview + size slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ flexShrink: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '2px', margin: '0 0 6px', textAlign: 'center', textTransform: 'uppercase' }}>
              PREVIEW
            </p>
            <canvas
              ref={previewRef}
              style={{ width: `${PREVIEW_SIZE}px`, height: `${PREVIEW_SIZE}px`, borderRadius: '8px', border: '1px solid rgba(255,215,0,0.3)', display: 'block' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '2px', margin: '0 0 8px', textTransform: 'uppercase' }}>
              CROP SIZE
            </p>
            <input
              type="range"
              min={0}
              max={100}
              value={(() => {
                const img = imgRef.current;
                if (!img) return 50;
                const minS = Math.min(img.naturalWidth, img.naturalHeight) * scale * 0.15;
                const maxS = Math.min(img.naturalWidth, img.naturalHeight) * scale;
                return ((cropSize - minS) / (maxS - minS)) * 100;
              })()}
              onChange={(e) => {
                const img = imgRef.current;
                if (!img) return;
                const dW  = img.naturalWidth  * scale;
                const dH  = img.naturalHeight * scale;
                const minS = Math.min(dW, dH) * 0.15;
                const maxS = Math.min(dW, dH);
                const newSize = minS + (Number(e.target.value) / 100) * (maxS - minS);
                const cx  = cropPos.x + cropSize / 2;
                const cy  = cropPos.y + cropSize / 2;
                const newX = cx - newSize / 2;
                const newY = cy - newSize / 2;
                const clamped = clampCrop(newX, newY, newSize, dW, dH);
                setCropSize(newSize);
                setCropPos(clamped);
              }}
              style={{ width: '100%', accentColor: '#ffd700' }}
            />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: '6px 0 0' }}>
              Output: 1024 × 1024 px
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '13px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
              color: 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: 600,
              letterSpacing: '2px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 2, padding: '13px',
              background: 'linear-gradient(135deg, #9933ff 0%, #6600cc 100%)',
              border: '1px solid rgba(180,100,255,0.5)', borderRadius: '10px',
              color: '#fff', fontSize: '13px', fontWeight: 800,
              letterSpacing: '3px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              boxShadow: '0 0 30px rgba(120,40,255,0.4)',
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