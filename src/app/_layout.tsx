import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { addNotificationListeners } from '../notifications/notificationHelper';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const cleanup = addNotificationListeners((taskId) => {
      router.push({ pathname: '/alarm', params: { taskId } });
    });

    return cleanup;
  }, []);

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AnimatedSplashOverlay />
      
      <StatusBar style="light" backgroundColor="#1F3A5F" translucent={false} />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1F3A5F' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600', fontSize: 20 },
          contentStyle: { backgroundColor: '#F4F1EA' },
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