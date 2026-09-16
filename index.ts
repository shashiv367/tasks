import notifee, { EventType } from '@notifee/react-native';
import { router } from 'expo-router';

// Handle background events at module scope before AppRegistry / Expo Router mounts.
// This runs in a Headless JS task when the app is backgrounded or killed.
//
// EventType.DELIVERED — fires when the notification arrives while the app is in
//   the background (another app is in front). We immediately open the alarm screen
//   so the user doesn't have to tap the banner.
// EventType.PRESS — fires when the user taps the notification (from background/killed).
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const taskId = detail.notification?.data?.taskId;
  if (
    (type === EventType.DELIVERED || type === EventType.PRESS) &&
    typeof taskId === 'string'
  ) {
    setTimeout(() => {
      router.push({ pathname: '/alarm', params: { taskId } });
    }, 1000); // Give app a moment to mount if launched from killed state
  }
});

import 'expo-router/entry';
