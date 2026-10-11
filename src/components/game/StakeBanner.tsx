import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii } from '../../theme/tokens';
import { AppText } from '../common/AppText';

/** "On the line: Loser pays the bill" */
export function StakeBanner({ stake }: { stake: string }) {
  const { t } = useTranslation();
  if (!stake) return null;
  return (
    <View style={styles.banner}>
      <AppText variant="label" color={colors.gold} center>{t('stake.onTheLine')}</AppText>
      <AppText variant="bold" center style={styles.stake}>{stake}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderStyle: 'dashed',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
    backgroundColor: 'rgba(255,210,63,0.08)',
  },
  stake: { fontSize: 17 },
});
