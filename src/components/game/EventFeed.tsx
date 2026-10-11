import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '../../game/time';
import type { GameEvent } from '../../models/GameEvent';
import type { User } from '../../models/User';
import { colors, radii } from '../../theme/tokens';
import { AppText } from '../common/AppText';

const EMOJI: Record<GameEvent['type'], string> = {
  joined: '🙌',
  placed: '📵',
  pickup: '🚨',
  putdown: '😮‍💨',
  eliminated: '💥',
};

interface EventFeedProps {
  events: GameEvent[];
  profiles: Record<string, User>;
  fallbackNames: Record<string, string>;
  max?: number;
  include?: GameEvent['type'][];
}

/** The table's running commentary, newest first. */
export function EventFeed({ events, profiles, fallbackNames, max = 6, include }: EventFeedProps) {
  const { t } = useTranslation();
  const shown = events.filter((e) => !include || include.includes(e.type)).slice(0, max);
  if (shown.length === 0) return null;
  return (
    <View style={styles.feed}>
      {shown.map((event, index) => {
        const name = profiles[event.userId]?.name ?? fallbackNames[event.userId] ?? '?';
        return (
          <View key={event.id} style={[styles.row, { opacity: 1 - index * 0.13 }]}>
            <AppText style={styles.emoji}>{EMOJI[event.type]}</AppText>
            <AppText style={styles.text} numberOfLines={1}>
              {t(`feed.${event.type}`, {
                name,
                count: event.pickupNumber ?? 0,
                duration: formatDuration(event.holdMs ?? 0),
              })}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { gap: 6, backgroundColor: colors.surface, borderRadius: radii.md, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 16, lineHeight: 20 },
  text: { flex: 1, fontSize: 14, lineHeight: 18 },
});
