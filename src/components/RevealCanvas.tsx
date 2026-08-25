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
    __profileImg_ref__: HTMLImageElement | undefined;
    __croppedProfileImg_ref__: HTMLImageElement | undefined;
  }
}

function formatFileTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// Static Developer details bound directly to CONFIG URLs
const DEV_HUB = {
  username: CONFIG.username,
  socials: [
    { id: 'instagram', name: 'instagram', url: CONFIG.instagramUrl },
    { id: 'youtube',   name: 'youtube',   url: CONFIG.youtubeUrl },
    { id: 'facebook',  name: 'facebook',  url: CONFIG.facebookUrl },
    { id: 'github',    name: 'github',    url: CONFIG.githubUrl },
  ]
};

const BRAND_ICONS = {
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
      <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.31.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.28-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  ),
};

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const isRunningRef = useRef(false);
  const tickPlayedRef = useRef<Set<number>>(new Set());
  const prevCountdownNumRef = useRef(-1);
  const autoDownloadRef = useRef(autoDownload);
  const recStartTimeRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef('');
  const isRecordingRef = useRef(false);
  const thumbnailRecordingRef = useRef(false);
  const userConfigRef = useRef(userConfig);
  const stopFinalizeRef = useRef<(() => void) | null>(null);

  const [showReplay, setShowReplay] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);

  const is169 = aspectRatio === '16:9';
  const COMP_W = is169 ? 1920 : 1080;
  const COMP_H = is169 ? 1080 : 1920;
  const T = CONFIG.timeline;
  const TOTAL = T.finalCtaEnd;
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : COMP_W,
    h: typeof window !== 'undefined' ? window.innerHeight : COMP_H,
  });

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => { autoDownloadRef.current = autoDownload; }, [autoDownload]);
  useEffect(() => { userConfigRef.current = userConfig; }, [userConfig]);

  /* ── Load profile image ─────────────────────────────────── */
  useEffect(() => {
    if (userConfig?.profileImageDataUrl) {
      const img = new Image();
      img.onload = () => { window.__croppedProfileImg_ref__ = img; };
      img.src = userConfig.profileImageDataUrl;
    } else {
      window.__croppedProfileImg_ref__ = undefined;
    }

    if (!window.__profileImg_ref__) {
      const img = new Image();
      img.src = CONFIG.profileImage;
      img.onload = () => { window.__profileImg_ref__ = img; };
      img.onerror = () => {
        const ph = document.createElement('canvas');
        ph.width = 600;
        ph.height = 900;
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

  /* ── Recording ───────────────────────────────────────────── */
  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    if (mediaRecorderRef.current?.state !== 'inactive') {
      try { mediaRecorderRef.current?.stop(); } catch { }
    }

    stopFinalizeRef.current = null;
    recordedChunksRef.current = [];
    setRecordingDone(false);

    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    const mime = candidates.find(m => {
      try { return MediaRecorder.isTypeSupported(m); }
      catch { return false; }
    }) ?? 'video/webm';

    mimeTypeRef.current = mime;

    let videoStream: MediaStream;

    try {
      videoStream = canvas.captureStream(60);
    } catch {
      try {
        videoStream = canvas.captureStream(30);
      } catch {
        videoStream = canvas.captureStream();
      }
    }

    const audioStream = audioManager.getStream();

    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => {
        videoStream.addTrack(track);
      });
    }

    let mr: MediaRecorder;

    try {
      mr = new MediaRecorder(videoStream, {
        mimeType: mime,
        videoBitsPerSecond: 12_000_000,
        audioBitsPerSecond: 192_000,
      });
    } catch {
      try {
        mr = new MediaRecorder(videoStream, { mimeType: mime });
      } catch {
        try {
          mr = new MediaRecorder(videoStream);
        } catch (e) {
          console.error('MediaRecorder instantiation failed:', e);
          return false;
        }
      }
    }

    mr.ondataavailable = event => {
      if (event.data?.size > 0) recordedChunksRef.current.push(event.data);

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
      if (!chunks.length) return;

      const raw = new Blob(chunks, { type: mime });
      const durationMs = performance.now() - recStartTimeRef.current;
      const seekable = await makeSeekableWebM(raw, durationMs);

      const url = URL.createObjectURL(seekable);
      const a = document.createElement('a');

      a.href = url;
      a.download = `reveal-${aspectRatio.replace(':', 'x')}-${formatFileTimestamp()}.webm`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setRecordingDone(true);
      setShowReplay(true);
    };

    mr.onerror = event => {
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

  /* ── Stop recording ──────────────────────────────────────── */
  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;

    let finished = false;

    const finalize = () => {
      if (finished) return;
      finished = true;
      stopFinalizeRef.current = null;

      try {
        if (mr.state !== 'inactive') mr.stop();
      } catch { }
    };

    const onFlushConfirmed = () => setTimeout(finalize, 500);
    stopFinalizeRef.current = onFlushConfirmed;

    try {
      mr.requestData();
    } catch {
      stopFinalizeRef.current = null;
      finalize();
      return;
    }

    setTimeout(() => {
      if (stopFinalizeRef.current === onFlushConfirmed) {
        stopFinalizeRef.current = null;
      }
      finalize();
    }, 2000);
  }, []);

  /* ── Thumbnail + recording start ─────────────────────────── */
  const startWithThumbnail = useCallback((afterStart: () => void) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      afterStart();
      return;
    }

    drawFirstFrame(canvas, COMP_W, COMP_H, is169);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const started = startRecording();

          if (!started) {
            afterStart();
            return;
          }

          thumbnailRecordingRef.current = true;

          setTimeout(() => {
            thumbnailRecordingRef.current = false;
            afterStart();
          }, 600);
        });
      });
    });
  }, [COMP_W, COMP_H, is169, startRecording]);

  /* ── Audio ───────────────────────────────────────────────── */
  const handleAudio = useCallback((t: number) => {
    if (!tickPlayedRef.current.has(0) && t >= T.introStart) {
      tickPlayedRef.current.add(0);
      audioManager.play('intro', 0.7, false);
    }
  }, [T]);

  /* ── Particles ───────────────────────────────────────────── */
  const manageParticles = useCallback((W: number, H: number, t: number) => {
    const particles = particlesRef.current;
    const spawnRate = t >= T.revealAt ? 4 : 1;

    if (Math.random() < 0.3 * spawnRate) {
      particles.push(createFloatParticle(W, H));
    }

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

    if (particles.length > 400) {
      particles.splice(0, particles.length - 350);
    }
  }, [T]);

  /* ── Draw ────────────────────────────────────────────────── */
  const draw = useCallback((
    ctx: CanvasRenderingContext2D,
    elapsed: number,
  ) => {
    const W = COMP_W;
    const H = COMP_H;
    const t = Math.min(elapsed / 1000, TOTAL);
    const cfg = userConfigRef.current;
    const activePlatforms = cfg?.platforms;

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    drawBackground(ctx, W, H, t);
    manageParticles(W, H, t);

    if (t < T.introEnd) {
      drawIntro(ctx, W, H, t, is169);
    } else if (t < T.suspenseEnd) {
      drawSuspense(ctx, W, H, t, is169);
    } else if (t < T.scanEnd) {
      drawScan(ctx, W, H, t, is169);
    } else if (t < T.countdownEnd) {
      drawCountdown(ctx, W, H, t, is169, T);
    } else if (t < T.revealAnimEnd) {
      drawReveal(ctx, W, H, t, is169);
    } else if (t < T.thatsMeEnd) {
      drawThatsMe(ctx, W, H, t, is169);
    } else if (t < T.socialCardsEnd) {
      drawSocialCards(ctx, W, H, t, is169, activePlatforms);
    } else {
      drawFinalCTA(ctx, W, H, t, is169, activePlatforms);
    }

    particlesRef.current = particlesRef.current
      .map(updateParticle)
      .filter(p => p.life < p.maxLife);

    particlesRef.current.forEach(p => drawParticle(ctx, p));

    drawVignette(ctx, W, H);
    ctx.restore();

    handleAudio(t);
  }, [
    COMP_W, COMP_H, is169, T, TOTAL,
    handleAudio, manageParticles,
  ]);

  /* ── Loop ────────────────────────────────────────────────── */
  const loopRef = useRef<(() => void) | null>(null);

  const loop = useCallback(() => {
    if (!isRunningRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (thumbnailRecordingRef.current) {
      animFrameRef.current = requestAnimationFrame(
        () => loopRef.current?.(),
      );
      return;
    }

    const elapsed = performance.now() - startTimeRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) draw(ctx, elapsed);

    if (elapsed / 1000 < TOTAL + 0.5) {
      animFrameRef.current = requestAnimationFrame(
        () => loopRef.current?.(),
      );
    } else {
      isRunningRef.current = false;

      if (isRecordingRef.current) {
        stopRecording();
      } else {
        setShowReplay(true);
      }
    }
  }, [draw, TOTAL, stopRecording]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  /* ── Reset ───────────────────────────────────────────────── */
  const resetState = useCallback(() => {
    isRunningRef.current = true;
    startTimeRef.current = performance.now();
    tickPlayedRef.current = new Set();
    particlesRef.current = [];
    prevCountdownNumRef.current = -1;
    thumbnailRecordingRef.current = false;

    resetGroupY('reveal');
    resetGroupY('social');
    resetGroupY('cta');

    setShowReplay(false);
    setRecordingDone(false);

    audioManager.stopAll();
  }, []);

  /* ── Replay ──────────────────────────────────────────────── */
  const handleReplay = useCallback(() => {
    resetState();

    animFrameRef.current = requestAnimationFrame(
      () => loopRef.current?.(),
    );
  }, [resetState]);

  /* ── Replay + Download ───────────────────────────────────── */
  const handleReplayAndDownload = useCallback(() => {
    resetState();

    startWithThumbnail(() => {
      startTimeRef.current = performance.now();

      animFrameRef.current = requestAnimationFrame(
        () => loopRef.current?.(),
      );
    });
  }, [resetState, startWithThumbnail]);

  /* ── Initialization ──────────────────────────────────────── */
  useEffect(() => {
    let active = true;

    const init = async () => {
      await audioManager.preload(muted);
      if (!active) return;

      if (autoDownloadRef.current) {
        resetState();

        startWithThumbnail(() => {
          if (!active) return;

          startTimeRef.current = performance.now();

          animFrameRef.current = requestAnimationFrame(
            () => loopRef.current?.(),
          );
        });
      } else {
        resetState();
        startTimeRef.current = performance.now();

        animFrameRef.current = requestAnimationFrame(
          () => loopRef.current?.(),
        );
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
        try { mr.stop(); } catch { }
      }
    };
  }, [
    aspectRatio,
    muted,
    startWithThumbnail,
    resetState,
    autoDownload,
  ]);

  /* ── Canvas scaling ───────────────────────────────────────── */
  const compAR = COMP_W / COMP_H;
  const vpAR = viewport.w / viewport.h;
  let displayW: number, displayH: number;
  if (compAR > vpAR) {
    displayW = viewport.w;
    displayH = viewport.w / compAR;
  } else {
    displayH = viewport.h;
    displayW = viewport.h * compAR;
  }

  return (
    <div
      ref={containerRef}
      className="rc-container"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        width={COMP_W}
        height={COMP_H}
        style={{
          display: 'block',
          width: displayW,
          height: displayH,
          flexShrink: 0,
        }}
      />

      {isRecording && (
        <div
          className="rc-rec-indicator"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,60,60,0.5)',
            borderRadius: 40,
            padding: '7px 16px',
            pointerEvents: 'none',
          }}
        >
          <span className="rc-rec-dot" />
          <span className="rc-rec-text">REC</span>
        </div>
      )}

      {showReplay && (
        <div
          className="rc-replay-wrapper"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'min(560px, calc(100vw - 24px))',
            pointerEvents: 'auto',
          }}
        >
          <div
            className="rc-replay-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(0,0,0,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: '22px 28px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
              textAlign: 'center',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {recordingDone && (
              <p className="rc-success-msg" style={{ margin: 0, color: '#44ff88', fontWeight: 600, fontSize: 13 }}>
                ✓ Video downloaded!
              </p>
            )}

            <p className="rc-panel-label" style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: 3, color: 'rgba(255,255,255,0.35)' }}>
              ANIMATION COMPLETE
            </p>

            {/* Static Developer Redirection Hub (Always points directly to your CONFIG urls) */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                width: '100%', 
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 215, 0, 0.15)',
                borderRadius: '12px',
                padding: '12px',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.03)'
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '2px', color: '#ffd700', textTransform: 'uppercase' }}>
                SUPPORT THE DEVELOPER ({DEV_HUB.username})
              </span>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {DEV_HUB.socials.map(social => {
                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'rgba(255, 215, 0, 0.08)',
                        border: '1px solid rgba(255, 215, 0, 0.35)',
                        borderRadius: '20px',
                        color: '#ffd700',
                        textDecoration: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.borderColor = '#ffd700';
                        e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.35)';
                        e.currentTarget.style.background = 'rgba(255, 215, 0, 0.08)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {BRAND_ICONS[social.name as keyof typeof BRAND_ICONS] || '🔗'}
                      <span>{social.name.toUpperCase()}</span>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="rc-btn-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              <button
                className="rc-replay-btn"
                onClick={handleReplay}
                style={{
                  flex: '1 1 140px',
                  padding: '12px 24px',
                  background: 'rgba(153,51,255,0.2)',
                  border: '1px solid rgba(153,51,255,0.5)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2,
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                ▶ REPLAY
              </button>

              <button
                className="rc-download-btn"
                onClick={handleReplayAndDownload}
                style={{
                  flex: '1 1 180px',
                  padding: '12px 24px',
                  background: 'rgba(255,215,0,0.18)',
                  border: '1px solid rgba(255,215,0,0.5)',
                  borderRadius: 8,
                  color: '#ffd700',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2,
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                ⬇ REPLAY + DOWNLOAD
              </button>
            </div>

            <div className="rc-panel-divider" style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />

            <div className="rc-btn-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              {[
                {
                  label: '↩ MENU',
                  onClick: () => {
                    setShowReplay(false);
                    onReplay();
                  },
                },
                {
                  label: '16:9',
                  onClick: () => {
                    setShowReplay(false);
                    onReplay('16:9');
                  },
                },
                {
                  label: '9:16',
                  onClick: () => {
                    setShowReplay(false);
                    onReplay('9:16');
                  },
                },
              ].map(({ label, onClick }) => (
                <button
                  key={label}
                  className="rc-sec-btn"
                  onClick={onClick}
                  style={{
                    padding: '9px 16px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: 2,
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevealCanvas;