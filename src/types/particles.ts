// src/types/particles.ts
import { Particle } from '@/types';

let particleId = 0;

const COLORS = [
  '#ff9900', '#ffcc00', '#ff6600',
  '#aa44ff', '#6600ff', '#cc88ff',
  '#00ccff', '#0088ff',
  '#ff4488', '#ff88cc',
  '#ffffff', '#ffeecc',
];

export function createFloatParticle(canvasWidth: number, canvasHeight: number): Particle {
  return {
    id: particleId++,
    x: Math.random() * canvasWidth,
    y: canvasHeight + 20,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -(Math.random() * 1.2 + 0.4),
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.6 + 0.1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    life: 0,
    maxLife: Math.random() * 200 + 100,
    type: 'float',
    shape: 'circle',
  };
}

export function createBurstParticles(cx: number, cy: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = Math.random() * 8 + 3;
    particles.push({
      id: particleId++,
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 5 + 2,
      opacity: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 0,
      maxLife: Math.random() * 60 + 40,
      type: 'burst',
      shape: Math.random() > 0.5 ? 'circle' : 'star',
    });
  }
  return particles;
}

export function createConfettiParticles(canvasWidth: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: particleId++,
      x: Math.random() * canvasWidth,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 1.5,
      size: Math.random() * 10 + 4,
      opacity: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 0,
      maxLife: Math.random() * 180 + 120,
      type: 'confetti',
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    });
  }
  return particles;
}

export function updateParticle(p: Particle): Particle {
  const progress = p.life / p.maxLife;
  let opacity = p.opacity;

  if (p.type === 'burst') {
    opacity = 1 - progress;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.vy += 0.15;
  } else if (p.type === 'confetti') {
    opacity = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;
    p.vy += 0.05;
    p.vx += Math.sin(p.life * 0.1) * 0.05;
  } else {
    opacity = progress < 0.1
      ? progress / 0.1
      : progress > 0.8
      ? (1 - progress) / 0.2
      : 1;
    opacity *= p.opacity;
  }

  return {
    ...p,
    x: p.x + p.vx,
    y: p.y + p.vy,
    life: p.life + 1,
    opacity,
    rotation: (p.rotation || 0) + (p.rotationSpeed || 0),
  };
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
  ctx.translate(p.x, p.y);
  if (p.rotation !== undefined) ctx.rotate((p.rotation * Math.PI) / 180);

  ctx.fillStyle = p.color;

  if (p.shape === 'star') {
    drawStar(ctx, 0, 0, p.size * 0.5, p.size, 5);
  } else if (p.shape === 'square') {
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
    ctx.fill();

    if (p.type === 'float') {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  innerR: number, outerR: number,
  points: number
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}