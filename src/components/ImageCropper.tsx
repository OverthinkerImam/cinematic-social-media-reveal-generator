// src/components/ImageCropper.tsx
'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

type DragAction = 'none' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

const LABEL_STYLE: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: 'clamp(10px, 1.7vw, 11px)',
  letterSpacing: '2.5px',
  textTransform: 'uppercase',
  margin: 0,
  fontWeight: 600,
};

/* Preview component declared outside parent component */
const PreviewShell: React.FC<{ canvasRefProp: React.RefObject<HTMLCanvasElement | null> }> = ({ canvasRefProp }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '8px', width: '100%', padding: '14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
  }}>
    <p style={{ ...LABEL_STYLE, textAlign: 'center' }}>LIVE PREVIEW</p>
    <canvas ref={canvasRefProp} className="ic-preview-canvas" />
  </div>
);

/* Self-contained Hold Button component declared outside parent component */
interface HoldButtonProps {
  style: React.CSSProperties;
  title: string;
  onAction: () => void;
  children: React.ReactNode;
}

const HoldButton: React.FC<HoldButtonProps> = ({ style, title, onAction, children }) => {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stopHold = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startHold = useCallback(() => {
    onAction();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(onAction, 40);
    }, 300);
  }, [onAction]);

  useEffect(() => {
    return () => stopHold();
  }, [stopHold]);

  return (
    <button
      style={style}
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        startHold();
      }}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={(e) => {
        e.preventDefault();
        startHold();
      }}
      onTouchEnd={stopHold}
      onTouchCancel={stopHold}
    >
      {children}
    </button>
  );
};

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const previewRefSm  = useRef<HTMLCanvasElement>(null); // mobile preview
  const previewRefLg  = useRef<HTMLCanvasElement>(null); // desktop preview
  const imgRef        = useRef<HTMLImageElement | null>(null);

  const dragAction = useRef<DragAction>('none');
  const dragStart  = useRef({ x: 0, y: 0 });
  const lastCrop   = useRef({ x: 0, y: 0 });
  const lastSize   = useRef(200);

  const [cropPos,   setCropPos]   = useState({ x: 0, y: 0 });
  const [cropSize,  setCropSize]  = useState(200);
  const [scale,     setScale]     = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [moveStep,  setMoveStep]  = useState(4);
  const [sizeStep,  setSizeStep]  = useState(6);
  const [imgDims,   setImgDims]   = useState({ w: 0, h: 0 });

  const cropPosRef  = useRef({ x: 0, y: 0 });
  const cropSizeRef = useRef(200);
  const scaleRef    = useRef(1);
  const moveStepRef = useRef(4);
  const sizeStepRef = useRef(6);

  const DISPLAY_SIZE = 560;

  useEffect(() => { cropPosRef.current  = cropPos;  }, [cropPos]);
  useEffect(() => { cropSizeRef.current = cropSize; }, [cropSize]);
  useEffect(() => { scaleRef.current    = scale;    }, [scale]);
  useEffect(() => { moveStepRef.current = moveStep; }, [moveStep]);
  useEffect(() => { sizeStepRef.current = sizeStep; }, [sizeStep]);

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

  const sizeSliderValue = useMemo(() => {
    if (!imgDims.w || !imgDims.h) return 100;
    const dW   = imgDims.w * scale;
    const dH   = imgDims.h * scale;
    const minS = Math.min(dW, dH) * 0.15;
    const maxS = Math.min(dW, dH);
    if (maxS <= minS) return 100;
    return ((cropSize - minS) / (maxS - minS)) * 100;
  }, [imgDims, scale, cropSize]);

  /* Draw the cropped region into a preview canvas */
  const drawPreview = useCallback((
    preview: HTMLCanvasElement | null,
    img: HTMLImageElement,
    srcX: number, srcY: number, srcS: number,
  ) => {
    if (!preview) return;
    const pc = preview.getContext('2d');
    if (!pc) return;
    const P = 320;
    preview.width  = P;
    preview.height = P;
    pc.clearRect(0, 0, P, P);
    pc.save();
    pc.beginPath();
    pc.roundRect(0, 0, P, P, 12);
    pc.clip();
    pc.drawImage(img, srcX, srcY, srcS, srcS, 0, 0, P, P);
    pc.restore();
  }, []);

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

    // Draw into BOTH preview canvases
    const srcX = cropPos.x / scale;
    const srcY = cropPos.y / scale;
    const srcS = cropSize / scale;
    drawPreview(previewRefSm.current, img, srcX, srcY, srcS);
    drawPreview(previewRefLg.current, img, srcX, srcY, srcS);
  }, [imgLoaded, cropPos, cropSize, scale, drawPreview]);

  useEffect(() => { redraw(); }, [redraw]);

  const move = useCallback((dx: number, dy: number) => {
    const img = imgRef.current;
    if (!img) return;
    const dW = img.naturalWidth  * scaleRef.current;
    const dH = img.naturalHeight * scaleRef.current;
    const cur = cropPosRef.current;
    const sz  = cropSizeRef.current;
    const clamped = clampCrop(cur.x + dx, cur.y + dy, sz, dW, dH);
    cropPosRef.current = clamped;
    setCropPos(clamped);
  }, [clampCrop]);

  const resizeCrop = useCallback((delta: number) => {
    const img = imgRef.current;
    if (!img) return;
    const dW   = img.naturalWidth  * scaleRef.current;
    const dH   = img.naturalHeight * scaleRef.current;
    const minS = Math.min(dW, dH) * 0.15;
    const maxS = Math.min(dW, dH);
    const cur  = cropSizeRef.current;
    const cp   = cropPosRef.current;

    const maxAllowed = Math.min(maxS, dW - cp.x, dH - cp.y);
    const newS = Math.max(minS, Math.min(maxAllowed, cur + delta));

    cropSizeRef.current = newS;
    setCropSize(newS);
  }, []);

  /* Direction callbacks for HoldButtons */
  const moveUp    = useCallback(() => move(0, -moveStepRef.current), [move]);
  const moveDown  = useCallback(() => move(0, moveStepRef.current), [move]);
  const moveLeft  = useCallback(() => move(-moveStepRef.current, 0), [move]);
  const moveRight = useCallback(() => move(moveStepRef.current, 0), [move]);

  const shrinkCrop = useCallback(() => resizeCrop(-sizeStepRef.current), [resizeCrop]);
  const growCrop   = useCallback(() => resizeCrop(sizeStepRef.current), [resizeCrop]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const step = moveStepRef.current;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); move(-step, 0); }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(step,  0); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); move(0, -step); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); move(0,  step); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); resizeCrop(sizeStepRef.current); }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); resizeCrop(-sizeStepRef.current); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move, resizeCrop]);

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

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getCanvasPos(e, canvas);
    const cp  = cropPosRef.current;
    const cs  = cropSizeRef.current;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const threshold = 24 * scaleX;

    const dTL = Math.hypot(pos.x - cp.x, pos.y - cp.y);
    const dTR = Math.hypot(pos.x - (cp.x + cs), pos.y - cp.y);
    const dBL = Math.hypot(pos.x - cp.x, pos.y - (cp.y + cs));
    const dBR = Math.hypot(pos.x - (cp.x + cs), pos.y - (cp.y + cs));

    if (dTL < threshold) { dragAction.current = 'resize-tl'; }
    else if (dTR < threshold) { dragAction.current = 'resize-tr'; }
    else if (dBL < threshold) { dragAction.current = 'resize-bl'; }
    else if (dBR < threshold) { dragAction.current = 'resize-br'; }
    else if (pos.x >= cp.x && pos.x <= cp.x + cs && pos.y >= cp.y && pos.y <= cp.y + cs) {
      dragAction.current = 'move';
    } else {
      dragAction.current = 'none';
      return;
    }

    dragStart.current = pos;
    lastCrop.current  = { ...cp };
    lastSize.current  = cs;
  };

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const pos = getCanvasPos(e, canvas);

    if (dragAction.current === 'none') {
      if (!('touches' in e)) {
        const cp = cropPosRef.current;
        const cs = cropSizeRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const threshold = 24 * scaleX;

        const dTL = Math.hypot(pos.x - cp.x, pos.y - cp.y);
        const dTR = Math.hypot(pos.x - (cp.x + cs), pos.y - cp.y);
        const dBL = Math.hypot(pos.x - cp.x, pos.y - (cp.y + cs));
        const dBR = Math.hypot(pos.x - (cp.x + cs), pos.y - (cp.y + cs));

        if (dTL < threshold || dBR < threshold) canvas.style.cursor = 'nwse-resize';
        else if (dTR < threshold || dBL < threshold) canvas.style.cursor = 'nesw-resize';
        else if (pos.x >= cp.x && pos.x <= cp.x + cs && pos.y >= cp.y && pos.y <= cp.y + cs) canvas.style.cursor = 'move';
        else canvas.style.cursor = 'default';
      }
      return;
    }

    if ('touches' in e) e.preventDefault();

    const dW = img.naturalWidth  * scaleRef.current;
    const dH = img.naturalHeight * scaleRef.current;

    if (dragAction.current === 'move') {
      const dx  = pos.x - dragStart.current.x;
      const dy  = pos.y - dragStart.current.y;
      const clamped = clampCrop(
        lastCrop.current.x + dx,
        lastCrop.current.y + dy,
        cropSizeRef.current, dW, dH
      );
      cropPosRef.current = clamped;
      setCropPos(clamped);
    } else {
      const minS = Math.min(dW, dH) * 0.15;
      const ox = lastCrop.current.x;
      const oy = lastCrop.current.y;
      const os = lastSize.current;

      let newS = os;
      let nx = ox;
      let ny = oy;

      if (dragAction.current === 'resize-br') {
        const w = pos.x - ox;
        const h = pos.y - oy;
        newS = Math.max(w, h);
        newS = Math.max(minS, Math.min(newS, dW - ox, dH - oy));
      } else if (dragAction.current === 'resize-tl') {
        const oppositeX = ox + os;
        const oppositeY = oy + os;
        const w = oppositeX - pos.x;
        const h = oppositeY - pos.y;
        newS = Math.max(w, h);
        newS = Math.max(minS, Math.min(newS, oppositeX, oppositeY));
        nx = oppositeX - newS;
        ny = oppositeY - newS;
      } else if (dragAction.current === 'resize-tr') {
        const oppositeX = ox;
        const oppositeY = oy + os;
        const w = pos.x - oppositeX;
        const h = oppositeY - pos.y;
        newS = Math.max(w, h);
        newS = Math.max(minS, Math.min(newS, dW - oppositeX, oppositeY));
        nx = oppositeX;
        ny = oppositeY - newS;
      } else if (dragAction.current === 'resize-bl') {
        const oppositeX = ox + os;
        const oppositeY = oy;
        const w = oppositeX - pos.x;
        const h = pos.y - oppositeY;
        newS = Math.max(w, h);
        newS = Math.max(minS, Math.min(newS, oppositeX, dH - oppositeY));
        nx = oppositeX - newS;
        ny = oppositeY;
      }

      cropSizeRef.current = newS;
      cropPosRef.current  = { x: nx, y: ny };
      setCropSize(newS);
      setCropPos({ x: nx, y: ny });
    }
  }, [clampCrop]);

  const handlePointerUp = () => {
    dragAction.current = 'none';
  };

  const handleMouseLeave = () => {
    dragAction.current = 'none';
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    resizeCrop(e.deltaY > 0 ? -sizeStepRef.current : sizeStepRef.current);
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

  const handleSizeSlider = (val: number) => {
    if (!imgDims.w || !imgDims.h) return;
    const dW   = imgDims.w * scale;
    const dH   = imgDims.h * scale;
    const minS = Math.min(dW, dH) * 0.15;
    const maxS = Math.min(dW, dH);
    const cp   = cropPosRef.current;
    const maxAllowed = Math.min(maxS, dW - cp.x, dH - cp.y);
    const newS = Math.max(minS, Math.min(maxAllowed, minS + (val / 100) * (maxS - minS)));
    cropSizeRef.current = newS;
    setCropSize(newS);
  };

  const arrowBtnStyle: React.CSSProperties = {
    width: 'clamp(40px, 9vw, 48px)',
    height: 'clamp(40px, 9vw, 48px)',
    background: 'rgba(120,40,255,0.15)',
    border: '1px solid rgba(180,100,255,0.35)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '17px', fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Montserrat, sans-serif',
    transition: 'all 0.15s',
    flexShrink: 0, userSelect: 'none', touchAction: 'manipulation',
  };

  const sizeBtnStyle: React.CSSProperties = {
    width: 'clamp(40px, 9vw, 48px)',
    height: 'clamp(40px, 9vw, 48px)',
    background: 'rgba(255,215,0,0.10)',
    border: '1px solid rgba(255,215,0,0.35)',
    borderRadius: '10px',
    color: '#ffd700',
    fontSize: '20px', fontWeight: 800,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Montserrat, sans-serif',
    flexShrink: 0, userSelect: 'none', touchAction: 'manipulation',
  };

  return (
    <div className="ic-overlay">
      <div className="ic-panel ic-panel-wide">
        <div style={{ textAlign: 'center' }}>
          <p style={LABEL_STYLE}>CROP PROFILE IMAGE</p>
          <h3 style={{
            color: '#fff', fontSize: 'clamp(17px, 3vw, 20px)',
            fontWeight: 800, margin: '5px 0 0', letterSpacing: '1px',
          }}>
            Select 1:1 Area
          </h3>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 'clamp(11px, 1.9vw, 12px)', margin: '4px 0 0',
          }}>
            Drag corners to resize (fixes opposite corner) · Drag box to move
          </p>
        </div>

        <div className="ic-grid">
          {/* LEFT: Canvas + desktop preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minWidth: 0 }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%', maxWidth: `${DISPLAY_SIZE}px`,
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'block', touchAction: 'none',
                }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onTouchCancel={handlePointerUp}
                onWheel={handleWheel}
              />
            </div>

            <div className="ic-preview-lg">
              <PreviewShell canvasRefProp={previewRefLg} />
            </div>
          </div>

          {/* RIGHT: mobile preview + controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>

            <div className="ic-preview-sm">
              <PreviewShell canvasRefProp={previewRefSm} />
            </div>

            {/* Move Controls */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '12px',
              padding: '14px', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', width: '100%', minWidth: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <p style={LABEL_STYLE}>MOVE CROP</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 140px', justifyContent: 'flex-end', minWidth: '140px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    step: <span style={{ color: '#ffd700', fontWeight: 700 }}>{moveStep}px</span>
                  </span>
                  <input type="range" min={1} max={30} step={1} value={moveStep}
                    onChange={e => setMoveStep(Number(e.target.value))}
                    style={{ width: '90px', accentColor: '#ffd700', cursor: 'pointer' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <HoldButton style={arrowBtnStyle} title="Move Up" onAction={moveUp}>▲</HoldButton>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <HoldButton style={arrowBtnStyle} title="Move Left" onAction={moveLeft}>◀</HoldButton>
                  <div style={{
                    width: 'clamp(40px, 9vw, 48px)', height: 'clamp(40px, 9vw, 48px)',
                    borderRadius: '50%', background: 'rgba(255,215,0,0.08)',
                    border: '1px solid rgba(255,215,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
                  }}>✛</div>
                  <HoldButton style={arrowBtnStyle} title="Move Right" onAction={moveRight}>▶</HoldButton>
                </div>
                <HoldButton style={arrowBtnStyle} title="Move Down" onAction={moveDown}>▼</HoldButton>
              </div>
            </div>

            {/* Size Controls */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '12px',
              padding: '14px', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', width: '100%', minWidth: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <p style={LABEL_STYLE}>CROP SIZE</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 140px', justifyContent: 'flex-end', minWidth: '140px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    step: <span style={{ color: '#ffd700', fontWeight: 700 }}>{sizeStep}px</span>
                  </span>
                  <input type="range" min={1} max={40} step={1} value={sizeStep}
                    onChange={e => setSizeStep(Number(e.target.value))}
                    style={{ width: '90px', accentColor: '#ffd700', cursor: 'pointer' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HoldButton style={sizeBtnStyle} title="Shrink" onAction={shrinkCrop}>−</HoldButton>
                <input type="range" min={0} max={100} step={0.5} value={sizeSliderValue}
                  onChange={e => handleSizeSlider(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#9933ff', cursor: 'pointer', minWidth: 0 }} />
                <HoldButton style={sizeBtnStyle} title="Grow" onAction={growCrop}>+</HoldButton>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>min</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>drag corners · opposite fixed</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>max</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
              <button onClick={onCancel} style={{
                flex: '1 1 100px', padding: '14px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(12px, 2vw, 13px)',
                fontWeight: 600, letterSpacing: '2px', cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
              }}>
                CANCEL
              </button>
              <button onClick={handleConfirm} style={{
                flex: '2 1 180px', padding: '14px',
                background: 'linear-gradient(135deg, #9933ff 0%, #6600cc 100%)',
                border: '1px solid rgba(180,100,255,0.45)', borderRadius: '10px',
                color: '#fff', fontSize: 'clamp(12px, 2vw, 13px)', fontWeight: 800,
                letterSpacing: '3px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                boxShadow: '0 0 28px rgba(120,40,255,0.38)',
              }}>
                ✓ USE THIS CROP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;