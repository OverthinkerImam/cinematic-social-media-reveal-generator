// src/components/RevealCanvas.tsx
'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { AspectRatio, Particle, UserConfig } from '@/types';
import { CONFIG } from '@/config';
import { audioManager } from '@/utils/audioManager';
import { makeSeekableWebM } from '@/utils/webmFix';
import {
  createFloatParticle, createBurstParticles,
  createConfettiParticles, updateParticle, drawParticle,
} from '@/types/particles';
import {
  drawBackground, drawVignette, drawFirstFrame,
  drawIntro, drawSuspense, drawScan,
  drawCountdown, drawReveal, drawThatsMe,
  drawSocialCards, drawFinalCTA,
  resetGroupY,
} from '@/utils/canvasDraw';

declare global {
  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
  }
  interface Window {
    __profileImg_ref__:        HTMLImageElement | undefined;
    __croppedProfileImg_ref__: HTMLImageElement | undefined;
  }
}

/** Formats the current date/time as YYYY-MM-DD_HH-MM-SS for use in filenames (no milliseconds). */
function formatFileTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `${date}_${time}`;
}

interface RevealCanvasProps {
  aspectRatio: AspectRatio;
  muted: boolean;
  autoDownload?: boolean;
  userConfig?: UserConfig;
  onReplay: (ratio?: AspectRatio) => void;
}

const RevealCanvas: React.FC<RevealCanvasProps> = ({
  aspectRatio, muted, autoDownload = false, userConfig, onReplay,
}) => {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const animFrameRef    = useRef<number>(0);
  const startTimeRef    = useRef<number>(0);
  const particlesRef    = useRef<Particle[]>([]);
  const isRunningRef    = useRef(false);
  const tickPlayedRef   = useRef<Set<number>>(new Set());
  const prevCountdownNumRef = useRef<number>(-1);
  const autoDownloadRef = useRef(autoDownload);
  const recStartTimeRef = useRef<number>(0);
  const mediaRecorderRef    = useRef<MediaRecorder | null>(null);
  const recordedChunksRef   = useRef<Blob[]>([]);
  const mimeTypeRef         = useRef<string>('');
  const isRecordingRef      = useRef(false);
  const thumbnailRecordingRef = useRef(false);
  const userConfigRef       = useRef(userConfig);
  const stopFinalizeRef     = useRef<(() => void) | null>(null);

  const [showReplay, setShowReplay]     = useState(false);
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);

  const is169  = aspectRatio === '16:9';
  const COMP_W = is169 ? 1920 : 1080;
  const COMP_H = is169 ? 1080 : 1920;
  const T      = CONFIG.timeline;
  const TOTAL  = T.finalCtaEnd;

  useEffect(() => { autoDownloadRef.current = autoDownload; }, [autoDownload]);
  useEffect(() => { userConfigRef.current = userConfig; }, [userConfig]);

  /* ── Load profile image ───────────────────────────────────── */
  useEffect(() => {
    // Load cropped image if provided
    if (userConfig?.profileImageDataUrl) {
      const img = new Image();
      img.onload = () => { window.__croppedProfileImg_ref__ = img; };
      img.src = userConfig.profileImageDataUrl;
    } else {
      window.__croppedProfileImg_ref__ = undefined;
    }

    // Always ensure default profile image is loaded
    if (!window.__profileImg_ref__) {
      const img = new Image();
      img.src = CONFIG.profileImage;
      img.onload = () => { window.__profileImg_ref__ = img; };
      img.onerror = () => {
        const ph = document.createElement('canvas');
        ph.width = 600; ph.height = 900;
        const c = ph.getContext('2d')!;
        const g = c.createLinearGradient(0, 0, 600, 900);
        g.addColorStop(0, '#2a0a5a');
        g.addColorStop(0.5, '#6611cc');
        g.addColorStop(1, '#ff6600');
        c.fillStyle = g;
        c.fillRect(0, 0, 600, 900);
        const d = new Image();
        d.src = ph.toDataURL();
        d.onload = () => { window.__profileImg_ref__ = d; };
      };
    }
  }, [userConfig?.profileImageDataUrl]);

  /* ── Recording ────────────────────────────────────────────── */
  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    if (mediaRecorderRef.current?.state !== 'inactive') {
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    }
    // Clear out any pending finalize handler from a previous recording
    stopFinalizeRef.current = null;

    recordedChunksRef.current = [];
    setRecordingDone(false);

    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=avc1',
      'video/mp4'
    ];
    const mime = candidates.find(m => {
      try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
    }) ?? 'video/webm';
    mimeTypeRef.current = mime;

    let stream: MediaStream;
    try {
      // Try high-performance capture (60fps)
      stream = canvas.captureStream ? canvas.captureStream(60) : (canvas as any).mozCaptureStream(60);
    } catch (e) {
      try {
        // Fallback to standard 30fps
        stream = canvas.captureStream ? canvas.captureStream(30) : (canvas as any).mozCaptureStream(30);
      } catch (e2) {
        try {
          // System default capture rate fallback
          stream = canvas.captureStream ? canvas.captureStream() : (canvas as any).mozCaptureStream();
        } catch (e3) {
          console.error('Canvas captureStream initialization failed:', e3);
          return false;
        }
      }
    }

    let mr: MediaRecorder;
    try {
      // Try recording at 12 Mbps for maximum visual quality
      mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    } catch (e) {
      try {
        // Fallback to 8 Mbps for broader system compatibility (e.g. older processors/mobile browser constraints)
        mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      } catch (e2) {
        try {
          mr = new MediaRecorder(stream, { mimeType: mime });
        } catch (e3) {
          try {
            mr = new MediaRecorder(stream);
          } catch (e4) {
            console.error('MediaRecorder instantiation failed:', e4);
            return false;
          }
        }
      }
    }

    mr.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
      // If a flush was requested via stopRecording(), this is our signal
      // that the encoder has handed over its buffered frames.
      if (stopFinalizeRef.current) {
        const finalize = stopFinalizeRef.current;
        stopFinalizeRef.current = null;
        finalize();
      }
    };

    mr.onstop = async () => {
      isRecordingRef.current = false;
      setIsRecording(false);
      thumbnailRecordingRef.current = false;
      stopFinalizeRef.current = null;

      const chunks = recordedChunksRef.current;
      if (!chunks.length) { console.warn('No recorded data'); return; }

      const raw       = new Blob(chunks, { type: mime });
      const durationMs = performance.now() - recStartTimeRef.current;
      const seekable  = await makeSeekableWebM(raw, durationMs);
      const url = URL.createObjectURL(seekable);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `reveal-${aspectRatio.replace(':', 'x')}-${formatFileTimestamp()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setRecordingDone(true);
      setShowReplay(true);
    };

    mr.onerror = (event) => {
      console.error('MediaRecorder runtime error:', event);
      isRecordingRef.current = false;
      setIsRecording(false);
      thumbnailRecordingRef.current = false;
      stopFinalizeRef.current = null;
    };

    mr.start(100);
    mediaRecorderRef.current = mr;
    isRecordingRef.current = true;
    setIsRecording(true);
    recStartTimeRef.current = performance.now();
    return true;
  }, [aspectRatio]);

  /* ── Stop recording ───────────────────────────────────────── */
  // Stopping on a fixed timer can cut the VP9 encoder off mid-cluster if
  // it's still catching up on buffered frames, which corrupts the final
  // GOP (shows up as decode corruption in the last ~1-2s of playback).
  // Instead, we wait for the encoder to confirm (via 'dataavailable')
  // that it actually flushed the buffered frames, then give it a short
  // grace period before calling stop(). A safety-net timeout guards
  // against 'dataavailable' never firing.
  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;

    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      stopFinalizeRef.current = null;
      try { if (mr.state !== 'inactive') mr.stop(); } catch { /* ignore */ }
    };

    // Grace period after the flush lands, to let the encoder pipeline
    // fully settle before we terminate it.
    const onFlushConfirmed = () => setTimeout(finalize, 500);
    stopFinalizeRef.current = onFlushConfirmed;

    try {
      mr.requestData();
    } catch {
      stopFinalizeRef.current = null;
      finalize();
      return;
    }

    // Safety net in case 'dataavailable' never fires for some reason
    setTimeout(() => {
      if (stopFinalizeRef.current === onFlushConfirmed) {
        stopFinalizeRef.current = null;
      }
      finalize();
    }, 2000);
  }, []);

  /* ── Thumbnail + recording start ──────────────────────────── */
  const startWithThumbnail = useCallback((afterStart: () => void) => {
    const canvas = canvasRef.current;
    if (!canvas) { afterStart(); return; }

    // Draw first frame immediately to avoid capturing empty/black frames
    drawFirstFrame(canvas, COMP_W, COMP_H, is169);

    // Wait for frames to queue to verify output and begin recording cleanly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const started = startRecording();
          if (!started) { afterStart(); return; }
          thumbnailRecordingRef.current = true;

          // Hold thumbnail for 600ms to allow recorder initialization
          setTimeout(() => {
            thumbnailRecordingRef.current = false;
            afterStart();
          }, 600);
        });
      });
    });
  }, [COMP_W, COMP_H, is169, startRecording]);

  /* ── Audio ────────────────────────────────────────────────── */
  const handleAudio = useCallback((t: number) => {
    if (!tickPlayedRef.current.has(0) && t >= T.introStart) {
      tickPlayedRef.current.add(0);
      audioManager.play('intro', 0.6, true);
    }
    const cdStart = T.countdownEnd - 6;
    [cdStart, cdStart + 2, cdStart + 4].forEach((mark, i) => {
      const key = 100 + i;
      if (!tickPlayedRef.current.has(key) && t >= mark) {
        tickPlayedRef.current.add(key);
        audioManager.play('tick', 0.8);
      }
    });
    if (!tickPlayedRef.current.has(200) && t >= T.revealAt) {
      tickPlayedRef.current.add(200);
      audioManager.stop('intro');
      audioManager.play('reveal', 0.9);
    }
    if (!tickPlayedRef.current.has(201) && t >= T.revealAt + 0.5) {
      tickPlayedRef.current.add(201);
      audioManager.play('celebration', 0.7);
    }
  }, [T]);

  /* ── Particles ────────────────────────────────────────────── */
  const manageParticles = useCallback((W: number, H: number, t: number) => {
    const particles  = particlesRef.current;
    const spawnRate  = t >= T.revealAt ? 4 : 1;
    if (Math.random() < 0.3 * spawnRate) particles.push(createFloatParticle(W, H));

    const cdStart = T.countdownEnd - 6;
    if (t >= cdStart && t < cdStart + 6) {
      const rel = t - cdStart;
      const num = rel < 2 ? 3 : rel < 4 ? 2 : 1;
      if (num !== prevCountdownNumRef.current) {
        prevCountdownNumRef.current = num;
        particles.push(...createBurstParticles(W / 2, H / 2, 18));
      }
    }
    if (t >= T.revealAt && t < T.revealAt + 0.3 && Math.random() < 0.8) {
      particles.push(...createBurstParticles(W / 2, H / 2, 5));
    }
    if (t >= T.revealAt + 0.2 && t < T.revealAt + 4 && Math.random() < 0.5) {
      particles.push(...createConfettiParticles(W, 3));
    }
    if (particles.length > 400) particles.splice(0, particles.length - 350);
  }, [T]);

  /* ── Draw ─────────────────────────────────────────────────── */
  const draw = useCallback((ctx: CanvasRenderingContext2D, elapsed: number) => {
    const W = COMP_W, H = COMP_H;
    const t = Math.min(elapsed / 1000, TOTAL);
    const cfg = userConfigRef.current;
    const activePlatforms = cfg?.platforms;

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx, W, H, t);
    manageParticles(W, H, t);

    if (t < T.introEnd)         drawIntro(ctx, W, H, t, is169);
    else if (t < T.suspenseEnd) drawSuspense(ctx, W, H, t, is169);
    else if (t < T.scanEnd)     drawScan(ctx, W, H, t, is169);
    else if (t < T.countdownEnd) drawCountdown(ctx, W, H, t, is169, T);
    else if (t < T.revealAnimEnd) drawReveal(ctx, W, H, t, is169);
    else if (t < T.thatsMeEnd)  drawThatsMe(ctx, W, H, t, is169);
    else if (t < T.socialCardsEnd) drawSocialCards(ctx, W, H, t, is169, activePlatforms);
    else drawFinalCTA(ctx, W, H, t, is169, activePlatforms);

    particlesRef.current = particlesRef.current
      .map(updateParticle)
      .filter(p => p.life < p.maxLife);
    particlesRef.current.forEach(p => drawParticle(ctx, p));
    drawVignette(ctx, W, H);
    ctx.restore();
    handleAudio(t);
  }, [COMP_W, COMP_H, is169, T, TOTAL, handleAudio, manageParticles]);

  /* ── Loop ref ─────────────────────────────────────────────── */
  const loopRef = useRef<(() => void) | null>(null);

  /* ── Loop ─────────────────────────────────────────────────── */
  const loop = useCallback(() => {
    if (!isRunningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (thumbnailRecordingRef.current) {
      animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
      return;
    }

    const elapsed = performance.now() - startTimeRef.current;
    const ctx     = canvas.getContext('2d');
    if (ctx) draw(ctx, elapsed);

    if (elapsed / 1000 < TOTAL + 0.5) {
      animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
    } else {
      isRunningRef.current = false;
      if (isRecordingRef.current) stopRecording();
      else setShowReplay(true);
    }
  }, [draw, TOTAL, stopRecording]);

  useEffect(() => { loopRef.current = loop; }, [loop]);

  /* ── Reset ────────────────────────────────────────────────── */
  const resetState = useCallback(() => {
    isRunningRef.current = true;
    startTimeRef.current = performance.now();
    tickPlayedRef.current = new Set();
    particlesRef.current  = [];
    prevCountdownNumRef.current = -1;
    thumbnailRecordingRef.current = false;
    resetGroupY('reveal');
    resetGroupY('social');
    resetGroupY('cta');
    setShowReplay(false);
    setRecordingDone(false);
    audioManager.stopAll();
  }, []);

  /* ── Replay ───────────────────────────────────────────────── */
  const handleReplay = useCallback(() => {
    resetState();
    animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
  }, [resetState]);

  /* ── Replay + Download ────────────────────────────────────── */
  const handleReplayAndDownload = useCallback(() => {
    resetState();
    startWithThumbnail(() => {
      startTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
    });
  }, [resetState, startWithThumbnail]);

  /* ── Mount & Aspect Ratio Switch Initialization ────────────── */
  useEffect(() => {
    let active = true;

    const init = async () => {
      await audioManager.preload(muted);
      if (!active) return;

      // Handle both "START REVEAL" and aspect-ratio changes dynamically
      if (autoDownloadRef.current) {
        resetState();
        startWithThumbnail(() => {
          if (!active) return;
          startTimeRef.current = performance.now();
          animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
        });
      } else {
        resetState();
        startTimeRef.current = performance.now();
        animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
      }
    };

    init();

    return () => {
      active = false;
      isRunningRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      audioManager.stopAll();
      stopFinalizeRef.current = null;
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') { 
        try { mr.stop(); } catch { /* ignore */ } 
      }
    };
  }, [aspectRatio, muted, startWithThumbnail, resetState, autoDownload]);

  /* ── Canvas scaling ───────────────────────────────────────── */
  const vpW   = typeof window !== 'undefined' ? window.innerWidth  : COMP_W;
  const vpH   = typeof window !== 'undefined' ? window.innerHeight : COMP_H;
  const compAR = COMP_W / COMP_H;
  const vpAR   = vpW / vpH;
  let displayW: number, displayH: number;
  if (compAR > vpAR) { displayW = vpW; displayH = vpW / compAR; }
  else               { displayH = vpH; displayW = vpH * compAR; }

  return (
    <div ref={containerRef} className="rc-container">
      <canvas
        ref={canvasRef}
        width={COMP_W}
        height={COMP_H}
        style={{ display: 'block', width: displayW, height: displayH }}
      />

      {isRecording && (
        <div className="rc-rec-indicator">
          <span className="rc-rec-dot" />
          <span className="rc-rec-text">REC</span>
        </div>
      )}

      {showReplay && (
        <div className="rc-replay-wrapper">
          <div className="rc-replay-panel">
            {recordingDone && <p className="rc-success-msg">✓ Video downloaded!</p>}
            <p className="rc-panel-label">ANIMATION COMPLETE</p>

            <div className="rc-btn-row">
              <button className="rc-replay-btn"   onClick={handleReplay}>▶ REPLAY</button>
              <button className="rc-download-btn" onClick={handleReplayAndDownload}>⬇ REPLAY + DOWNLOAD</button>
            </div>

            <div className="rc-panel-divider" />

            <div className="rc-btn-row">
              {[
                { label: '↩ MENU',  onClick: () => { setShowReplay(false); onReplay(); } },
                { label: '16:9',    onClick: () => { setShowReplay(false); onReplay('16:9'); } },
                { label: '9:16',    onClick: () => { setShowReplay(false); onReplay('9:16'); } },
              ].map(({ label, onClick }) => (
                <button key={label} className="rc-sec-btn" onClick={onClick}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevealCanvas;