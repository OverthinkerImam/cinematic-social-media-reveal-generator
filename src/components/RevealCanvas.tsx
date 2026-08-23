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
      try { mediaRecorderRef.current?.stop(); } catch {}
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

    /* Add the same intro.mp3 stream to the canvas stream */
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
      } catch {}
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
    /*
     * There is only ONE audio file.
     * Start it once and let it continue for the entire animation.
     */
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
        try { mr.stop(); } catch {}
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
  const vpW = typeof window !== 'undefined'
    ? window.innerWidth
    : COMP_W;

  const vpH = typeof window !== 'undefined'
    ? window.innerHeight
    : COMP_H;

  const compAR = COMP_W / COMP_H;
  const vpAR = vpW / vpH;

  let displayW: number;
  let displayH: number;

  if (compAR > vpAR) {
    displayW = vpW;
    displayH = vpW / compAR;
  } else {
    displayH = vpH;
    displayW = vpH * compAR;
  }

  return (
    <div ref={containerRef} className="rc-container">
      <canvas
        ref={canvasRef}
        width={COMP_W}
        height={COMP_H}
        style={{
          display: 'block',
          width: displayW,
          height: displayH,
        }}
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
            {recordingDone && (
              <p className="rc-success-msg">
                ✓ Video downloaded!
              </p>
            )}

            <p className="rc-panel-label">
              ANIMATION COMPLETE
            </p>

            <div className="rc-btn-row">
              <button
                className="rc-replay-btn"
                onClick={handleReplay}
              >
                ▶ REPLAY
              </button>

              <button
                className="rc-download-btn"
                onClick={handleReplayAndDownload}
              >
                ⬇ REPLAY + DOWNLOAD
              </button>
            </div>

            <div className="rc-panel-divider" />

            <div className="rc-btn-row">
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