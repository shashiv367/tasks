import Constants from 'expo-constants';

// @notifee/react-native requires a custom native build and will throw if loaded
// in Expo Go. Guard the entire import behind a runtime check using dynamic require()
// so the module is never even touched in the Expo Go environment.
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const notifee = require('@notifee/react-native').default as typeof import('@notifee/react-native').default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EventType } = require('@notifee/react-native') as typeof import('@notifee/react-native');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { router } = require('expo-router') as typeof import('expo-router');

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
}

import 'expo-router/entry';
