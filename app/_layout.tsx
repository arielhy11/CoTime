import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  Rubik_900Black,
  useFonts,
} from '@expo-google-fonts/rubik';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import 'react-native-reanimated';
import '../global.css';

import { AppText } from '@/src/components/common/AppText';
import { Button } from '@/src/components/common/Button';
import { useProtectedRoute } from '@/src/hooks/useProtectedRoute';
import { hydrateLanguage } from '@/src/i18n/config';
import { initSounds } from '@/src/services/sound';
import { useAuthStore } from '@/src/store/authStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { colors, spacing } from '@/src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.background, primary: colors.primary },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
    Rubik_800ExtraBold,
    Rubik_900Black,
  });
  const authStatus = useAuthStore((s) => s.status);

  useEffect(() => {
    void hydrateLanguage();
    void useSettingsStore.getState().hydrate();
    void initSounds();
  }, []);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  const ready = fontsLoaded && authStatus !== 'loading';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <ThemeProvider value={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  useProtectedRoute();
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const retry = useAuthStore((s) => s.retry);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.center, styles.padded]}>
        <AppText style={styles.emoji} center>📡</AppText>
        <AppText variant="title" center>{t('app.errorTitle')}</AppText>
        <AppText center color={colors.textMuted}>{t('app.errorBody')}</AppText>
        <Button title={t('app.retry')} onPress={() => void retry()} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade' }}>
      <Stack.Screen name="(pages)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="dev/fx" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.md },
  padded: { padding: spacing.lg },
  emoji: { fontSize: 56, lineHeight: 66 },
});
