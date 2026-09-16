import Constants from 'expo-constants';
import { Platform, Linking, Alert } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  TriggerType,
  RepeatFrequency,
  AndroidCategory,
  TimestampTrigger,
} from '@notifee/react-native';

import type { Task } from '../storage/taskStorage';

export const isExpoGo = Constants.appOwnership === 'expo';

const CHANNEL_ID = 'task-alarms-v1';

export const notificationsSupported = !isExpoGo;

export const ensureNotifeeChannel = async (): Promise<void> => {
  if (isExpoGo || Platform.OS !== 'android') return;

  // HIGH importance + PUBLIC visibility required for full-screen intent on lock screen.
  // bypassDnd ensures alarms ring even when Do Not Disturb is active.
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Task alarms',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    bypassDnd: true,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 250, 300, 250],
    lightColor: '#1F3A5F',
  });
};

/**
 * On Android 14+, USE_FULL_SCREEN_INTENT is restricted; users must explicitly grant
 * it via Settings > Apps > Special app access > Full-screen intents.
 * This helper prompts them to do so when the permission is missing.
 */
export const requestFullScreenIntentPermission = async (): Promise<void> => {
  if (isExpoGo || Platform.OS !== 'android') return;

  // canUseFullScreenIntent was added in Android 14 (API 34).
  // notifee doesn't expose canUseFullScreenIntent directly, so we use Linking.
  try {
    // Check via a best-effort: if the API isn't available on this SDK version, skip.
    const settings = await notifee.getNotificationSettings();
    // authorizationStatus !== 1 means we can't show notifications at all — skip the FSI prompt.
    if (settings.authorizationStatus !== 1) return;

    // Only applies on Android 14+ (API 34). We send users to the special-access screen.
    // On older versions, USE_FULL_SCREEN_INTENT is auto-granted if declared in the manifest.
    if (Platform.Version >= 34) {
      Alert.alert(
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

  const settings = await notifee.getNotificationSettings();
  let status = settings.authorizationStatus;

  if (status !== 1) { // 1 = AUTHORIZED
    const requested = await notifee.requestPermission();
    status = requested.authorizationStatus;
  }

  if (status === 1) {
    await ensureNotifeeChannel();
    return true;
  }

  if (showSettingsDialog && status === 0) { // 0 = DENIED
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
  if (isExpoGo) return false;
  
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus === 1;
};

export const checkAndRequestExactAlarmPermission = async (): Promise<boolean> => {
  if (isExpoGo || Platform.OS !== 'android') return false;

  const settings = await notifee.getNotificationSettings();
  
  // settings.android.alarm represents exact alarm permission
  if (settings.android?.alarm === 1) {
    return true;
  }
  
  Alert.alert(
    'Exact Alarm Permission Required',
    'To schedule task alarms precisely, please allow exact alarms in settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: async () => {
          await notifee.openAlarmPermissionSettings();
        },
      },
    ]
  );
  
  return false;
};

export const scheduleTaskAlarm = async (
  task: Task
): Promise<string | null> => {
  if (isExpoGo) return null;

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
    type: TriggerType.TIMESTAMP,
    timestamp: date.getTime(),
    alarmManager: {
      allowWhileIdle: true,
    },
  };
  
  if (task.repeatType === 'daily') {
    trigger.repeatFrequency = RepeatFrequency.DAILY;
  }

  try {
    return await notifee.createTriggerNotification({
      id: task.id,
      title: task.title,
      body: task.description || "It's time",
      android: {
        channelId: CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC, // Show content on lock screen
        sound: 'default',
        // launchActivity: 'default' launches MainActivity, required for full-screen
        // intent to actually surface the app on the lock screen / over other apps.
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

  try {
    await notifee.cancelTriggerNotification(notificationId);
  } catch (error) {
    console.error('Error cancelling notifee alarm:', error);
  }
};