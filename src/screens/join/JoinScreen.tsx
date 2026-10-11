import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { Header } from '../../components/common/Header';
import { Screen } from '../../components/common/Screen';
import { CODE_LENGTH, isCompleteSessionCode, normalizeSessionCode } from '../../game/sessionCode';
import { useSessionStore } from '../../store/sessionStore';
import { colors, fonts, radii, spacing } from '../../theme/tokens';
import { errorKeyOf } from '../../utils/errors';

export function JoinScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const joinByCode = useSessionStore((s) => s.joinByCode);
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState(() => normalizeSessionCode(params.code ?? ''));
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = isCompleteSessionCode(code);

  const join = async (value: string) => {
    if (joining) return;
    setJoining(true);
    setError(null);
    try {
      const id = await joinByCode(value);
      router.replace({ pathname: '/session/[id]', params: { id } });
    } catch (e) {
      console.error('Joining failed:', e instanceof Error ? e.message : e);
      setError(t(errorKeyOf(e)));
      setJoining(false);
    }
  };

  // Deep link with a full code: jump straight in.
  useEffect(() => {
    if (params.code && isCompleteSessionCode(normalizeSessionCode(params.code))) {
      void join(normalizeSessionCode(params.code));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boxes = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? '');

  return (
    <Screen footer={<Button title={t('join.cta')} size="lg" onPress={() => void join(code)} disabled={!complete} isLoading={joining} testID="join-submit" />}>
      <Header title={t('join.title')} />
      <View style={styles.body}>
        <AppText style={styles.emoji} center>🔑</AppText>
        <AppText variant="title" center>{t('join.heading')}</AppText>
        <AppText center color={colors.textMuted}>{t('join.subtitle')}</AppText>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes} accessibilityLabel={t('join.codeLabel')}>
          {boxes.map((ch, i) => (
            <View key={i} style={[styles.box, ch ? styles.boxFilled : null, i === code.length && styles.boxActive]}>
              <AppText style={styles.boxText} center>{ch}</AppText>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(text) => {
            const next = normalizeSessionCode(text);
            setCode(next);
            setError(null);
            if (isCompleteSessionCode(next)) void join(next);
          }}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={CODE_LENGTH + 4}
          style={styles.hiddenInput}
          caretHidden
          accessibilityLabel={t('join.codeLabel')}
        />
        <ErrorBanner message={error} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xl },
  emoji: { fontSize: 56, lineHeight: 66 },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: spacing.lg, direction: 'ltr' },
  box: {
    width: 54,
    height: 66,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.primary },
  boxActive: { borderColor: colors.text },
  boxText: { fontFamily: fonts.black, fontSize: 30, lineHeight: 36 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
