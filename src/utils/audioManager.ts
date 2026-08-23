import { CONFIG } from '@/config';

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private muted = false;

  async preload(muted: boolean): Promise<void> {
    this.muted = muted;

    if (!this.audio) {
      this.audio = new Audio(CONFIG.audio.intro);
      this.audio.preload = 'auto';

      await new Promise<void>((resolve) => {
        if (this.audio!.readyState >= 3) return resolve();

        this.audio!.oncanplaythrough = () => resolve();
        this.audio!.onerror = () => resolve();
        setTimeout(resolve, 2000);

        this.audio!.load();
      });
    }

    if (!this.context) {
      this.context = new AudioContext();
      this.destination = this.context.createMediaStreamDestination();
      this.source = this.context.createMediaElementSource(this.audio);

      this.source.connect(this.destination);
      this.source.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {}
    }
  }

  getStream(): MediaStream | null {
    return this.destination?.stream ?? null;
  }

  play(key: string, volume = 0.7, loop = false): void {
    if (this.muted || key !== 'intro' || !this.audio) return;

    try {
      this.audio.currentTime = 0;
      this.audio.volume = volume;
      this.audio.loop = loop;

      if (this.context?.state === 'suspended') {
        this.context.resume().catch(() => {});
      }

      this.audio.play().catch(() => {});
    } catch {}
  }

  stop(key: string): void {
    if (key !== 'intro' || !this.audio) return;

    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch {}
  }

  stopAll(): void {
    if (!this.audio) return;

    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch {}
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopAll();
  }
}

export const audioManager = new AudioManager();