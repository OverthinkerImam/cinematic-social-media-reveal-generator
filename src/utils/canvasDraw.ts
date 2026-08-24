// src/utils/canvasDraw.ts
import { CONFIG } from '@/config';
import { PlatformConfig } from '@/types';

declare global {
  interface CanvasRenderingContext2D {
    filter: string;
  }
  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
  }
  interface Window {
    __profileImg_ref__: HTMLImageElement | undefined;
    __croppedProfileImg_ref__: HTMLImageElement | undefined;
  }
}

const GOLD = '#ffd700';
const PURPLE = '#9933ff';
const ORANGE = '#ff6600';

/* ── Easing ─────────────────────────────────────────────────── */
export const easeOutExpo = (t: number) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ── Math helpers ───────────────────────────────────────────── */
export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
export function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
export function progress(t: number, s: number, e: number) { return clamp01((t - s) / (e - s)); }

/* ── fadeIn ─────────────────────────────────────────────────── */
export function fadeIn(ctx: CanvasRenderingContext2D, a: number, fn: () => void) {
  ctx.save();
  ctx.globalAlpha *= Math.max(0, Math.min(1, a));
  fn();
  ctx.restore();
}

/* ── drawCenteredText ───────────────────────────────────────── */
export function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  opts: {
    font?: string;
    color?: string;
    glow?: string;
    glowSize?: number;
    maxWidth?: number;
    shadow?: boolean;
  } = {}
) {
  const {
    font = '48px Montserrat',
    color = '#fff',
    glow,
    glowSize = 20,
    maxWidth,
    shadow = true,
  } = opts;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (shadow) {
    ctx.shadowColor = glow || 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = glowSize;
  }

  if (glow) {
    ctx.fillStyle = glow;
    ctx.globalAlpha *= 0.4;
    for (let i = 0; i < 3; i++) ctx.fillText(text, x, y, maxWidth);
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha / 0.4);
  }

  ctx.shadowColor = glow || 'rgba(255,255,255,0.2)';
  ctx.shadowBlur = glowSize;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

/* ── drawProgressBar ────────────────────────────────────────── */
export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill: number, label: string, pct: number, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `600 ${h * 0.9}px Montserrat`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(label, x, y - h * 1.2);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();

  if (fill > 0) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, PURPLE);
    g.addColorStop(1, GOLD);
    ctx.fillStyle = g;
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(x, y, w * fill, h, h / 2);
    ctx.fill();
  }

  ctx.font = `700 ${h * 0.85}px Montserrat`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 8;
  ctx.fillText(`${pct}%`, x + w, y - h * 1.2);
  ctx.restore();
}

/* ── Platform info ──────────────────────────────────────────── */
export const PLATFORM_INFO: Record<string, { label: string; color: string; gradient: [string, string] }> = {
  instagram: { label: 'Instagram', color: '#e1306c', gradient: ['#833ab4', '#fd1d1d'] },
  youtube: { label: 'YouTube', color: '#ff0000', gradient: ['#ff0000', '#cc0000'] },
  facebook: { label: 'Facebook', color: '#1877f2', gradient: ['#1877f2', '#0a5ad4'] },
  github: { label: 'GitHub', color: '#6e5494', gradient: ['#6e5494', '#24292e'] },
};

/* ── Social icons ───────────────────────────────────────────── */
export function drawInstagramIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  const s = size / 2;
  const g = ctx.createLinearGradient(-s, s, s, -s);
  g.addColorStop(0, '#f09433');
  g.addColorStop(0.25, '#e6683c');
  g.addColorStop(0.5, '#dc2743');
  g.addColorStop(0.75, '#cc2366');
  g.addColorStop(1, '#bc1888');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.25);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.roundRect(-s * 0.55, -s * 0.55, s * 1.1, s * 1.1, s * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(s * 0.38, -s * 0.38, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawYouTubeIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  const s = size / 2;
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.roundRect(-s, -s * 0.65, s * 2, s * 1.3, s * 0.18);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, -s * 0.36);
  ctx.lineTo(s * 0.42, 0);
  ctx.lineTo(-s * 0.22, s * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawFacebookIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  const s = size / 2;
  ctx.fillStyle = '#1877f2';
  ctx.beginPath();
  ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.22);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${s * 1.3}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('f', s * 0.08, s * 0.06);
  ctx.restore();
}

export function drawGitHubIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha *= alpha;

  const s = size / 2;

  ctx.fillStyle = '#24292e';
  ctx.beginPath();
  ctx.roundRect(cx - s, cy - s, size, size, size * 0.22);
  ctx.fill();

  const iconSize = size * 0.62;
  const scale = iconSize / 16; 

  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-8, -8); 

  ctx.fillStyle = '#ffffff';

  const gitHubPath = new Path2D(
    'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 ' +
    '0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-' +
    '.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-' +
    '.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-' +
    '.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 ' +
    '1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 ' +
    '3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 ' +
    '.21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z'
  );

  ctx.fill(gitHubPath);

  ctx.restore();
}

/* ── getIconFn ──────────────────────────────────────────────── */
export function getIconFn(name: string) {
  switch (name) {
    case 'instagram': return drawInstagramIcon;
    case 'youtube': return drawYouTubeIcon;
    case 'facebook': return drawFacebookIcon;
    case 'github': return drawGitHubIcon;
    default: return drawInstagramIcon;
  }
}

/* ── Draw profile image as 1:1 (square crop) ────────────────── */
export function drawProfileImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destX: number, destY: number, destSize: number,
  blur: number = 0,
  radius: number = 16
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(destX, destY, destSize, destSize, radius);
  ctx.clip();

  if (blur > 0) {
    ctx.filter = `blur(${blur}px) brightness(0.65)`;
  }

  // Cover-fit: crop to 1:1 from center of source image
  const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
  const srcX = (img.naturalWidth - srcSize) / 2;
  const srcY = (img.naturalHeight - srcSize) / 2;

  ctx.drawImage(img, srcX, srcY, srcSize, srcSize, destX, destY, destSize, destSize);

  if (blur > 0) ctx.filter = 'none';
  ctx.restore();
}

/* ── Light rays ─────────────────────────────────────────────── */
export function drawLightRays(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, intensity: number, t: number
) {
  if (intensity < 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = intensity * 0.18;
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 + t * 0.08;
    const sp = 0.04 + 0.02 * Math.sin(t * 2 + i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - sp) * maxR, cy + Math.sin(a - sp) * maxR);
    ctx.lineTo(cx + Math.cos(a + sp) * maxR, cy + Math.sin(a + sp) * maxR);
    ctx.closePath();
    const rg = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
    rg.addColorStop(0, `rgba(255,220,120,${intensity * 0.6})`);
    rg.addColorStop(0.5, `rgba(200,100,255,${intensity * 0.2})`);
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/* ── Vignette ───────────────────────────────────────────────── */
export function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'transparent');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ── Background ─────────────────────────────────────────────── */
export function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const TR = CONFIG.timeline.revealAt;

  if (t >= TR && t < TR + 0.15) {
    const v = Math.round((1 - (t - TR) / 0.15) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  const bg = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.8);
  bg.addColorStop(0, t >= TR ? '#120820' : '#1a0a2e');
  bg.addColorStop(1, t >= TR ? '#000005' : '#000008');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const p = 0.5 + 0.5 * Math.sin(t * 1.5);
  const gr = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W * 0.4);
  gr.addColorStop(0, `rgba(100,30,200,${0.08 + p * 0.05})`);
  gr.addColorStop(1, 'transparent');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
}

/* ── Corner brackets ────────────────────────────────────────── */
export function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, size: number, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  [
    { sx: x, sy: y, dx1: x + size, dy1: y, dx2: x, dy2: y + size },
    { sx: x + w, sy: y, dx1: x + w - size, dy1: y, dx2: x + w, dy2: y + size },
    { sx: x, sy: y + h, dx1: x + size, dy1: y + h, dx2: x, dy2: y + h - size },
    { sx: x + w, sy: y + h, dx1: x + w - size, dy1: y + h, dx2: x + w, dy2: y + h - size },
  ].forEach(({ sx, sy, dx1, dy1, dx2, dy2 }) => {
    ctx.beginPath();
    ctx.moveTo(dx1, dy1);
    ctx.lineTo(sx, sy);
    ctx.lineTo(dx2, dy2);
    ctx.stroke();
  });
  ctx.restore();
}

/* ── Smoothed group Y (spring) ──────────────────────────────── */
const _groupState: Record<string, { animY: number; targetY: number; velocity: number }> = {};

export function getSmoothedGroupY(key: string, targetY: number): number {
  if (!_groupState[key]) {
    _groupState[key] = { animY: targetY, targetY, velocity: 0 };
    return targetY;
  }
  const s = _groupState[key];
  const k = 120, d = 20, dt = 1 / 60;
  const force = k * (targetY - s.animY) - d * s.velocity;
  s.velocity += force * dt;
  s.animY += s.velocity * dt;
  s.targetY = targetY;
  if (Math.abs(targetY - s.animY) < 0.1 && Math.abs(s.velocity) < 0.1) s.animY = targetY;
  return s.animY;
}

export function resetGroupY(key: string) {
  delete _groupState[key];
}

/* ── Reveal layout (1:1 image) ──────────────────────────────── */
export function getRevealLayout(W: number, H: number, is169: boolean, lineCount: number) {
  const iSize = is169 ? Math.min(W * 0.30, H * 0.46) : W * 0.90;
  const iW = iSize;
  const iH = iSize;

  const revealedSize = is169 ? W * 0.044 : W * 0.068;
  const thatsMeSize = is169 ? W * 0.022 : W * 0.034;
  const usernameSize = is169 ? W * 0.030 : W * 0.048;
  const gap = is169 ? H * 0.040 : H * 0.028;

  const lineHeights = [iH, revealedSize * 1.3, thatsMeSize * 1.4, usernameSize * 1.4];
  const totalH = lineHeights.slice(0, lineCount).reduce((s, v) => s + v, 0) + gap * (lineCount - 1);
  const targetTopY = H / 2 - totalH / 2;
  const animTopY = getSmoothedGroupY('reveal', targetTopY);

  const positions: number[] = [];
  let y = animTopY;
  for (let i = 0; i < lineCount; i++) {
    positions.push(y + lineHeights[i] / 2);
    y += lineHeights[i] + gap;
  }
  return { iW, iH, positions, revealedSize, thatsMeSize, usernameSize };
}

/* ── getSocialLayout ────────────────────────────────────────── */
export function getSocialLayout(
  W: number, H: number, is169: boolean,
  visibleCount: number, cW: number, cH: number,
  gap: number, titleH: number, titleGap: number
) {
  // Landscape: ≤3 → one row; >3 → 2 columns
  const cols = is169 ? (visibleCount > 3 ? 2 : Math.max(1, visibleCount)) : 1;
  const rows = is169
    ? (visibleCount > 3 ? Math.ceil(visibleCount / 2) : 1)
    : Math.max(1, visibleCount);

  const stackH = rows * cH + Math.max(0, rows - 1) * gap;
  const rowW =
    cols * cW + Math.max(0, cols - 1) * gap;
  const groupH = titleH + titleGap + stackH;
  const targetTopY = H / 2 - groupH / 2;
  const animTopY = getSmoothedGroupY('social', targetTopY);
  return { animTopY, rowW, stackH, groupH, cols, rows };
}

/* ── drawCard ───────────────────────────────────────────────── */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  cX: number, cY: number, cW: number, cH: number,
  iS: number, name: string, handle: string,
  iconFn: (c: CanvasRenderingContext2D, cx: number, cy: number, s: number, a: number) => void,
  baseSize: number
) {
  const info = PLATFORM_INFO[name];
  ctx.save();
  ctx.shadowColor = info.gradient[0];
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(20,10,35,0.92)';
  ctx.beginPath();
  ctx.roundRect(cX, cY, cW, cH, 12);
  ctx.fill();

  const bg = ctx.createLinearGradient(cX, cY, cX + cW, cY + cH);
  bg.addColorStop(0, info.gradient[0] + '88');
  bg.addColorStop(1, info.gradient[1] + '88');
  ctx.strokeStyle = bg;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cX, cY, cW, cH, 12);
  ctx.stroke();

  iconFn(ctx, cX + cH * 0.55, cY + cH / 2, iS, 1);

  const tx = cX + cH * 1.05;
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${baseSize * 1.1}px Montserrat`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.label, tx, cY + cH * 0.36);

  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.font = `500 ${baseSize * 0.88}px Montserrat`;
  ctx.fillText(handle, tx, cY + cH * 0.68);
  ctx.restore();
}

/* ── First frame thumbnail ──────────────────────────────────── */
export function drawFirstFrame(
  canvas: HTMLCanvasElement, W: number, H: number, is169: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, 0.01);

  const ir = window.__croppedProfileImg_ref__ || window.__profileImg_ref__;

  const imgSize = is169 ? Math.min(W * 0.30, H * 0.46) : Math.min(W * 0.62, H * 0.30);
  const imgX = W / 2 - imgSize / 2;
  const imgY = H / 2 - imgSize / 2 - (is169 ? H * 0.08 : H * 0.06);

  if (ir) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgSize, imgSize, 16);
    ctx.clip();
    ctx.filter = 'blur(14px) brightness(0.65)';
    const srcSize = Math.min(ir.naturalWidth, ir.naturalHeight);
    const srcX = (ir.naturalWidth - srcSize) / 2;
    const srcY = (ir.naturalHeight - srcSize) / 2;
    ctx.drawImage(ir, srcX, srcY, srcSize, srcSize, imgX, imgY, imgSize, imgSize);
    ctx.filter = 'none';
    ctx.restore();
  }

  ctx.save();
  ctx.font = `900 ${is169 ? W * 0.12 : W * 0.22}px Montserrat`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.shadowColor = PURPLE;
  ctx.shadowBlur = 60;
  ctx.fillText('?', W / 2, H / 2 - (is169 ? H * 0.08 : H * 0.06));
  ctx.restore();

  const titleY = imgY + imgSize + (is169 ? H * 0.07 : H * 0.05);
  ctx.save();
  ctx.font = `900 ${is169 ? W * 0.032 : W * 0.052}px Montserrat`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#fff';
  ctx.fillText("I'VE BEEN HIDING SOMETHING...", W / 2, titleY);
  ctx.restore();

  drawVignette(ctx, W, H);
  ctx.restore();

  try {
    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
    if (track && typeof track.requestFrame === 'function') track.requestFrame();
  } catch { }
}

/* ══════════════════════════════════════════════════════════════
   SCENE DRAW FUNCTIONS
══════════════════════════════════════════════════════════════ */

/* ── INTRO ──────────────────────────────────────────────────── */
export function drawIntro(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, is169: boolean
) {
  const cx = W / 2;
  const cy = H / 2;
  const baseSize = is169 ? W * 0.032 : W * 0.056;
  const lineGap = is169 ? H * 0.09 : H * 0.075;
  const yCenter = is169 ? cy - lineGap * 0.2 : cy - lineGap * 0.6;

  if (is169) {
    const p1 = clamp01(progress(t, 0.3, 1.2));
    const p2 = clamp01(progress(t, 1.2, 2.0));
    const p3 = clamp01(progress(t, 2.0, 2.8));

    fadeIn(ctx, easeOutExpo(p1), () => {
      ctx.save(); ctx.translate(0, (1 - easeOutExpo(p1)) * 30);
      drawCenteredText(ctx, "I'VE BEEN HIDING SOMETHING...", cx, yCenter - lineGap, { font: `900 ${baseSize * 1.3}px Montserrat`, color: '#fff', glow: GOLD, glowSize: 30 });
      ctx.restore();
    });
    fadeIn(ctx, easeOutExpo(p2), () => {
      ctx.save(); ctx.translate(0, (1 - easeOutExpo(p2)) * 30);
      drawCenteredText(ctx, 'for a little while.', cx, yCenter, { font: `300 ${baseSize * 0.9}px Montserrat`, color: 'rgba(255,255,255,0.7)', glow: 'rgba(180,100,255,0.8)', glowSize: 20 });
      ctx.restore();
    });
    fadeIn(ctx, easeOutExpo(p3), () => {
      ctx.save(); ctx.translate(0, (1 - easeOutExpo(p3)) * 30);
      drawCenteredText(ctx, 'Today, you get to see it.', cx, yCenter + lineGap, { font: `500 ${baseSize * 0.85}px Montserrat`, color: 'rgba(255,220,120,0.9)', glow: ORANGE, glowSize: 20 });
      ctx.restore();
    });
  } else {
    const p1 = clamp01(progress(t, 0.3, 1.1));
    const p2 = clamp01(progress(t, 1.0, 1.8));
    const p3 = clamp01(progress(t, 1.6, 2.4));
    const p4 = clamp01(progress(t, 2.2, 2.8));
    const p5 = clamp01(progress(t, 2.7, 3.3));
    const ts = baseSize * 1.25;
    const ss = baseSize * 0.78;
    const ss2 = baseSize * 0.72;

    fadeIn(ctx, easeOutExpo(p1), () => {
      ctx.save(); ctx.translate(0, (1 - easeOutExpo(p1)) * 35);
      drawCenteredText(ctx, "I'VE BEEN", cx, yCenter - lineGap * 1.1, { font: `900 ${ts}px Montserrat`, color: '#fff', glow: GOLD, glowSize: 35 });
      ctx.restore();
    });
    fadeIn(ctx, easeOutExpo(p2), () => {
      ctx.save(); ctx.translate(0, (1 - easeOutExpo(p2)) * 35);
      drawCenteredText(ctx, 'HIDING', cx, yCenter, { font: `900 ${ts * 1.15}px Montserrat`, color: GOLD, glow: GOLD, glowSize: 45 });
      ctx.restore();
    });
    fadeIn(ctx, easeOutExpo(p3), () => {
      ctx.save(); ctx.translate(0, (1 - easeOutExpo(p3)) * 35);
      drawCenteredText(ctx, 'SOMETHING...', cx, yCenter + lineGap * 1.1, { font: `900 ${ts}px Montserrat`, color: '#fff', glow: PURPLE, glowSize: 30 });
      ctx.restore();
    });
    fadeIn(ctx, easeOutExpo(p4), () => {
      ctx.save(); ctx.translate(0, (1 - easeOutExpo(p4)) * 30);
      drawCenteredText(ctx, 'for a little while.', cx, yCenter + lineGap * 2.4, { font: `300 ${ss}px Montserrat`, color: 'rgba(255,255,255,0.65)', glow: 'rgba(180,100,255,0.8)', glowSize: 20 });
      ctx.restore();
    });
    fadeIn(ctx, easeOutExpo(p5), () => {
      ctx.save(); ctx.translate(0, (1 - easeOutExpo(p5)) * 30);
      drawCenteredText(ctx, 'Today, you finally get to see it.', cx, yCenter + lineGap * 3.3, { font: `500 ${ss2}px Montserrat`, color: 'rgba(255,220,120,0.9)', glow: ORANGE, glowSize: 20 });
      ctx.restore();
    });
  }
}

/* ── SUSPENSE ────────────────────────────────────────────────── */
export function drawSuspense(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, is169: boolean
) {
  const T0 = CONFIG.timeline.introEnd;
  const rel = t - T0;
  const suspenseDur = CONFIG.timeline.suspenseEnd - T0;
  const cx = W / 2;
  const cy = H / 2;
  const baseSize = is169 ? W * 0.028 : W * 0.044;

  const cardSize = is169 ? Math.min(W * 0.30, H * 0.50) : Math.min(W * 0.72, H * 0.44);
  const cardW = cardSize;
  const cardH = cardSize;
  const cardX = cx - cardW / 2;
  const cardY = cy - cardH / 2 + Math.sin(t * 1.2) * 8;
  const cardAppear = clamp01(progress(rel, 0, 0.6));
  const pulse = 0.5 + 0.5 * Math.sin(t * 2);

  ctx.save();
  ctx.globalAlpha = easeOutBack(cardAppear);
  ctx.translate(cx, cardY + cardH / 2);
  ctx.scale(0.7 + 0.3 * easeOutBack(cardAppear), 0.7 + 0.3 * easeOutBack(cardAppear));
  ctx.translate(-cx, -(cardY + cardH / 2));
  ctx.shadowColor = PURPLE;
  ctx.shadowBlur = 40 + pulse * 20;
  ctx.fillStyle = 'rgba(20,5,40,0.85)';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.shadowBlur = 0;

  const bg = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  bg.addColorStop(0, `rgba(160,80,255,${0.4 + pulse * 0.3})`);
  bg.addColorStop(0.5, `rgba(255,120,60,${0.2 + pulse * 0.2})`);
  bg.addColorStop(1, `rgba(160,80,255,${0.4 + pulse * 0.3})`);
  ctx.strokeStyle = bg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4, 14);
  ctx.clip();
  const imgEl = window.__croppedProfileImg_ref__ || window.__profileImg_ref__;
  if (imgEl) {
    ctx.filter = 'blur(18px) brightness(0.7)';
    const srcSize = Math.min(imgEl.naturalWidth, imgEl.naturalHeight);
    const srcX = (imgEl.naturalWidth - srcSize) / 2;
    const srcY = (imgEl.naturalHeight - srcSize) / 2;
    ctx.drawImage(imgEl, srcX, srcY, srcSize, srcSize, cardX + 2, cardY + 2, cardW - 4, cardH - 4);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    g.addColorStop(0, '#2a0a4a');
    g.addColorStop(1, '#0a0520');
    ctx.fillStyle = g;
    ctx.fillRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4);
  }
  ctx.save();
  ctx.globalAlpha *= 0.35;
  ctx.font = `900 ${cardH * 0.5}px Montserrat`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = PURPLE;
  ctx.shadowBlur = 60;
  ctx.fillText('?', cx, cardY + cardH / 2);
  ctx.restore();
  ctx.restore();
  ctx.restore();

  const aboveCardY = cardY - H * (is169 ? 0.07 : 0.06);
  const belowCardY = cardY + cardH + H * (is169 ? 0.05 : 0.04);
  const hookY = is169 ? aboveCardY : belowCardY;
  const notYetY = is169 ? belowCardY : belowCardY + H * 0.07;

  [
    { text: '🔒  SOMETHING BIG IS HIDDEN HERE', start: 0.6, end: suspenseDur * 0.45 },
    { text: '👁  LOOK CLOSELY...', start: suspenseDur * 0.45, end: suspenseDur * 0.7 },
    { text: '⚡  THE REVEAL IS COMING...', start: suspenseDur * 0.7, end: suspenseDur },
  ].forEach(({ text, start, end }) => {
    if (rel >= start && rel < end) {
      const mp = clamp01(progress(rel, start, start + 0.4));
      const fo = rel > end - 0.3 ? 1 - clamp01(progress(rel, end - 0.3, end)) : 1;
      fadeIn(ctx, easeOutExpo(mp) * fo, () => {
        drawCenteredText(ctx, text, cx, hookY, { font: `800 ${baseSize}px Montserrat`, color: '#fff', glow: GOLD, glowSize: 25 });
      });
    }
  });

  const notYetStart = suspenseDur * 0.65;
  fadeIn(
    ctx,
    easeOutExpo(clamp01(progress(rel, notYetStart, notYetStart + 0.6))) * (0.6 + 0.4 * Math.sin(t * 2.5)),
    () => {
      drawCenteredText(ctx, '— not yet —', cx, notYetY, {
        font: `300 italic ${baseSize * 0.65}px Montserrat`,
        color: 'rgba(255,255,255,0.55)',
        glow: 'rgba(160,80,255,0.6)',
        glowSize: 15,
      });
    }
  );
}

/* ── SCAN ────────────────────────────────────────────────────── */
export function drawScan(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, is169: boolean
) {
  const T0 = CONFIG.timeline.suspenseEnd;
  const rel = t - T0;
  const scanDur = CONFIG.timeline.scanEnd - T0;
  const cx = W / 2;
  const cy = H / 2;
  const baseSize = is169 ? W * 0.022 : W * 0.036;
  const barW = is169 ? W * 0.45 : W * 0.8;
  const barH = is169 ? H * 0.022 : H * 0.018;
  const p1 = rel < 1.6;
  const p2 = rel >= 1.6 && rel < 2.8;
  const hY = is169 ? cy - H * 0.28 : cy - H * 0.32;

  fadeIn(ctx, easeOutExpo(clamp01(progress(rel, 0, 0.4))), () => {
    const ht = p1 ? 'SEARCHING...' : p2 ? 'PROFILE FOUND ✓' : 'PREPARING REVEAL';
    const hc = p1 ? '#fff' : p2 ? '#44ff88' : GOLD;
    drawCenteredText(ctx, ht, cx, hY, { font: `900 ${baseSize * 1.5}px Montserrat`, color: hc, glow: hc, glowSize: 30 });
  });

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = PURPLE;
  ctx.lineWidth = 1;
  const gs = is169 ? 60 : 80;
  for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();

  [
    { label: 'SCANNING PROFILE', delay: 0.3, dur: 2.0 },
    { label: 'ANALYZING DATA', delay: 1.0, dur: 1.8 },
    { label: 'IDENTITY VERIFIED', delay: 2.0, dur: Math.max(0.8, scanDur - 2.0 - 0.5) },
  ].forEach(({ label, delay, dur }, i) => {
    const bt = clamp01(progress(rel, delay, delay + dur));
    const ba = clamp01(progress(rel, delay - 0.1, delay + 0.4));
    const bY = is169 ? cy - H * 0.08 + i * H * 0.12 : cy - H * 0.12 + i * H * 0.1;
    drawProgressBar(
      ctx, cx - barW / 2, bY, barW, barH, bt,
      label === 'IDENTITY VERIFIED' && bt >= 1 ? `${label} ✓` : label,
      Math.round(bt * 100), easeOutExpo(ba)
    );
  });

  const beamP = Math.min(rel / (scanDur * 0.9), 1);
  const beamY = hY + H * 0.08 + beamP * H * 0.65;
  ctx.save();
  ctx.globalAlpha = 0.15;
  const bgBeam = ctx.createLinearGradient(0, beamY - 20, 0, beamY + 20);
  bgBeam.addColorStop(0, 'transparent');
  bgBeam.addColorStop(0.5, PURPLE);
  bgBeam.addColorStop(1, 'transparent');
  ctx.fillStyle = bgBeam;
  ctx.fillRect(0, beamY - 20, W, 40);
  ctx.restore();

  drawCornerBrackets(ctx, cx - barW * 0.55, hY - H * 0.04, barW * 1.1, H * 0.65, is169 ? 20 : 30, clamp01(progress(rel, 0, 0.5)));
}

/* ── COUNTDOWN ───────────────────────────────────────────────── */
export function drawCountdown(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, is169: boolean,
  TL: typeof CONFIG.timeline
) {
  const SLOT = 2.0;
  const START = TL.countdownEnd - SLOT * 3;
  const rel = t - START;

  let num: number;
  let slotRel: number;
  if (rel < SLOT) { num = 3; slotRel = rel; }
  else if (rel < SLOT * 2) { num = 2; slotRel = rel - SLOT; }
  else { num = 1; slotRel = rel - SLOT * 2; }

  const nr = clamp01(slotRel / SLOT);
  const ns = is169 ? W * 0.18 : W * 0.38;
  const IN = 0.4 / SLOT;
  const OUT = 0.4 / SLOT;
  let sc: number, al: number;

  if (nr < IN) {
    sc = lerp(0.5, 1.1, easeOutBack(nr / IN));
    al = nr / IN;
  } else if (nr < 1 - OUT) {
    sc = 1; al = 1;
  } else {
    sc = lerp(1, 1.25, (nr - (1 - OUT)) / OUT);
    al = 1 - (nr - (1 - OUT)) / OUT;
  }

  const cx = W / 2, cy = H / 2;

  ctx.save();
  ctx.globalAlpha = al * 0.35;
  const rs = ns * sc * 0.9;
  const rg = ctx.createRadialGradient(W / 2, H / 2, rs * 0.3, W / 2, H / 2, rs);
  rg.addColorStop(0, 'transparent');
  rg.addColorStop(0.7, `rgba(${num === 1 ? '255,80,80' : num === 2 ? '255,140,0' : '100,80,255'},0.25)`);
  rg.addColorStop(1, 'transparent');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const ata = nr < IN ? nr / IN : nr > 1 - OUT ? al : 1;
  const atx: Record<number, string> = { 3: '🤫  ALMOST THERE...', 2: '😮  GET READY...', 1: '🔥  HERE IT COMES!' };
  fadeIn(ctx, al * ata, () => {
    drawCenteredText(ctx, atx[num], cx, cy - (is169 ? H * 0.22 : H * 0.16), {
      font: `700 ${is169 ? W * 0.022 : W * 0.042}px Montserrat`,
      color: 'rgba(255,255,255,0.85)',
      glow: num === 1 ? ORANGE : num === 2 ? GOLD : PURPLE, glowSize: 20,
    });
  });

  fadeIn(ctx, al, () => {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    const cols: Record<number, string> = { 1: '#ff5050', 2: '#ff9900', 3: '#aa66ff' };
    const glws: Record<number, string> = { 1: '#ff2020', 2: '#ff6600', 3: '#8844ff' };
    drawCenteredText(ctx, String(num), cx, cy, { font: `900 ${ns}px Montserrat`, color: cols[num], glow: glws[num], glowSize: 60 });
    ctx.restore();
  });

  const btx: Record<number, string> = { 3: 'The moment is near...', 2: 'Brace yourself...', 1: 'No more secrets! 👀' };
  fadeIn(ctx, al * ata, () => {
    drawCenteredText(ctx, btx[num], cx, cy + (is169 ? H * 0.22 : H * 0.16), {
      font: `400 italic ${is169 ? W * 0.018 : W * 0.034}px Montserrat`,
      color: 'rgba(255,255,255,0.55)',
      glow: 'rgba(200,150,255,0.6)', glowSize: 15,
    });
  });
}

/* ── REVEAL ──────────────────────────────────────────────────── */
export function drawReveal(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, is169: boolean
) {
  const T0 = CONFIG.timeline.revealAt;
  const rel = t - T0;
  const rp = clamp01(rel / 1.2);
  const revealedP = clamp01(progress(t, T0 + 0.8, T0 + 1.5));
  const lineCount = revealedP > 0 ? 2 : 1;
  const layout = getRevealLayout(W, H, is169, lineCount);
  const cx = W / 2;

  const iX = cx - layout.iW / 2;
  const iY = layout.positions[0] - layout.iH / 2;

  drawLightRays(ctx, cx, layout.positions[0], Math.max(W, H) * 0.9, rp, t);

  ctx.save();
  const gg = ctx.createRadialGradient(cx, layout.positions[0], 0, cx, layout.positions[0], lerp(0, Math.max(W, H) * 0.7, easeOutExpo(rp)));
  gg.addColorStop(0, `rgba(180,100,255,${0.3 * rp})`);
  gg.addColorStop(0.4, `rgba(255,120,0,${0.15 * rp})`);
  gg.addColorStop(1, 'transparent');
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const ir = window.__croppedProfileImg_ref__ || window.__profileImg_ref__;
  if (ir) {
    ctx.save();
    ctx.translate(cx, layout.positions[0]);
    ctx.rotate(lerp(0.03, 0, easeOutExpo(rp)));
    const scale = lerp(1.15, 1.0, easeOutExpo(rp));
    ctx.scale(scale, scale);
    ctx.translate(-cx, -layout.positions[0]);

    const blurAmount = lerp(15, 0, easeOutExpo(rp));
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 30 * rp;
    drawProfileImage(ctx, ir, iX, iY, layout.iW, blurAmount, 16);
    ctx.restore();
  }

  if (lineCount >= 2) {
    fadeIn(ctx, easeOutExpo(revealedP), () => {
      ctx.save();
      ctx.translate(0, (1 - easeOutExpo(revealedP)) * 30);
      drawCenteredText(ctx, 'REVEALED.', cx, layout.positions[1], { font: `900 ${layout.revealedSize}px Montserrat`, color: GOLD, glow: GOLD, glowSize: 40 });
      ctx.restore();
    });
  }
}

/* ── THAT'S ME ───────────────────────────────────────────────── */
export function drawThatsMe(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, is169: boolean
) {
  const T0 = CONFIG.timeline.revealAnimEnd;
  const thatsMeP = clamp01(progress(t, T0 + 0.2, T0 + 0.8));
  const usernameP = clamp01(progress(t, T0 + 0.7, T0 + 1.4));
  const lineCount = usernameP > 0 ? 4 : thatsMeP > 0 ? 3 : 2;
  const layout = getRevealLayout(W, H, is169, lineCount);
  const cx = W / 2;
  const iX = cx - layout.iW / 2;
  const iY = layout.positions[0] - layout.iH / 2;

  drawLightRays(ctx, cx, layout.positions[0], Math.max(W, H) * 0.6, 0.5, t);

  const ir = window.__croppedProfileImg_ref__ || window.__profileImg_ref__;
  if (ir) {
    ctx.save();
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 20;
    drawProfileImage(ctx, ir, iX, iY, layout.iW, 0, 16);
    ctx.restore();
  }

  drawCenteredText(ctx, 'REVEALED.', cx, layout.positions[1], { font: `900 ${layout.revealedSize}px Montserrat`, color: GOLD, glow: GOLD, glowSize: 35 });

  if (lineCount >= 3) {
    fadeIn(ctx, easeOutExpo(thatsMeP), () => {
      ctx.save();
      ctx.translate(0, (1 - easeOutExpo(thatsMeP)) * 20);
      drawCenteredText(ctx, "Yep... that's me. 👋", cx, layout.positions[2], { font: `500 ${layout.thatsMeSize}px Montserrat`, color: 'rgba(255,255,255,0.85)', glow: 'rgba(255,200,100,0.6)', glowSize: 20 });
      ctx.restore();
    });
  }
  if (lineCount >= 4) {
    fadeIn(ctx, easeOutExpo(usernameP), () => {
      ctx.save();
      ctx.translate(0, (1 - easeOutExpo(usernameP)) * 25);
      drawCenteredText(ctx, CONFIG.username, cx, layout.positions[3], { font: `800 ${layout.usernameSize}px Montserrat`, color: '#fff', glow: PURPLE, glowSize: 30 });
      ctx.restore();
    });
  }
}

/* ── SOCIAL CARDS ────────────────────────────────────────────── */
export function drawSocialCards(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, is169: boolean,
  platforms?: PlatformConfig[]
) {
  const T0 = CONFIG.timeline.thatsMeEnd;
  const cx = W / 2;
  const baseSize = is169 ? W * 0.015 : W * 0.026;

  const activePlatforms = platforms && platforms.length > 0
    ? platforms
      .filter(p => p.enabled)
      .sort((a, b) => a.order - b.order)
      .map((p, i) => ({
        name: p.name,
        handle: p.handle,
        iconFn: getIconFn(p.name),
        delay: i * 0.5,
      }))
    : [
      { name: 'instagram', handle: CONFIG.instagramHandle, iconFn: drawInstagramIcon, delay: 0 },
      { name: 'youtube', handle: CONFIG.youtubeHandle, iconFn: drawYouTubeIcon, delay: 0.5 },
      { name: 'facebook', handle: CONFIG.facebookHandle, iconFn: drawFacebookIcon, delay: 1.0 },
    ];

  const platformCount = activePlatforms.length;
  const useGrid = is169 && platformCount > 3;

  const cW = is169 ? (useGrid ? W * 0.28 : W * 0.24) : W * 0.72;
  const cH = is169 ? (useGrid ? H * 0.14 : H * 0.15) : H * 0.10;
  const iS = is169 ? cH * 0.55 : cH * 0.58;
  const gap = is169 ? W * 0.025 : H * 0.022;
  const titleH = is169 ? H * 0.055 : H * 0.050;
  const titleSize = is169 ? W * 0.018 : W * 0.030;
  const titleGap = is169 ? H * 0.035 : H * 0.030;

  const visibleCount = Math.max(
    1,
    activePlatforms.filter((_, i) => t >= T0 + activePlatforms[i].delay).length,
  );
  const titleP = easeOutExpo(clamp01(progress(t, T0, T0 + 0.4)));
  const { animTopY } = getSocialLayout(
    W, H, is169, visibleCount, cW, cH, gap, titleH, titleGap,
  );
  const titleY = animTopY + titleH / 2;
  const contentTopY = animTopY + titleH + titleGap;

  fadeIn(ctx, titleP, () => {
    drawCenteredText(ctx, 'FIND ME ON:', cx, titleY, {
      font: `700 ${titleSize}px Montserrat`,
      color: 'rgba(255,255,255,0.55)',
      glow: PURPLE,
      glowSize: 15,
    });
  });

  if (is169) {
    // ≤3: single row · >3: 2×N grid (e.g. 4 → 2×2)
    const colCount = useGrid ? 2 : Math.max(1, platformCount);
    const gridRowW = colCount * cW + (colCount - 1) * gap;
    const rowStartX = cx - gridRowW / 2;

    activePlatforms.forEach(({ name, handle, iconFn, delay }, i) => {
      if (t < T0 + delay) return;

      const cardP = clamp01(progress(t, T0 + delay, T0 + delay + 0.45));
      const al = easeOutBack(cardP);

      const col = useGrid ? i % 2 : i;
      const row = useGrid ? Math.floor(i / 2) : 0;

      const targetX = rowStartX + col * (cW + gap);
      const targetY = contentTopY + row * (cH + gap);

      const slideOffsetX = (1 - easeOutExpo(cardP)) * cW * 0.45;
      const slideOffsetY = useGrid ? (1 - easeOutExpo(cardP)) * cH * 0.2 : 0;

      ctx.save();
      ctx.globalAlpha = al;
      ctx.translate(slideOffsetX, slideOffsetY);
      drawCard(ctx, targetX, targetY, cW, cH, iS, name, handle, iconFn, baseSize);
      ctx.restore();
    });
  } else {
    // Portrait: vertical stack
    activePlatforms.forEach(({ name, handle, iconFn, delay }, i) => {
      if (t < T0 + delay) return;
      const cardP = clamp01(progress(t, T0 + delay, T0 + delay + 0.45));
      const al = easeOutBack(cardP);
      const cardTopY = contentTopY + i * (cH + gap);
      const slideOffsetY = (1 - easeOutExpo(cardP)) * H * 0.05;
      ctx.save();
      ctx.globalAlpha = al;
      ctx.translate(0, slideOffsetY);
      drawCard(ctx, cx - cW / 2, cardTopY, cW, cH, iS, name, handle, iconFn, baseSize);
      ctx.restore();
    });
  }
}

/* ── FINAL CTA ───────────────────────────────────────────────── */
export function drawFinalCTA(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, is169: boolean,
  platforms?: PlatformConfig[]
) {
  const cx = W / 2;
  const cy = H / 2;
  const baseSize = is169 ? W * 0.025 : W * 0.042;
  const gp = 0.5 + 0.5 * Math.sin(t * 1.8);

  ctx.save();
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
  bg.addColorStop(0, `rgba(140,60,255,${0.12 + gp * 0.06})`);
  bg.addColorStop(0.5, `rgba(255,100,0,${0.06 + gp * 0.03})`);
  bg.addColorStop(1, 'transparent');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const edgeGap = is169 ? H * 0.07 : H * 0.06;
  const bottomY = H - edgeGap;
  const topY = edgeGap;
  const ctaAlpha = clamp01(progress(t, 17.3, 17.8)) * (0.7 + 0.3 * Math.sin(t * 4));
  const ctaFont = `600 ${baseSize * 0.65}px Montserrat`;
  const ctaText = '↑  FOLLOW  •  LIKE  •  SUBSCRIBE  ↑';
  const ctaColor = 'rgba(255,255,255,0.45)';

  const drawSep = (y: number) => {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - (is169 ? W * 0.18 : W * 0.28), y);
    ctx.lineTo(cx + (is169 ? W * 0.18 : W * 0.28), y);
    ctx.stroke();
    ctx.restore();
  };

  fadeIn(ctx, ctaAlpha, () => {
    drawSep(topY + (is169 ? H * 0.032 : H * 0.022));
    drawCenteredText(ctx, ctaText, cx, topY, { font: ctaFont, color: ctaColor, glow: PURPLE, glowSize: 10, shadow: false });
  });
  fadeIn(ctx, ctaAlpha, () => {
    drawSep(bottomY - (is169 ? H * 0.032 : H * 0.022));
    drawCenteredText(ctx, ctaText, cx, bottomY, { font: ctaFont, color: ctaColor, glow: PURPLE, glowSize: 10, shadow: false });
  });

  /* ── Active platforms ───────────────────────────────────── */
  const activePlatforms = platforms && platforms.length > 0
    ? platforms.filter(p => p.enabled).sort((a, b) => a.order - b.order)
    : [
      { name: 'instagram' as const, handle: CONFIG.instagramHandle, enabled: true, order: 0, id: 'instagram' },
      { name: 'youtube' as const, handle: CONFIG.youtubeHandle, enabled: true, order: 1, id: 'youtube' },
      { name: 'facebook' as const, handle: CONFIG.facebookHandle, enabled: true, order: 2, id: 'facebook' },
      { name: 'github' as const, handle: CONFIG.githubHandle, enabled: true, order: 3, id: 'github' },
    ];

  const count = Math.max(1, activePlatforms.length);

  let rowCounts: number[];
  if (count === 1) rowCounts = [1];
  else if (count === 2) rowCounts = [2];
  else if (count === 3) rowCounts = [1, 2];
  else rowCounts = [2, 2];

  const rows = rowCounts.length;

  const maxPerRow = Math.max(...rowCounts);
  const iSizeSingle = is169 ? H * 0.12 : W * 0.18;
  const iSizeDouble = is169 ? H * 0.09 : W * 0.135;

  const rowGapY = is169 ? H * 0.03 : H * 0.025;
  const handleTextSize = is169
    ? (maxPerRow === 1 ? W * 0.014 : W * 0.011)
    : (maxPerRow === 1 ? W * 0.030 : W * 0.024);
  const iconToHandleGap = is169 ? H * 0.012 : H * 0.010;

  const rowHeights = rowCounts.map(rc => {
    const iSz = rc === 1 ? iSizeSingle : iSizeDouble;
    return iSz + iconToHandleGap + handleTextSize * 1.2;
  });
  const iconsBlockH = rowHeights.reduce((s, v) => s + v, 0) + rowGapY * (rows - 1);

  const lg = is169 ? H * 0.1 : H * 0.08;
  const blockTextH = lg * 2;
  const iconGapTop = is169 ? H * 0.05 : H * 0.04;
  const totalH = blockTextH + iconGapTop + iconsBlockH;
  const blockTop = cy - totalH / 2;

  const line1Y = blockTop;
  const line2Y = blockTop + lg;
  const line3Y = blockTop + lg * 2;
  const iconsTop = line3Y + iconGapTop;

  const p1 = easeOutExpo(clamp01(progress(t, 16.0, 16.5)));
  fadeIn(ctx, p1, () => {
    ctx.save(); ctx.translate(0, (1 - p1) * 40);
    drawCenteredText(ctx, 'NOW YOU KNOW. 👀', cx, line1Y, { font: `900 ${baseSize * 1.55}px Montserrat`, color: '#fff', glow: GOLD, glowSize: 40 });
    ctx.restore();
  });

  const p2 = easeOutExpo(clamp01(progress(t, 16.4, 16.9)));
  fadeIn(ctx, p2, () => {
    ctx.save(); ctx.translate(0, (1 - p2) * 40);
    drawCenteredText(ctx, 'FOLLOW THE JOURNEY.', cx, line2Y, { font: `800 ${baseSize * 1.1}px Montserrat`, color: 'rgba(255,200,100,0.9)', glow: ORANGE, glowSize: 30 });
    ctx.restore();
  });

  const p3 = easeOutExpo(clamp01(progress(t, 16.8, 17.3)));
  fadeIn(ctx, p3, () => {
    ctx.save(); ctx.translate(0, (1 - p3) * 40);
    drawCenteredText(ctx, CONFIG.username, cx, line3Y, { font: `900 ${baseSize * 0.95}px Montserrat`, color: '#fff', glow: PURPLE, glowSize: 25 });
    ctx.restore();
  });

  const ip = easeOutExpo(clamp01(progress(t, 17.1, 17.6)));
  const ipH = ip * 0.85;

  let cursorY = iconsTop;
  let platformIdx = 0;

  for (let r = 0; r < rows; r++) {
    const rc = rowCounts[r];
    const iSz = rc === 1 ? iSizeSingle : iSizeDouble;

    // Use a percentage of screen width to prevent long handle overlaps
    const centerGap = rc > 1 ? (is169 ? W * 0.30 : W * 0.45) : 0;

    const rowW = rc > 1 ? centerGap * (rc - 1) : 0;
    const rowX0 = cx - rowW / 2;

    const iconCenterY = cursorY + iSz / 2;
    const handleY = iconCenterY + iSz / 2 + iconToHandleGap + handleTextSize * 0.5;

    for (let k = 0; k < rc; k++) {
      const plat = activePlatforms[platformIdx];
      if (!plat) break;
      const fn = getIconFn(plat.name);
      const ix = rc === 1 ? cx : rowX0 + k * centerGap;
      const pulse = 0.92 + 0.08 * Math.sin(t * 3 + platformIdx * 1.2);

      fadeIn(ctx, ip, () => {
        ctx.save();
        ctx.translate(ix, iconCenterY);
        ctx.scale(pulse, pulse);
        ctx.translate(-ix, -iconCenterY);
        fn(ctx, ix, iconCenterY, iSz, 1);
        ctx.restore();
      });

      fadeIn(ctx, ipH, () => {
        drawCenteredText(ctx, plat.handle, ix, handleY, {
          font: `500 ${handleTextSize}px Montserrat`,
          color: 'rgba(255,255,255,0.65)',
          glowSize: 0,
          shadow: false,
        });
      });

      platformIdx++;
    }

    cursorY += rowHeights[r] + rowGapY;
  }
}