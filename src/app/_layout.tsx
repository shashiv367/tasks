import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, StatusBar } from 'react-native';
import { useEffect } from 'react';
import Constants from 'expo-constants';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

const isExpoGo = Constants.appOwnership === 'expo';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isExpoGo) return; // notifee not available in Expo Go

    // Handle foreground events — requires native notifee module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const notifee = require('@notifee/react-native').default as typeof import('@notifee/react-native').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { EventType } = require('@notifee/react-native') as typeof import('@notifee/react-native');

    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      const taskId = detail.notification?.data?.taskId;
      if (
        (type === EventType.DELIVERED || type === EventType.PRESS) &&
        typeof taskId === 'string'
      ) {
        router.push({ pathname: '/alarm', params: { taskId } });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AnimatedSplashOverlay />
      
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#111' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600', fontSize: 20 },
          contentStyle: { backgroundColor: '#000' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="add-task"
          options={{ title: 'New task' }}
        />

        <Stack.Screen
          name="history"
          options={{ title: 'History' }}
        />
        
        <Stack.Screen
          name="notes/index"
          options={{ title: 'Notes' }}
        />
        
        <Stack.Screen
          name="notes/[id]"
          options={{ title: 'Edit Note' }}
        />

        <Stack.Screen
          name="alarm"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}