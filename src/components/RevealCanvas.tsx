'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { AspectRatio, Particle } from '@/types';
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
    }
}

interface RevealCanvasProps {
    aspectRatio: AspectRatio;
    muted: boolean;
    autoDownload?: boolean;
    onReplay: (ratio?: AspectRatio) => void;
}

const RevealCanvas: React.FC<RevealCanvasProps> = ({
    aspectRatio, muted, autoDownload = false, onReplay,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animFrameRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);
    const isRunningRef = useRef(false);
    const tickPlayedRef = useRef<Set<number>>(new Set());
    const prevCountdownNumRef = useRef<number>(-1);
    const autoDownloadRef = useRef(autoDownload);
    const recStartTimeRef = useRef<number>(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const mimeTypeRef = useRef<string>('');
    const isRecordingRef = useRef(false);
    const thumbnailRecordingRef = useRef(false);

    const [showReplay, setShowReplay] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDone, setRecordingDone] = useState(false);

    const is169 = aspectRatio === '16:9';
    const COMP_W = is169 ? 1920 : 1080;
    const COMP_H = is169 ? 1080 : 1920;
    const T = CONFIG.timeline;
    const TOTAL = T.finalCtaEnd;

    useEffect(() => { autoDownloadRef.current = autoDownload; }, [autoDownload]);

    /* ── Profile image ───────────────────────────────────────── */
    useEffect(() => {
        if (window.__profileImg_ref__) return;

        const setImg = (img: HTMLImageElement) => {
            window.__profileImg_ref__ = img;
        };

        const img = new Image();
        img.src = CONFIG.profileImage;
        img.onload = () => setImg(img);
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
            d.onload = () => setImg(d);
        };
    }, []);

    /* ── Recording ───────────────────────────────────────────── */
    const startRecording = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return false;

        if (mediaRecorderRef.current?.state !== 'inactive') {
            try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
        }

        recordedChunksRef.current = [];
        setRecordingDone(false);

        const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        const mime = candidates.find(m => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) ?? 'video/webm';
        mimeTypeRef.current = mime;

        let stream: MediaStream;
        try { stream = canvas.captureStream(60); } catch (e) { console.error('captureStream failed:', e); return false; }

        let mr: MediaRecorder;
        try { mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 }); }
        catch (e) { console.error('MediaRecorder init failed:', e); return false; }

        mr.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
        };

        mr.onstop = async () => {
            isRecordingRef.current = false;
            setIsRecording(false);
            thumbnailRecordingRef.current = false;

            const chunks = recordedChunksRef.current;
            if (!chunks.length) { console.warn('No recorded data'); return; }

            const raw = new Blob(chunks, { type: mime });
            const durationMs = performance.now() - recStartTimeRef.current;
            const seekable = await makeSeekableWebM(raw, durationMs);
            const url = URL.createObjectURL(seekable);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reveal-${aspectRatio.replace(':', 'x')}-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
            setRecordingDone(true);
            setShowReplay(true);
        };

        mr.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            isRecordingRef.current = false;
            setIsRecording(false);
            thumbnailRecordingRef.current = false;
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
        try { mr.requestData(); } catch { /* ignore */ }
        setTimeout(() => { try { if (mr.state !== 'inactive') mr.stop(); } catch { /* ignore */ } }, 350);
    }, []);

    /* ── Thumbnail + recording start ─────────────────────────── */
    const startWithThumbnail = useCallback((afterStart: () => void) => {
        const canvas = canvasRef.current;
        if (!canvas) { afterStart(); return; }
        drawFirstFrame(canvas, COMP_W, COMP_H, is169);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const started = startRecording();
                if (!started) { afterStart(); return; }
                thumbnailRecordingRef.current = true;
                setTimeout(() => { thumbnailRecordingRef.current = false; afterStart(); }, 800);
            });
        });
    }, [COMP_W, COMP_H, is169, startRecording]);

    /* ── Audio ───────────────────────────────────────────────── */
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

    /* ── Particles ───────────────────────────────────────────── */
    const manageParticles = useCallback((W: number, H: number, t: number) => {
        const particles = particlesRef.current;
        const spawnRate = t >= T.revealAt ? 4 : 1;
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

    /* ── Draw ────────────────────────────────────────────────── */
    const draw = useCallback((ctx: CanvasRenderingContext2D, elapsed: number) => {
        const W = COMP_W, H = COMP_H;
        const t = Math.min(elapsed / 1000, TOTAL);
        ctx.save();
        ctx.clearRect(0, 0, W, H);
        drawBackground(ctx, W, H, t);
        manageParticles(W, H, t);

        if (t < T.introEnd) drawIntro(ctx, W, H, t, is169);
        else if (t < T.suspenseEnd) drawSuspense(ctx, W, H, t, is169);
        else if (t < T.scanEnd) drawScan(ctx, W, H, t, is169);
        else if (t < T.countdownEnd) drawCountdown(ctx, W, H, t, is169, T);
        else if (t < T.revealAnimEnd) drawReveal(ctx, W, H, t, is169);
        else if (t < T.thatsMeEnd) drawThatsMe(ctx, W, H, t, is169);
        else if (t < T.socialCardsEnd) drawSocialCards(ctx, W, H, t, is169);
        else drawFinalCTA(ctx, W, H, t, is169);

        particlesRef.current = particlesRef.current.map(updateParticle).filter(p => p.life < p.maxLife);
        particlesRef.current.forEach(p => drawParticle(ctx, p));
        drawVignette(ctx, W, H);
        ctx.restore();
        handleAudio(t);
    }, [COMP_W, COMP_H, is169, T, TOTAL, handleAudio, manageParticles]);

    /* ── Loop ref ────────────────────────────────────────────── */
    const loopRef = useRef<(() => void) | null>(null);

    /* ── Loop ────────────────────────────────────────────────── */
    const loop = useCallback(() => {
        if (!isRunningRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (thumbnailRecordingRef.current) {
            // ✅ Use the ref instead of `loop` directly
            animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
            return;
        }

        const elapsed = performance.now() - startTimeRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx, elapsed);

        if (elapsed / 1000 < TOTAL + 0.5) {
            // ✅ Use the ref instead of `loop` directly
            animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
        } else {
            isRunningRef.current = false;
            if (isRecordingRef.current) stopRecording();
            else setShowReplay(true);
        }
    }, [draw, TOTAL, stopRecording]);

    // ✅ Keep the ref in sync with the latest loop function
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
        animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
    }, [resetState]); // ✅ removed `loop` — we use loopRef, not loop directly

    /* ── Replay + Download ───────────────────────────────────── */
    const handleReplayAndDownload = useCallback(() => {
        resetState();
        startWithThumbnail(() => {
            startTimeRef.current = performance.now();
            animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
        });
    }, [resetState, startWithThumbnail]); // ✅ removed `loop` — we use loopRef, not loop directly

    /* ── Mount ───────────────────────────────────────────────── */
    useEffect(() => {
        const init = async () => {
            await audioManager.preload(muted);
            if (autoDownloadRef.current) {
                resetState();
                startWithThumbnail(() => {
                    startTimeRef.current = performance.now();
                    animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
                });
            } else {
                resetState();
                animFrameRef.current = requestAnimationFrame(() => loopRef.current?.());
            }
        };
        init();
        return () => {
            isRunningRef.current = false;
            cancelAnimationFrame(animFrameRef.current);
            audioManager.stopAll();
            const mr = mediaRecorderRef.current;
            if (mr && mr.state !== 'inactive') { try { mr.stop(); } catch { /* ignore */ } }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Canvas scaling ──────────────────────────────────────── */
    const vpW = typeof window !== 'undefined' ? window.innerWidth : COMP_W;
    const vpH = typeof window !== 'undefined' ? window.innerHeight : COMP_H;
    const compAR = COMP_W / COMP_H;
    const vpAR = vpW / vpH;
    let displayW: number, displayH: number;
    if (compAR > vpAR) { displayW = vpW; displayH = vpW / compAR; }
    else { displayH = vpH; displayW = vpH * compAR; }

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
                            <button className="rc-replay-btn" onClick={handleReplay}>▶ REPLAY</button>
                            <button className="rc-download-btn" onClick={handleReplayAndDownload}>⬇ REPLAY + DOWNLOAD</button>
                        </div>

                        <div className="rc-panel-divider" />

                        <div className="rc-btn-row">
                            {[
                                { label: '↩ MENU', onClick: () => { setShowReplay(false); onReplay(); } },
                                { label: '16:9', onClick: () => { setShowReplay(false); onReplay('16:9'); } },
                                { label: '9:16', onClick: () => { setShowReplay(false); onReplay('9:16'); } },
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