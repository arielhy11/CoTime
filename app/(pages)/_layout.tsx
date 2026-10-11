import { Stack } from 'expo-router';
import { colors } from '../../src/theme/tokens';

export default function PagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="join" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="profile" />
      <Stack.Screen name="session/[id]" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
