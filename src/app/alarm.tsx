import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getAllTasks, completeTask, Task } from '../storage/taskStorage';
import { cancelTaskAlarm, scheduleTaskAlarm } from '../notifications/notificationHelper';

export default function AlarmScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState<Task | null>(null);

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

  const handleDismiss = async () => {
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

      <View style={styles.alarmIconContainer}>
        <Ionicons name="alarm" size={48} color="#3B82F6" />
      </View>

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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  timeText: {
    fontSize: 54,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -1,
  },
  title: {
    fontSize: 26,
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
