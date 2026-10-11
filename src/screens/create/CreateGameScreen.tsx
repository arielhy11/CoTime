import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { Header } from '../../components/common/Header';
import { Screen } from '../../components/common/Screen';
import { ModeCard } from '../../components/game/ModeCard';
import { MAX_STAKE_LENGTH } from '../../api/sessionDocs';
import {
  DEFAULT_LIVES,
  DEFAULT_TIME_BANK_SECONDS,
  getMode,
  LIVES_OPTIONS,
  MODE_ORDER,
  MODES,
  STAKE_PRESET_KEYS,
  TIME_BANK_OPTIONS_SECONDS,
} from '../../game/modes';
import { useRTL } from '../../hooks/useRTL';
import type { GameModeId } from '../../models/Session';
import { useSessionStore } from '../../store/sessionStore';
import { colors, fonts, radii, spacing } from '../../theme/tokens';
import { errorKeyOf } from '../../utils/errors';

function durationLabel(minutes: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  return minutes >= 60 && minutes % 60 === 0 ? t('create.hours', { count: minutes / 60 }) : t('create.minutes', { count: minutes });
}

export function CreateGameScreen() {
  const { t } = useTranslation();
  const rtl = useRTL();
  const router = useRouter();
  const createGame = useSessionStore((s) => s.createGame);

  const [modeId, setModeId] = useState<GameModeId>('suddenDeath');
  const [duration, setDuration] = useState<number | null>(MODES.suddenDeath.defaultDurationMinutes);
  const [lives, setLives] = useState<number>(DEFAULT_LIVES);
  const [bankSeconds, setBankSeconds] = useState<number>(DEFAULT_TIME_BANK_SECONDS);
  const [stake, setStake] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = getMode(modeId);

  const selectMode = (id: GameModeId) => {
    setModeId(id);
    setDuration(MODES[id].defaultDurationMinutes);
  };

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const id = await createGame({
        mode: modeId,
        stake,
        durationMinutes: duration,
        lives,
        timeBankSeconds: bankSeconds,
      });
      router.replace({ pathname: '/session/[id]', params: { id } });
    } catch (e) {
      console.error('Creating game failed:', e instanceof Error ? e.message : e);
      setError(t(errorKeyOf(e)));
      setCreating(false);
    }
  };

  return (
    <Screen
      scroll
      footer={<Button title={t('create.cta')} size="lg" onPress={() => void create()} isLoading={creating} testID="create-game" />}
    >
      <Header title={t('create.title')} />

      <AppText variant="label" style={styles.section}>{t('create.pickMode')}</AppText>
      <View style={styles.modes}>
        {MODE_ORDER.map((id) => (
          <ModeCard key={id} mode={MODES[id]} selected={id === modeId} onPress={() => selectMode(id)} />
        ))}
      </View>

      <View style={[styles.rules, { borderColor: mode.accent }]}>
        <AppText variant="bold" color={mode.accent}>{mode.emoji} {t('create.howItWorks')}</AppText>
        <AppText color={colors.text}>{t(`modes.${modeId}.rules`)}</AppText>
      </View>

      {mode.usesLives ? (
        <>
          <AppText variant="label" style={styles.section}>{t('create.lives')}</AppText>
          <View style={styles.chips}>
            {LIVES_OPTIONS.map((n) => (
              <Chip key={n} label={`${'❤️'.repeat(Math.min(n, 3))}${n > 3 ? `×${n}` : ''}`} selected={lives === n} onPress={() => setLives(n)} accent={mode.accent} />
            ))}
          </View>
        </>
      ) : null}

      {mode.usesTimeBank ? (
        <>
          <AppText variant="label" style={styles.section}>{t('create.timeBank')}</AppText>
          <View style={styles.chips}>
            {TIME_BANK_OPTIONS_SECONDS.map((s) => (
              <Chip key={s} label={t('create.minutes', { count: s / 60 })} selected={bankSeconds === s} onPress={() => setBankSeconds(s)} accent={mode.accent} />
            ))}
          </View>
        </>
      ) : null}

      <AppText variant="label" style={styles.section}>{t('create.duration')}</AppText>
      <View style={styles.chips}>
        {mode.duration === 'optional' ? (
          <Chip label={t('create.noLimit')} selected={duration === null} onPress={() => setDuration(null)} accent={mode.accent} />
        ) : null}
        {mode.durationOptions.map((m) => (
          <Chip key={m} label={durationLabel(m, t)} selected={duration === m} onPress={() => setDuration(m)} accent={mode.accent} />
        ))}
      </View>
      <AppText variant="caption" style={styles.hint}>
        {duration === null ? t(`create.noLimitHint.${modeId}`) : t('create.durationHint')}
      </AppText>

      <AppText variant="label" style={styles.section}>{t('create.stake')}</AppText>
      <View style={styles.chips}>
        {STAKE_PRESET_KEYS.map((key) => {
          const label = t(key);
          return <Chip key={key} label={label} selected={stake === label} onPress={() => setStake(stake === label ? '' : label)} accent={colors.gold} />;
        })}
      </View>
      <TextInput
        value={stake}
        onChangeText={setStake}
        maxLength={MAX_STAKE_LENGTH}
        placeholder={t('create.stakePlaceholder')}
        placeholderTextColor={colors.textDim}
        style={[styles.input, { textAlign: rtl ? 'right' : 'left' }]}
        accessibilityLabel={t('create.stake')}
      />

      <ErrorBanner message={error} />
      <View style={styles.bottomSpace} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  modes: { gap: spacing.sm },
  rules: { marginTop: spacing.md, borderWidth: 1.5, borderRadius: radii.md, padding: spacing.md, gap: 6, backgroundColor: colors.surface },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { marginTop: spacing.xs },
  input: {
    marginTop: spacing.sm,
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  bottomSpace: { height: spacing.lg },
});
