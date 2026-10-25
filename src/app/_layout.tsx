import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Outfit_400Regular } from '@expo-google-fonts/outfit';
import { MaterialSymbols_300Light } from '@expo-google-fonts/material-symbols/300Light';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { LanguageProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Outfit_400Regular,
    MaterialSymbols_300Light,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <RootStack />
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const theme = useTheme();
  const { ready, isSignedIn, mustChangePassword } = useAuth();

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn && mustChangePassword}>
          <Stack.Screen name="change-password" />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn && !mustChangePassword}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="nearby" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="emergency" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="restaurants/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="restaurants/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="restaurants/dishes" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="nightlife/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="nightlife/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sports/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="services/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="services/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sports/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="admin/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="admin/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="beauty/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="beauty/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/cleaning" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/contract" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/roommates" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="travel/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="attraction/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="festival/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
