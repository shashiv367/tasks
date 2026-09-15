import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    
    // Schedule a temporary one-time alarm
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
    
    // Complete the task in storage (handles alarm cancellation internally now)
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
        <StatusBar barStyle="light-content" />
        <Text style={styles.title}>Loading...</Text>
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.content}>
        <Text style={styles.timeText}>{timeStr}</Text>
        <Text style={styles.title}>{task.title}</Text>
        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeBtnText}>Complete</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze}>
          <Text style={styles.snoozeBtnText}>Snooze (10m)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.outlineBtn} onPress={handleDismiss}>
          <Text style={styles.outlineBtnText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1C2E', // Very dark navy for alarm
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  timeText: {
    fontSize: 56,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
  },
  actions: {
    paddingHorizontal: 24,
    gap: 16,
  },
  completeBtn: {
    backgroundColor: '#2F6F6A', // Muted teal
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  outlineBtn: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  outlineBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  snoozeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozeBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
