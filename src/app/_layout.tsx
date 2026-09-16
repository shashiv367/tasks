import {
  DarkTheme,
  Stack,
  ThemeProvider,
  router,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'react-native';
import { useEffect } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DarkAlertHost } from '@/components/DarkAlert';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

SplashScreen.preventAutoHideAsync();

const pureDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
    text: '#FFFFFF',
    border: '#1E2430',
  },
};

export default function RootLayout() {
  useEffect(() => {
    // Ensure underlying native window is solid black to prevent white flashes
    void SystemUI.setBackgroundColorAsync('#000000');
  }, []);

  useEffect(() => {
    if (isExpoGo) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const notifee = require('@notifee/react-native').default || require('@notifee/react-native');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { EventType } = require('@notifee/react-native');

      if (!notifee?.onForegroundEvent) return;

      const unsubscribe = notifee.onForegroundEvent(({ type, detail }: any) => {
        const taskId = detail.notification?.data?.taskId;
        if (
          (type === EventType?.DELIVERED || type === EventType?.PRESS) &&
          typeof taskId === 'string'
        ) {
          router.push({ pathname: '/alarm', params: { taskId } });
        }
      });

      return unsubscribe;
    } catch (err) {
      console.warn('Notifee foreground listener error:', err);
    }
  }, []);

  return (
    <ThemeProvider value={pureDarkTheme}>
      <AnimatedSplashOverlay />
      
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          contentStyle: { backgroundColor: '#000000' },
          headerShadowVisible: false,
          animation: 'none', // Eliminates white flashes and slide animation between tabs
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false, animation: 'none' }}
        />

        <Stack.Screen
          name="add-task"
          options={{ title: 'New Task', animation: 'default' }}
        />

        <Stack.Screen
          name="history"
          options={{ title: 'History', animation: 'none' }}
        />
        
        <Stack.Screen
          name="notes/index"
          options={{ title: 'Notes', animation: 'none' }}
        />
        
        <Stack.Screen
          name="notes/[id]"
          options={{ title: 'Note', animation: 'default' }}
        />

        <Stack.Screen
          name="alarm"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </Stack>

      {/* Global dark alert dialog modal */}
      <DarkAlertHost />
    </ThemeProvider>
  );
}