import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';

const Metronome = () => {
  const [bpm, setBpm] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const animation = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);
  const soundRef = useRef(null);

  useEffect(() => {
    async function loadSound() {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/click.wav')
      );
      soundRef.current = sound;
    }
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const interval = 60000 / bpm;
    intervalRef.current = setInterval(async () => {
      if (soundRef.current) {
        try {
          await soundRef.current.replayAsync();
        } catch (e) {
          console.warn('Sound playback error:', e);
        }
      }
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1.5,
          duration: interval / 2,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: interval / 2,
          useNativeDriver: true,
        }),
      ]).start();
    }, interval);
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, bpm]);

  const changeBpm = (delta) => {
    setBpm((prevBpm) => {
      let newBpm = prevBpm + delta;
      if (newBpm < 40) newBpm = 40;
      if (newBpm > 300) newBpm = 300;
      return newBpm;
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 100}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Metronome</Text>
        <Animated.View style={[styles.cue, { transform: [{ scale: animation }] }]} />
        <Text style={styles.bpm}>{bpm} BPM</Text>
        <View style={styles.controlsColumn}>
          {/* First group row */}
          <View style={styles.smallGroup}>
            <TouchableOpacity style={styles.smallButton} onPress={() => changeBpm(-10)}>
              <Text style={styles.buttonText}>-10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={() => changeBpm(-5)}>
              <Text style={styles.buttonText}>-5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={() => changeBpm(5)}>
              <Text style={styles.buttonText}>+5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={() => changeBpm(10)}>
              <Text style={styles.buttonText}>+10</Text>
            </TouchableOpacity>
          </View>
          {/* Second group row */}
          <View style={styles.regularGroup}>
            <TouchableOpacity style={styles.regularButton} onPress={() => changeBpm(-1)}>
              <Text style={styles.buttonText}>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.regularButton, isPlaying && styles.stopButton]} onPress={() => setIsPlaying(prev => !prev)}>
              <Text style={styles.buttonText}>{isPlaying ? 'Stop' : 'Start'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.regularButton} onPress={() => changeBpm(1)}>
              <Text style={styles.buttonText}>+1</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    padding: 30,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#ffcc5eff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#34495E',
  },
  cue: {
    width: 30,
    height: 30,
    borderRadius: 45,
    backgroundColor: '#E74C3C',
    marginBottom: 10,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  bpm: {
    fontSize: 28,
    color: '#34495E',
    fontWeight: '600',
    marginBottom: 20,
  },
  controlsColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 20, // for RN >= 0.71 use marginBottom for older versions
  },
  smallGroup: {
    flexDirection: 'row',
    gap: 12, // marginHorizontal for RN older versions
  },
  regularGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  smallButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
    minWidth: 50,
    alignItems: 'center', 
  },
  regularButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 7,
    minWidth: 75,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#C0392B',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Metronome;
