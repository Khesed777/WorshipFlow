import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';

const Metronome = () => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [beatCount, setBeatCount] = useState(1);
  const beatAnimation = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  // Generate click sound on demand
  const playClick = async (isAccent = false) => {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: generateClickSound(isAccent),
      });
      await sound.playAsync();
      setTimeout(() => sound.unloadAsync(), 500);
    } catch (error) {
      console.warn('Sound error:', error);
    }
  };

  // Generate simple click sound as base64 WAV
  const generateClickSound = (isAccent) => {
    const sampleRate = 44100;
    const duration = 0.1; // 100ms click
    const frequency = isAccent ? 1000 : 800; // Higher tone for accent
    const numSamples = Math.floor(duration * sampleRate);
    const attackSamples = Math.floor(0.01 * sampleRate); // 10ms attack
    const releaseSamples = Math.floor(0.03 * sampleRate); // 30ms release
    
    const audioData = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const time = i / sampleRate;
      
      // Apply envelope: linear attack, decay, then release
      let envelope = 1.0;
      if (i < attackSamples) {
        // Quick attack
        envelope = i / attackSamples;
      } else if (i >= numSamples - releaseSamples) {
        // Smooth release
        envelope = (numSamples - i) / releaseSamples;
      } else {
        // Sustain with gentle decay
        envelope = Math.exp(-8 * (time - attackSamples / sampleRate));
      }
      
      audioData[i] = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.3;
    }

    // Convert to WAV
    const wav = audioDataToWav(audioData, sampleRate);
    const base64 = arrayBufferToBase64(wav);
    return `data:audio/wav;base64,${base64}`;
  };

  const audioDataToWav = (audioData, sampleRate) => {
    const frameLength = audioData.length;
    const bytesPerSample = 2;
    const blockAlign = 2;
    
    const arrayBuffer = new ArrayBuffer(44 + frameLength * bytesPerSample);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    view.setUint8(0, 0x52); // 'R'
    view.setUint8(1, 0x49); // 'I'
    view.setUint8(2, 0x46); // 'F'
    view.setUint8(3, 0x46); // 'F'
    
    const fileSize = 36 + frameLength * bytesPerSample;
    view.setUint32(4, fileSize, true);
    
    view.setUint8(8, 0x57); // 'W'
    view.setUint8(9, 0x41); // 'A'
    view.setUint8(10, 0x56); // 'V'
    view.setUint8(11, 0x45); // 'E'
    
    view.setUint8(12, 0x66); // 'f'
    view.setUint8(13, 0x6d); // 'm'
    view.setUint8(14, 0x74); // 't'
    view.setUint8(15, 0x20); // ' '
    
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    
    view.setUint8(36, 0x64); // 'd'
    view.setUint8(37, 0x61); // 'a'
    view.setUint8(38, 0x74); // 't'
    view.setUint8(39, 0x61); // 'a'
    
    view.setUint32(40, frameLength * bytesPerSample, true);
    
    let offset = 44;
    for (let i = 0; i < frameLength; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
  };

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Get beats per measure
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const interval = 60000 / bpm; // ms per beat
    let currentBeat = 1;

    // Play first beat immediately
    const playBeat = () => {
      const isAccent = currentBeat === 1;
      playClick(isAccent);

      // Animate beat
      beatAnimation.setValue(0);
      Animated.timing(beatAnimation, {
        toValue: 1,
        duration: interval * 0.3,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();

      setBeatCount(currentBeat);
      currentBeat = currentBeat >= beatsPerMeasure ? 1 : currentBeat + 1;
    };

    playBeat();
    intervalRef.current = setInterval(playBeat, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, bpm, timeSignature]);

  const changeBpm = (delta) => {
    const newBpm = Math.max(30, Math.min(300, bpm + delta));
    setBpm(newBpm);
  };

  const toggleTimeSignature = () => {
    const signatures = ['2/4', '3/4', '4/4', '6/8'];
    const currentIndex = signatures.indexOf(timeSignature);
    setTimeSignature(signatures[(currentIndex + 1) % signatures.length]);
  };

  const scaleValue = beatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  return (
    <View style={styles.container}>
      {/* Beat Indicator */}
      <Animated.View
        style={[
          styles.beatIndicator,
          { transform: [{ scale: scaleValue }] },
        ]}
      >
        <Text style={styles.beatText}>{beatCount}</Text>
      </Animated.View>

      {/* BPM Display */}
      <View style={styles.bpmContainer}>
        <Text style={styles.bpmValue}>{bpm}</Text>
        <Text style={styles.bpmLabel}>BPM</Text>
      </View>

      {/* Quick BPM Controls */}
      <View style={styles.quickControlsRow}>
        <TouchableOpacity style={styles.quickButton} onPress={() => changeBpm(-10)}>
          <Feather name="minus" size={18} color="#2196F3" />
          <Text style={styles.quickButtonText}>10</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={() => changeBpm(-1)}>
          <Feather name="minus" size={14} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={() => changeBpm(1)}>
          <Feather name="plus" size={14} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={() => changeBpm(10)}>
          <Feather name="plus" size={18} color="#2196F3" />
          <Text style={styles.quickButtonText}>10</Text>
        </TouchableOpacity>
      </View>

      {/* Time Signature */}
      <TouchableOpacity style={styles.timeSignatureButton} onPress={toggleTimeSignature}>
        <Text style={styles.timeSignatureText}>{timeSignature}</Text>
      </TouchableOpacity>

      {/* Main Control Button */}
      <TouchableOpacity
        style={[styles.playButton, isPlaying && styles.playButtonActive]}
        onPress={() => setIsPlaying(!isPlaying)}
      >
        <Feather
          name={isPlaying ? 'pause' : 'play'}
          size={40}
          color="white"
        />
      </TouchableOpacity>

      {/* Status Text */}
      <Text style={styles.statusText}>
        {isPlaying ? '🎵 Playing' : '⏸ Stopped'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  beatIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2196F3',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  beatText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  bpmContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  bpmValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  bpmLabel: {
    fontSize: 14,
    color: '#7bb6f7',
    fontWeight: '600',
    marginTop: 4,
  },
  quickControlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickButton: {
    backgroundColor: '#e3f0fa',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  quickButtonText: {
    fontSize: 10,
    color: '#2196F3',
    fontWeight: 'bold',
    marginTop: 2,
  },
  timeSignatureButton: {
    backgroundColor: '#f3e5f5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  timeSignatureText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  playButtonActive: {
    backgroundColor: '#FF9800',
    shadowColor: '#FF9800',
  },
  statusText: {
    fontSize: 14,
    color: '#7bb6f7',
    fontWeight: '600',
  },
});

export default Metronome;
