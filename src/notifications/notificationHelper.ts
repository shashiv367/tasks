import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, Linking } from 'react-native';
import type {
  TimestampTrigger,
  NotificationSettings,
} from '@notifee/react-native';

import type { Task } from '../storage/taskStorage';
import { darkAlert } from '../components/DarkAlert';

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const CHANNEL_ID = 'task-alarms-v1';

export const notificationsSupported = !isExpoGo;

// Safe dynamic accessor for Notifee to prevent native crash in Expo Go
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNotifeeModule = (): any => {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@notifee/react-native');
    return {
      notifee: mod.default || mod,
      AndroidImportance: mod.AndroidImportance,
      AndroidVisibility: mod.AndroidVisibility,
      TriggerType: mod.TriggerType,
      RepeatFrequency: mod.RepeatFrequency,
      AndroidCategory: mod.AndroidCategory,
    };
  } catch {
    return null;
  }
};

export const ensureNotifeeChannel = async (): Promise<void> => {
  if (isExpoGo || Platform.OS !== 'android') return;
  const n = getNotifeeModule();
  if (!n) return;

  try {
    await n.notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Task alarms',
      importance: n.AndroidImportance?.HIGH ?? 4,
      visibility: n.AndroidVisibility?.PUBLIC ?? 1,
      bypassDnd: true,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 250, 300, 250],
      lightColor: '#1F3A5F',
    });
  } catch (err) {
    console.warn('Could not create Notifee channel:', err);
  }
};

/**
 * On Android 14+, USE_FULL_SCREEN_INTENT is restricted; users must explicitly grant
 * it via Settings > Apps > Special app access > Full-screen intents.
 * This helper prompts them to do so when the permission is missing.
 */
export const requestFullScreenIntentPermission = async (): Promise<void> => {
  if (isExpoGo || Platform.OS !== 'android') return;
  const n = getNotifeeModule();
  if (!n) return;

  try {
    const settings: NotificationSettings = await n.notifee.getNotificationSettings();
    if (settings.authorizationStatus !== 1) return;

    if (Platform.Version >= 34) {
      darkAlert(
        'Enable Full-Screen Alarms',
        'For alarms to appear over other apps and on the lock screen, please enable "Full-screen intents" for this app in Settings.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () =>
              Linking.sendIntent(
                'android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT',
                [{ key: 'android.provider.extra.APP_PACKAGE', value: 'com.shashi.tasks' }]
              ),
          },
        ]
      );
    }
  } catch {
    // Not all devices support this; silently fail.
  }
};

export const requestPermission = async (showSettingsDialog = false): Promise<boolean> => {
  if (isExpoGo) return false;
  const n = getNotifeeModule();
  if (!n) return false;

  try {
    const settings: NotificationSettings = await n.notifee.getNotificationSettings();
    let status = settings.authorizationStatus;

    if (status !== 1) { // 1 = AUTHORIZED
      const requested = await n.notifee.requestPermission();
      status = requested.authorizationStatus;
    }

    if (status === 1) {
      await ensureNotifeeChannel();
      return true;
    }

    if (showSettingsDialog && status === 0) { // 0 = DENIED
      darkAlert(
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
  } catch {
    // Silently handle
  }

  return false;
};

export const checkPermissions = async (): Promise<boolean> => {
  if (isExpoGo) return false;
  const n = getNotifeeModule();
  if (!n) return false;

  try {
    const settings: NotificationSettings = await n.notifee.getNotificationSettings();
    return settings.authorizationStatus === 1;
  } catch {
    return false;
  }
};

export const checkAndRequestExactAlarmPermission = async (): Promise<boolean> => {
  if (isExpoGo || Platform.OS !== 'android') return false;
  const n = getNotifeeModule();
  if (!n) return false;

  try {
    const settings = await n.notifee.getNotificationSettings();
    if (settings.android?.alarm === 1) {
      return true;
    }

    darkAlert(
      'Exact Alarm Permission Required',
      'To schedule task alarms precisely, please allow exact alarms in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: async () => {
            await n.notifee.openAlarmPermissionSettings();
          },
        },
      ]
    );
  } catch {
    // Silently handle
  }

  return false;
};

export const scheduleTaskAlarm = async (
  task: Task
): Promise<string | null> => {
  if (isExpoGo) return null;
  const n = getNotifeeModule();
  if (!n) return null;

  try {
    const hasNotificationPermission = await requestPermission();
    if (!hasNotificationPermission) return null;

    if (Platform.OS === 'android') {
      const hasAlarmPermission = await checkAndRequestExactAlarmPermission();
      if (!hasAlarmPermission) return null;
    }

    const date = new Date(task.reminderTime);
    if (task.repeatType === 'once' && date.getTime() <= Date.now()) {
      return null;
    }

    const trigger: TimestampTrigger = {
      type: n.TriggerType?.TIMESTAMP ?? 0,
      timestamp: date.getTime(),
      alarmManager: {
        allowWhileIdle: true,
      },
    };

    if (task.repeatType === 'daily') {
      trigger.repeatFrequency = n.RepeatFrequency?.DAILY ?? 1;
    }

    return await n.notifee.createTriggerNotification({
      id: task.id,
      title: task.title,
      body: task.description || "It's time",
      android: {
        channelId: CHANNEL_ID,
        category: n.AndroidCategory?.ALARM ?? 'alarm',
        importance: n.AndroidImportance?.HIGH ?? 4,
        visibility: n.AndroidVisibility?.PUBLIC ?? 1,
        sound: 'default',
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        pressAction: { id: 'default', launchActivity: 'default' },
      },
      data: { taskId: task.id },
    }, trigger);
  } catch (error) {
    console.error('Error scheduling notifee alarm:', error);
    return null;
  }
};

export const cancelTaskAlarm = async (
  notificationId?: string | null
): Promise<void> => {
  if (isExpoGo || !notificationId) return;
  const n = getNotifeeModule();
  if (!n) return;

  try {
    await n.notifee.cancelTriggerNotification(notificationId);
  } catch (error) {
    console.error('Error cancelling notifee alarm:', error);
  }
};