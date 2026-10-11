import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { livesLeft } from '../../game/damage';
import { timeBankMs, timeBankRemainingMs } from '../../game/rules';
import { formatClock } from '../../game/time';
import type { Player } from '../../models/Player';
import type { SessionRules } from '../../models/Session';
import { colors } from '../../theme/tokens';
import { AppText } from '../common/AppText';

interface PlayerStatProps {
  session: SessionRules;
  player: Player;
  now: number;
  compact?: boolean;
}

/** The one number that matters for this player in this mode. */
export function PlayerStat({ session, player, now, compact = false }: PlayerStatProps) {
  const { t } = useTranslation();
  const fontSize = compact ? 12 : 14;

  if (player.isOut) {
    return <AppText center style={{ fontSize }} color={colors.danger}>{t('stats.out')}</AppText>;
  }

  switch (session.mode) {
    case 'suddenDeath':
      return <AppText center style={{ fontSize }} color={colors.zen}>{t('stats.clean')}</AppText>;
    case 'zen':
      return (
        <AppText center style={{ fontSize }} color={player.pickupCount === 0 ? colors.zen : colors.text}>
          {t('stats.pickups', { count: player.pickupCount })}
        </AppText>
      );
    case 'threeStrikes': {
      const left = livesLeft(session.lives, player.pickupCount);
      const hearts = '❤️'.repeat(left) + '🖤'.repeat(Math.max(0, session.lives - left));
      return <AppText center style={{ fontSize: fontSize - 1, letterSpacing: -1 }}>{hearts}</AppText>;
    }
    case 'timeBank': {
      const remaining = timeBankRemainingMs(session, player, now);
      const share = remaining / Math.max(1, timeBankMs(session));
      const barColor = share > 0.5 ? colors.zen : share > 0.2 ? colors.gold : colors.danger;
      return (
        <View style={styles.bankWrap}>
          <View style={styles.bankTrack}>
            <View style={[styles.bankFill, { width: `${Math.round(share * 100)}%`, backgroundColor: barColor }]} />
          </View>
          <AppText center style={{ fontSize: fontSize - 2 }} color={player.isHolding ? colors.danger : colors.textMuted}>
            {formatClock(remaining)}
          </AppText>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  bankWrap: { alignItems: 'stretch', gap: 2, width: '100%' },
  bankTrack: { height: 5, borderRadius: 3, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  bankFill: { height: '100%', borderRadius: 3 },
});
