// src/app/alarm.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Vibration, Animated } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { getAllTasks, completeTask, Task } from '../storage/taskStorage';
import { cancelTaskAlarm, scheduleTaskAlarm } from '../notifications/notificationHelper';

export default function AlarmScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState<Task | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadTask = async () => {
      if (!taskId) return;
      const tasks = await getAllTasks();
      const found = tasks.find(t => t.id === taskId);
      if (found) {
        setTask(found);
      }
    };
    void loadTask();
  }, [taskId]);

  useEffect(() => {
    // Play alarm sound and vibrate
    const initAlarm = async () => {
      try {
        // Set audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });

        // Play default system sound (you can add custom sound file)
        const { sound: alarmSound } = await Audio.Sound.createAsync(
          // Use a default sound or add your own alarm.mp3 in assets
          { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3' },
          { 
            shouldPlay: true, 
            isLooping: true,
            volume: 1.0,
          }
        );
        setSound(alarmSound);

        // Vibrate
        const pattern = [0, 1000, 500, 1000, 500];
        Vibration.vibrate(pattern, true);

      } catch (error) {
        console.error('Error playing alarm sound:', error);
      }
    };

    initAlarm();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      // Cleanup
      if (sound) {
        sound.unloadAsync();
      }
      Vibration.cancel();
    };
  }, []);

  const stopAlarm = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    Vibration.cancel();
  };

  const handleDismiss = async () => {
    await stopAlarm();
    if (task?.notificationId) {
      await cancelTaskAlarm(task.notificationId);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleSnooze = async () => {
    await stopAlarm();
    if (!task) return;

    // Snooze for 10 minutes
    const snoozeDate = new Date();
    snoozeDate.setMinutes(snoozeDate.getMinutes() + 10);

    const snoozedTask: Task = {
      ...task,
      repeatType: 'once',
      reminderTime: snoozeDate.toISOString(),
    };

    await scheduleTaskAlarm(snoozedTask);

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleComplete = async () => {
    await stopAlarm();
    if (!task) return;
    await completeTask(task.id);

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (!task) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Text style={styles.title}>Loading alarm...</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleDismiss}>
          <Text style={styles.outlineBtnText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const timeStr = new Date(task.reminderTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <Animated.View style={[styles.alarmIconContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Ionicons name="alarm" size={64} color="#3B82F6" />
      </Animated.View>

      <View style={styles.content}>
        <Text style={styles.timeText}>{timeStr}</Text>
        <Text style={styles.title}>{task.title}</Text>
        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.completeBtnText}>Mark Done</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze} activeOpacity={0.85}>
          <Ionicons name="time" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.snoozeBtnText}>Snooze (10m)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.outlineBtn} onPress={handleDismiss} activeOpacity={0.85}>
          <Text style={styles.outlineBtnText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmIconContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  timeText: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#8E95A5',
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    gap: 12,
  },
  completeBtn: {
    backgroundColor: '#22C55E',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  snoozeBtn: {
    backgroundColor: '#3B82F6',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  snoozeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  outlineBtn: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12151C',
    borderWidth: 1,
    borderColor: '#1E2430',
  },
  outlineBtnText: {
    color: '#8E95A5',
    fontSize: 16,
    fontWeight: '600',
  },
});