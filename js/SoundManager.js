/* Sound Manager - Web Audio API based sound effects */
class SoundManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 1.0;

        // 音声バッファ
        this.splashBuffer = null;
        this.bottleBuffer = null;
        this.pourBuffer = null;
        this.selectBuffer = null;
        this.activePourSources = []; // Active pour sound sources for concurrency control

        // AudioResourcesが読み込まれていればそこからロード
        if (typeof AudioResources !== 'undefined') {
            this.decodeBase64Sound(AudioResources.splash).then(buffer => {
                this.splashBuffer = buffer;
                console.log('Splash sound loaded from embedded data');
            });

            this.decodeBase64Sound(AudioResources.bottle).then(buffer => {
                this.bottleBuffer = buffer;
                console.log('Bottle sound loaded from embedded data');
            });

            if (AudioResources.pour) {
                this.decodeBase64Sound(AudioResources.pour).then(buffer => {
                    this.pourBuffer = buffer;
                    console.log('Pour sound loaded from embedded data');
                });
            }

            if (AudioResources.select) {
                this.decodeBase64Sound(AudioResources.select).then(buffer => {
                    this.selectBuffer = buffer;
                    console.log('Select sound loaded from embedded data');
                });
            }
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    // Base64/DataURI音声のデコード関数
    async decodeBase64Sound(dataUri) {
        try {
            const response = await fetch(dataUri);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error('Error loading sound from data URI:', error);
            return null;
        }
    }

    // 液体設置音「ぴちょん」- 短い水滴の音
    playDropSound() {
        if (this.masterVolume <= 0) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3 * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01 * this.masterVolume, this.audioContext.currentTime + 0.1);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // 瓶の当たる音 - 「氷の入ったグラス.mp3」または合成音
    playBottleSound() {
        if (this.masterVolume <= 0) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        console.log("Bottle sound played");

        if (this.bottleBuffer) {
            // 音声ファイル再生
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = this.bottleBuffer;
            gainNode.gain.value = 1.0 * this.masterVolume;

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            source.start(0);
        } else {
            // フォールバック：合成音「カランカラン」
            this.playSynthesizedBottleSound();
        }
    }

    playSynthesizedBottleSound() {
        // カランカランと複数回鳴らす
        const timings = [0, 0.08, 0.15, 0.21]; // 4回のガラス音のタイミング
        const frequencies = [3500, 3200, 3400, 3000]; // より高い周波数でガラスらしく
        const volumes = [0.3, 0.25, 0.2, 0.16]; // だんだん小さくなる

        timings.forEach((timing, index) => {
            // 1. メインのガラス音（トーン）
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'triangle'; // より硬質な音
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            const startTime = this.audioContext.currentTime + timing;
            const duration = 0.03; // より短く、シャープに

            // 高めの周波数で短く鳴らす（ガラスの音）
            oscillator.frequency.setValueAtTime(frequencies[index], startTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequencies[index] * 0.6, startTime + duration);

            gainNode.gain.setValueAtTime(volumes[index] * this.masterVolume, startTime);
            gainNode.gain.linearRampToValueAtTime(0.01 * this.masterVolume, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);

            // 2. ノイズ成分を追加（ガラスの衝突音）
            const noiseBuffer = this.createNoiseBuffer(0.02);
            const noiseSource = this.audioContext.createBufferSource();
            const noiseGain = this.audioContext.createGain();
            const noiseFilter = this.audioContext.createBiquadFilter();

            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.audioContext.destination);

            // ハイパスフィルターで高音域のノイズのみ
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(2000, startTime);

            // ノイズのボリューム（短く鋭く）
            noiseGain.gain.setValueAtTime(volumes[index] * 0.4 * this.masterVolume, startTime);
            noiseGain.gain.linearRampToValueAtTime(0.01 * this.masterVolume, startTime + 0.02);

            noiseSource.start(startTime);
            noiseSource.stop(startTime + 0.02);
        });
    }

    // 液体収集音（注ぐ音）
    playPourSound() {
        if (this.masterVolume <= 0) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (this.pourBuffer) {
            const currentTime = this.audioContext.currentTime;
            const duration = this.pourBuffer.duration;

            // 1. Strict Max 2 concurrency
            if (this.activePourSources.length >= 2) {
                return;
            }

            // 2. If 1 is active, only allow 2nd if the first is > 50% done
            if (this.activePourSources.length === 1) {
                const lastSourceObj = this.activePourSources[this.activePourSources.length - 1];
                const elapsed = currentTime - lastSourceObj.startTime;
                if (elapsed < duration * 0.5) {
                    return; // Too early to overlap
                }
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = this.pourBuffer;
            gainNode.gain.value = 0.5 * this.masterVolume; // Set volume to 0.5 * master

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Track this source with start time
            const sourceObj = { source: source, startTime: currentTime };
            this.activePourSources.push(sourceObj);

            // Cleanup on end
            source.onended = () => {
                const index = this.activePourSources.indexOf(sourceObj);
                if (index > -1) {
                    this.activePourSources.splice(index, 1);
                }
            };

            source.start(0);
        } else {
            console.warn('Pour sound not loaded yet or missing');
        }
    }

    // 決定音（宝石クリック）
    playSelectSound() {
        if (this.masterVolume <= 0) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (this.selectBuffer) {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = this.selectBuffer;
            gainNode.gain.value = 0.2 * this.masterVolume;

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start(0);
        } else {
            // Fallback: short high beep
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.frequency.value = 1200;
            gainNode.gain.value = 0.1 * this.masterVolume;
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.05);
        }
    }

    // 満タン音 - 「水滴3.mp3」または合成音
    playSplashSound() {
        if (this.masterVolume <= 0) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        console.log("Splash sound played");

        if (this.splashBuffer) {
            // 音声ファイル再生
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = this.splashBuffer;
            gainNode.gain.value = 1.0 * this.masterVolume;

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            source.start(0);
        } else {
            // Fallback: silence
            // this.playSynthesizedSplashSound();
        }
    }

    playSynthesizedSplashSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const noiseBuffer = this.createNoiseBuffer(0.1);
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();

        // トーン部分
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.3 * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01 * this.masterVolume, this.audioContext.currentTime + 0.2);

        // ノイズ部分（水しぶき）
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);

        noiseGain.gain.setValueAtTime(0.1 * this.masterVolume, this.audioContext.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.01 * this.masterVolume, this.audioContext.currentTime + 0.15);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
        noiseSource.start(this.audioContext.currentTime);
        noiseSource.stop(this.audioContext.currentTime + 0.15);
    }

    // 瓶の転がる音「ゴロゴロ...カラン」
    playRollingSound(duration = 1.0) {
        if (this.masterVolume <= 0) return;
        console.log("Rolling sound played");
        const t = this.audioContext.currentTime;

        // 1. ゴロゴロ音（低周波ノイズ）
        const noiseBuffer = this.createNoiseBuffer(duration);
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(400, t);
        noiseFilter.frequency.linearRampToValueAtTime(200, t + duration); // だんだんこもる

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.3 * this.masterVolume, t);
        noiseGain.gain.linearRampToValueAtTime(0.01 * this.masterVolume, t + duration);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);

        noiseSource.start(t);
        noiseSource.stop(t + duration);

        // 2. 周期的な変化（転がり感）
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(10, t); // 転がる速さ
        lfo.frequency.linearRampToValueAtTime(2, t + duration); // だんだん遅くなる

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 0.5 * this.masterVolume; // 変調の深さ

        // 修正: AM変調用のGainNodeを追加
        const amGain = this.audioContext.createGain();
        amGain.gain.value = 0.5 * this.masterVolume;

        // LFO -> amGain.gain
        // noiseSource -> noiseFilter -> noiseGain(エンベロープ) -> amGain(揺らぎ) -> destination

        // 再接続
        noiseFilter.disconnect();
        noiseFilter.connect(noiseGain);
        noiseGain.disconnect();
        noiseGain.connect(amGain);
        amGain.connect(this.audioContext.destination);

        // LFOをamGainのgainに接続して揺らす（ベースのゲイン中心に）
        // gain.valueは1.0にしておき、LFOで+-させる
        amGain.gain.setValueAtTime(1.0 * this.masterVolume, t);

        const lfoAmp = this.audioContext.createGain();
        lfoAmp.gain.value = 0.5 * this.masterVolume; // 揺れの大きさ
        lfo.connect(lfoAmp);
        lfoAmp.connect(amGain.gain);

        lfo.start(t);
        lfo.stop(t + duration);

        // 3. 不規則な「カラン」音（高音ノイズ）
        // ランダムなタイミングで数回鳴らす
        for (let i = 0; i < 3; i++) {
            if (Math.random() > 0.3) {
                const clickTime = t + Math.random() * (duration * 0.8);

                const clickOsc = this.audioContext.createOscillator();
                const clickGain = this.audioContext.createGain();

                clickOsc.type = 'triangle';
                clickOsc.frequency.setValueAtTime(2500 + Math.random() * 1000, clickTime);
                clickOsc.connect(clickGain);
                clickGain.connect(this.audioContext.destination);

                clickGain.gain.setValueAtTime(0.0, clickTime);
                clickGain.gain.linearRampToValueAtTime(0.05 * this.masterVolume, clickTime + 0.01);
                clickGain.gain.linearRampToValueAtTime(0.001 * this.masterVolume, clickTime + 0.05);

                clickOsc.start(clickTime);
                clickOsc.stop(clickTime + 0.05);
            }
        }
    }

    createNoiseBuffer(duration) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }
}
