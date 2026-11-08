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

import { BirthdayGreeting } from '@/components/birthday-greeting';
import { HomeGate } from '@/components/home-gate';
import { ToastProvider } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { LanguageProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ExpensesProvider } from '@/lib/expenses';
import { HomeProvider, useHomeState } from '@/lib/home';
import { PlacesProvider } from '@/lib/places';
import { RequestsProvider } from '@/lib/requests';
import { UsageTracker } from '@/lib/usage';

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
            <HomeProvider>
              <ExpensesProvider>
                <PlacesProvider>
                  <RequestsProvider>
                    <ToastProvider>
                      <RootStack />
                    </ToastProvider>
                  </RequestsProvider>
                </PlacesProvider>
              </ExpensesProvider>
            </HomeProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const theme = useTheme();
  const { ready, isSignedIn, mustChangePassword, token } = useAuth();
  const { state } = useHomeState();

  if (!ready) return null;
  // Signed in: every screen needs the student's real data, so wait for it here.
  if (isSignedIn && state.status !== 'ready') return <HomeGate />;

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
          <Stack.Screen name="apartment/feedback" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/payments" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/checkin" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/checkout" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/contract" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/rules" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="apartment/trash" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="expenses/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="expenses/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="expenses/edit" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="expenses/settle" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="travel/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="attraction/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="festival/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="requests/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="requests/new" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="requests/service/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="requests/maintenance" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="requests/stay-change" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="requests/gourmet" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="requests/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
      {isSignedIn && !mustChangePassword && <BirthdayGreeting key={token} />}
      {isSignedIn && !mustChangePassword && <UsageTracker key={`usage-${token}`} />}
    </>
  );
}
