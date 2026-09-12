import Constants from 'expo-constants';
import { Platform, Linking, Alert } from 'react-native';

import type { Task } from '../storage/taskStorage';

type NotificationsModule = typeof import('expo-notifications');

export const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: NotificationsModule | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    console.warn('Notifications module is not available.', error);
  }
}

const CHANNEL_ID = 'task-alarms-v1';

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

const ensureAndroidChannel = async (): Promise<void> => {
  if (!Notifications || Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Task alarms',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1F3A5F',
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDND: false,
  });
};

export const requestPermission = async (showSettingsDialog = false): Promise<boolean> => {
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

  if (showSettingsDialog && status === 'denied') {
    Alert.alert(
      'Alarms are off',
      'Turn on alarms and reminders for this app in Android settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  return false;
};

export const checkPermissions = async (): Promise<boolean> => {
  if (!Notifications) return false;
  
  const existing = await Notifications.getPermissionsAsync();
  return existing.status === 'granted';
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
        title: task.title,
        body: task.description || "It's time",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryId: 'alarm',
        data: { taskId: task.id },
      },
      trigger,
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

export const addNotificationListeners = (
  onAlarmReceived: (taskId: string) => void
) => {
  if (!Notifications || isExpoGo) return () => {};

  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      const content = notification.request.content;
      if (content.categoryId === 'alarm' && content.data?.taskId) {
        onAlarmReceived(content.data.taskId as string);
      }
    }
  );

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const content = response.notification.request.content;
      if (content.categoryId === 'alarm' && content.data?.taskId) {
        onAlarmReceived(content.data.taskId as string);
      }
    }
  );

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
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