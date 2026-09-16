import Constants, { ExecutionEnvironment } from 'expo-constants';

// Detect Expo Go safely across all Expo SDK versions
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const notifee = require('@notifee/react-native').default || require('@notifee/react-native');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { EventType } = require('@notifee/react-native');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { router } = require('expo-router');

    if (notifee && notifee.onBackgroundEvent) {
      notifee.onBackgroundEvent(async ({ type, detail }: any) => {
        const taskId = detail?.notification?.data?.taskId;
        if (
          (type === EventType?.DELIVERED || type === EventType?.PRESS) &&
          typeof taskId === 'string'
        ) {
          setTimeout(() => {
            router.push({ pathname: '/alarm', params: { taskId } });
          }, 1000);
        }
      });
    }
  } catch (err) {
    console.warn('Notifee native module not loaded:', err);
  }
}

import 'expo-router/entry';
