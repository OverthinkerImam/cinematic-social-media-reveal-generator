export type AspectRatio = '16:9' | '9:16';

export interface AppState {
  phase: 'control' | 'reveal';
  aspectRatio: AspectRatio;
  muted: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'float' | 'burst' | 'confetti';
  rotation?: number;
  rotationSpeed?: number;
  shape?: 'circle' | 'square' | 'star';
}