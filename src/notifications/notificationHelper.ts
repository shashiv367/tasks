import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { Task } from '../storage/taskStorage';

type NotificationsModule = typeof import('expo-notifications');

const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: NotificationsModule | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    console.warn('Notifications module is not available.', error);
  }
}

const CHANNEL_ID = 'task-reminders';

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const notificationsSupported = Boolean(Notifications);

const getPriorityEmoji = (priority: Task['priority']): string => {
  switch (priority) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '📌';
  }
};

const ensureAndroidChannel = async (): Promise<void> => {
  if (!Notifications || Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Task reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6C63FF',
    sound: 'default',
  });
};

export const requestPermission = async (): Promise<boolean> => {
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status === 'granted') {
    await ensureAndroidChannel();
    return true;
  }

  return false;
};

export const scheduleTaskNotification = async (
  task: Task
): Promise<string | null> => {
  if (!Notifications) return null;

  const hasPermission = await requestPermission();
  if (!hasPermission) return null;

  const date = new Date(task.reminderTime);
  const triggerType = Notifications.SchedulableTriggerInputTypes;

  const trigger =
    task.repeatType === 'daily'
      ? {
          type: triggerType.DAILY,
          hour: date.getHours(),
          minute: date.getMinutes(),
          channelId: CHANNEL_ID,
        }
      : {
          type: triggerType.DATE,
          date,
          channelId: CHANNEL_ID,
        };

  if (task.repeatType === 'once' && date.getTime() <= Date.now()) {
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${getPriorityEmoji(task.priority)} ${task.title}`,
        body: task.description || 'Time to complete your task.',
        sound: true,
        data: { taskId: task.id },
      },
      trigger,
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

export const cancelNotification = async (
  notificationId?: string | null
): Promise<void> => {
  if (!Notifications || !notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
};