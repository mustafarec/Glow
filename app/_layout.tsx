import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AppProvider } from '@/store/AppStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="selfie" />
          <Stack.Screen name="analysis" />
          <Stack.Screen name="blueprint" />
          <Stack.Screen name="change" />
          <Stack.Screen name="category" />
          <Stack.Screen name="recommendation" />
          <Stack.Screen name="generate" />
          <Stack.Screen name="result" />
          <Stack.Screen name="compare" />
          <Stack.Screen name="saved" />
          <Stack.Screen name="share-card" />
          <Stack.Screen name="goal" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="credits" />
          <Stack.Screen name="purchases" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="privacy" />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
