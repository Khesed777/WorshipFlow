// src/chordGenerator.js
// Utility to generate base64-encoded WAV files for chord tones

const sampleRate = 44100;
const duration = 1; // seconds

// Helper function to create a sine wave with attack and release envelope
function generateSineWave(frequency, duration, sampleRate) {
    const numSamples = Math.floor(duration * sampleRate);
    const audioData = new Float32Array(numSamples);
    const attackTime = 0.05; // 50ms attack
    const releaseTime = 0.1; // 100ms release
    const attackSamples = Math.floor(attackTime * sampleRate);
    const releaseSamples = Math.floor(releaseTime * sampleRate);
    
    for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;
        const value = Math.sin(2 * Math.PI * frequency * time);
        
        // Apply envelope: attack -> sustain -> release
        let envelope = 1.0;
        if (i < attackSamples) {
            // Linear attack
            envelope = i / attackSamples;
        } else if (i >= numSamples - releaseSamples) {
            // Linear release
            envelope = (numSamples - i) / releaseSamples;
        }
        
        audioData[i] = value * envelope * 0.3; // Reduce volume to prevent clipping
    }
    
    return audioData;
}

// Helper function to mix multiple sine waves with attack and release envelope
function mixWaves(frequencies, duration, sampleRate) {
    const numSamples = Math.floor(duration * sampleRate);
    const audioData = new Float32Array(numSamples);
    const attackTime = 0.05; // 50ms attack
    const releaseTime = 0.1; // 100ms release
    const attackSamples = Math.floor(attackTime * sampleRate);
    const releaseSamples = Math.floor(releaseTime * sampleRate);
    
    for (let i = 0; i < numSamples; i++) {
        let sample = 0;
        for (const frequency of frequencies) {
            const time = i / sampleRate;
            sample += Math.sin(2 * Math.PI * frequency * time);
        }
        
        // Apply envelope: attack -> sustain -> release
        let envelope = 1.0;
        if (i < attackSamples) {
            // Linear attack
            envelope = i / attackSamples;
        } else if (i >= numSamples - releaseSamples) {
            // Linear release
            envelope = (numSamples - i) / releaseSamples;
        }
        
        // Average and reduce volume
        audioData[i] = (sample / frequencies.length) * envelope * 0.25;
    }
    
    return audioData;
}

// Convert float audio data to WAV format
function audioDataToWav(audioData, sampleRate) {
    const frameLength = audioData.length;
    const bytesPerSample = 2;
    const blockAlign = 2; // channels * bytesPerSample
    
    // WAV header
    const arrayBuffer = new ArrayBuffer(44 + frameLength * bytesPerSample);
    const view = new DataView(arrayBuffer);
    
    // "RIFF" chunk descriptor
    view.setUint8(0, 0x52); // 'R'
    view.setUint8(1, 0x49); // 'I'
    view.setUint8(2, 0x46); // 'F'
    view.setUint8(3, 0x46); // 'F'
    
    // File length - 8
    const fileSize = 36 + frameLength * bytesPerSample;
    view.setUint32(4, fileSize, true);
    
    // "WAVE" format
    view.setUint8(8, 0x57); // 'W'
    view.setUint8(9, 0x41); // 'A'
    view.setUint8(10, 0x56); // 'V'
    view.setUint8(11, 0x45); // 'E'
    
    // "fmt " subchunk
    view.setUint8(12, 0x66); // 'f'
    view.setUint8(13, 0x6d); // 'm'
    view.setUint8(14, 0x74); // 't'
    view.setUint8(15, 0x20); // ' '
    
    // Subchunk1Size (16 for PCM)
    view.setUint32(16, 16, true);
    
    // AudioFormat (1 for PCM)
    view.setUint16(20, 1, true);
    
    // NumChannels (1 for mono)
    view.setUint16(22, 1, true);
    
    // SampleRate
    view.setUint32(24, sampleRate, true);
    
    // ByteRate
    view.setUint32(28, sampleRate * blockAlign, true);
    
    // BlockAlign
    view.setUint16(32, blockAlign, true);
    
    // BitsPerSample
    view.setUint16(34, 16, true);
    
    // "data" subchunk
    view.setUint8(36, 0x64); // 'd'
    view.setUint8(37, 0x61); // 'a'
    view.setUint8(38, 0x74); // 't'
    view.setUint8(39, 0x61); // 'a'
    
    // Subchunk2Size
    view.setUint32(40, frameLength * bytesPerSample, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < frameLength; i++) {
        // Convert float to 16-bit PCM
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
    }
    
    return arrayBuffer;
}

// Convert array buffer to base64
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Generate chord tones
export const chordTones = {
    'A': mixWaves([440, 554.37, 659.25], duration, sampleRate),
    'A#': mixWaves([466.16, 587.33, 698.46], duration, sampleRate),
    'B': mixWaves([493.88, 622.25, 739.99], duration, sampleRate),
    'C': mixWaves([261.63, 329.63, 392.00], duration, sampleRate),
    'C#': mixWaves([277.18, 349.23, 415.30], duration, sampleRate),
    'D': mixWaves([293.66, 369.99, 440.00], duration, sampleRate),
    'D#': mixWaves([311.13, 392.00, 466.16], duration, sampleRate),
    'E': mixWaves([329.63, 415.30, 493.88], duration, sampleRate),
    'F': mixWaves([349.23, 440.00, 523.25], duration, sampleRate),
    'F#': mixWaves([369.99, 466.16, 554.37], duration, sampleRate),
    'G': mixWaves([392.00, 493.88, 587.33], duration, sampleRate),
    'G#': mixWaves([415.30, 523.25, 622.25], duration, sampleRate),
};

// Generate base64 encoded WAV data URLs
export const chordDataUrls = {};
for (const [note, audioData] of Object.entries(chordTones)) {
    const wav = audioDataToWav(audioData, sampleRate);
    const base64 = arrayBufferToBase64(wav);
    chordDataUrls[note] = `data:audio/wav;base64,${base64}`;
}
