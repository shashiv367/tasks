import notifee, { EventType } from '@notifee/react-native';
import { router } from 'expo-router';

// Handle background events at module scope before AppRegistry / Expo Router mounts
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const taskId = detail.notification?.data?.taskId;
  if (type === EventType.PRESS && typeof taskId === 'string') {
    setTimeout(() => {
      router.push({ pathname: '/alarm', params: { taskId } });
    }, 1000); // Give app a moment to mount if launched from killed state
  }
});

import 'expo-router/entry';
