import { CONFIG } from '@/config';

class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private muted: boolean = false;

  async preload(muted: boolean): Promise<void> {
    this.muted = muted;
    if (muted) return;

    const entries: [string, string][] = [
      ['intro',       CONFIG.audio.intro],
      ['tick',        CONFIG.audio.tick],
      ['reveal',      CONFIG.audio.reveal],
      ['celebration', CONFIG.audio.celebration],
    ];

    const promises = entries.map(([key, src]) => {
      return new Promise<void>((resolve) => {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = 0.7;
        audio.oncanplaythrough = () => {
          this.sounds.set(key, audio);
          resolve();
        };
        audio.onerror = () => resolve();
        setTimeout(() => resolve(), 2000);
        audio.src = src;
        audio.load();
      });
    });

    await Promise.all(promises);
  }

  play(key: string, volume: number = 0.7, loop: boolean = false): void {
    if (this.muted) return;
    const audio = this.sounds.get(key);
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.volume = volume;
      audio.loop = loop;
      audio.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  stop(key: string): void {
    const audio = this.sounds.get(key);
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
  }

  stopAll(): void {
    this.sounds.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopAll();
  }
}

export const audioManager = new AudioManager();