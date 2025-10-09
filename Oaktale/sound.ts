// --- CONSTANTS ---
export const SOUNDS = {
    CLICK: { type: 'sine', frequency: 440, duration: 0.1 },
    SELECT: { type: 'triangle', frequency: [523.25, 659.25], duration: 0.2 },
    ATTACK: { type: 'square', frequency: 220, duration: 0.2 },
    HIT: { type: 'sawtooth', frequency: [880, 440], duration: 0.15 },
    DAMAGE: { type: 'square', frequency: [164.81, 110], duration: 0.2 },
    HEAL: { type: 'sine', frequency: [523.25, 659.25, 783.99], duration: 0.4 },
    LEVEL_UP: { type: 'triangle', frequency: [523, 659, 783, 1046], duration: 0.8 },
    WIN: { type: 'sine', frequency: [659.25, 783.99, 1046.50], duration: 0.6 },
    LOSE: { type: 'sawtooth', frequency: [220, 164.81, 110], duration: 1.0 },
    STUN: { type: 'square', frequency: [440, 220], duration: 0.3 },
    SHIELD: { type: 'sine', frequency: 880, duration: 0.2 },
} as const;


// --- SOUND MANAGER ---
class SoundManager {
    private audioCtx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isInitialized = false;
    private isEnabled = true;

    private async initialize() {
        if (this.isInitialized) return;

        const savedSetting = localStorage.getItem('oaktaleSoundEnabled');
        this.isEnabled = savedSetting !== 'false'; // default to true

        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
        this.isInitialized = true;
    }

    public isSoundEnabled(): boolean {
        return this.isEnabled;
    }

    public setSoundEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        localStorage.setItem('oaktaleSoundEnabled', enabled ? 'true' : 'false');
    }

    public play(sound: { type: OscillatorType; frequency: number | readonly number[]; duration: number; }) {
        if (!this.isInitialized || !this.masterGain || !this.audioCtx || !this.isEnabled) return;
        
        const playFrequency = (freq: number) => {
            const oscillator = this.audioCtx!.createOscillator();
            oscillator.type = sound.type;
            oscillator.frequency.setValueAtTime(freq, this.audioCtx!.currentTime);

            const gainNode = this.audioCtx!.createGain();
            gainNode.gain.setValueAtTime(0.5, this.audioCtx!.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx!.currentTime + sound.duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain!);
            oscillator.start(this.audioCtx!.currentTime);
            oscillator.stop(this.audioCtx!.currentTime + sound.duration);
        };
        
        if(typeof sound.frequency === 'number') {
            playFrequency(sound.frequency);
        } else {
            const frequencies = sound.frequency;
            const noteDuration = sound.duration / frequencies.length;
            frequencies.forEach((freq, index) => {
                 setTimeout(() => playFrequency(freq), index * noteDuration * 1000);
            });
        }
    }
    
    public userInteractionListener = () => {
        const initAudio = async () => {
            await this.initialize();
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
        window.addEventListener('click', initAudio);
        window.addEventListener('keydown', initAudio);
    }
}

export const soundManager = new SoundManager();
soundManager.userInteractionListener();