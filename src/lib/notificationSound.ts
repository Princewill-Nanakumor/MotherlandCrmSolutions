// src/lib/notificationSound.ts

/**
 * Alarm sound manager - works like iPhone alarm clock
 * Keeps playing until manually stopped
 */
class AlarmSoundManager {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private unlockBound = false;

  /**
   * Browsers suspend AudioContext until a user gesture. Keep listening so a
   * later due reminder can beep even if the first click happened too early.
   */
  armUnlockFromUserGesture() {
    if (this.unlockBound || typeof window === "undefined") return;
    this.unlockBound = true;
    const onGesture = () => {
      this.unlock();
      if (this.isPlaying) {
        this.playAlarmCycle();
      }
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
  }

  unlock() {
    const ctx = this.ensureContext();
    if (ctx?.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
  }

  /**
   * Start playing alarm sound (loops until stopped)
   */
  start() {
    const ctx = this.ensureContext();
    if (this.isPlaying && this.intervalId) {
      if (ctx?.state === "suspended") {
        void ctx.resume().then(() => this.playAlarmCycle()).catch(() => {});
      } else {
        this.playAlarmCycle();
      }
      return;
    }

    this.isPlaying = true;
    const begin = () => {
      if (!this.isPlaying) return;
      this.playAlarmCycle();
    };

    if (ctx?.state === "suspended") {
      ctx.resume().then(begin).catch(() => {
        // Next user click will unlock and play.
      });
    } else {
      begin();
    }

    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.playAlarmCycle();
      }
    }, 1000);
  }

  /**
   * Stop playing alarm sound
   */
  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.audioContext && this.audioContext.state !== "closed") {
      return this.audioContext;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext: typeof AudioContext;
          }
        ).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      return this.audioContext;
    } catch (error) {
      console.error("Error creating audio context:", error);
      return null;
    }
  }

  /**
   * Play one cycle of the alarm sound (beep pattern)
   */
  private playAlarmCycle() {
    try {
      const audioContext = this.ensureContext();
      if (!audioContext) return;
      if (audioContext.state === "suspended") {
        void audioContext.resume();
        return;
      }

      const now = audioContext.currentTime;

      this.createBeep(audioContext, now, 0, 900);
      this.createBeep(audioContext, now, 0.15, 900);
      this.createBeep(audioContext, now, 0.3, 900);
    } catch (error) {
      console.error("Error playing alarm cycle:", error);
    }
  }

  /**
   * Create a single beep sound
   */
  private createBeep(
    audioContext: AudioContext,
    startTime: number,
    offset: number,
    frequency: number
  ) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "square";
    oscillator.frequency.value = frequency;

    const beepStart = startTime + offset;
    const beepDuration = 0.1;

    gainNode.gain.setValueAtTime(0, beepStart);
    gainNode.gain.linearRampToValueAtTime(0.3, beepStart + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.3, beepStart + beepDuration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0, beepStart + beepDuration);

    oscillator.start(beepStart);
    oscillator.stop(beepStart + beepDuration);
  }

  /**
   * Check if alarm is currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

// Export singleton instance
export const alarmSound = new AlarmSoundManager();

/**
 * Legacy function - now uses alarm manager
 */
export function playNotificationSound() {
  alarmSound.start();
}

/**
 * Stop notification sound
 */
export function stopNotificationSound() {
  alarmSound.stop();
}

/**
 * Alternative: Play system notification sound using HTML5 Audio
 * This uses a data URI for a simple beep sound
 */
export function playSimpleBeep() {
  try {
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKrj77hlHQU2kdfy0HotBSB1xe/glEILElyx6OyrWBUIQ5zd8sFuJAUugc7y2Ik2CBxqvfDjnE4MDk6o4/C5Zx4FNpHX8tB6LQUfccXv45ZDCxFYrOnnrVoXCEKb3PLDcCYFLoHO8tmJNggcab3w5ZxODA5NqOPwumgeBTWR1/LQei0FH3HF7+OWRAsSV6zp6K5bGQdBmtzy"
    );
    audio.volume = 0.5;
    audio.play().catch((err) => console.error("Error playing sound:", err));
  } catch (error) {
    console.error("Error playing beep:", error);
  }
}
