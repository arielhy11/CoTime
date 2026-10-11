import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { damageLevel } from '../../game/damage';
import type { Player } from '../../models/Player';
import type { SessionRules } from '../../models/Session';
import type { User } from '../../models/User';
import { colors } from '../../theme/tokens';
import { AppText } from '../common/AppText';
import { DamagedAvatar } from '../avatar/DamagedAvatar';
import { PlayerStat } from './PlayerStat';

interface TableRingProps {
  session: SessionRules;
  players: Player[];
  profiles: Record<string, User>;
  now: number;
  diameter: number;
  myUid: string | null;
  leaderIds?: string[];
  children?: ReactNode;
  onExplode?: (uid: string) => void;
}

export function avatarSizeFor(count: number, diameter: number): number {
  const base = count <= 3 ? 0.27 : count <= 5 ? 0.23 : count <= 8 ? 0.19 : 0.155;
  return Math.round(diameter * base);
}

/** Everyone around the table, seen from above. The center is for the clock. */
export function TableRing({ session, players, profiles, now, diameter, myUid, leaderIds = [], children, onExplode }: TableRingProps) {
  const avatar = avatarSizeFor(players.length, diameter);
  const seatW = avatar + 28;
  const radius = diameter / 2 - seatW / 2;
  const center = diameter / 2;

  return (
    <View style={{ width: diameter, height: diameter }}>
      <View style={[styles.table, { width: diameter * 0.62, height: diameter * 0.62, borderRadius: diameter, left: diameter * 0.19, top: diameter * 0.19 }]} />
      <View style={[styles.center, { width: diameter * 0.56, height: diameter * 0.56, left: diameter * 0.22, top: diameter * 0.22 }]}>
        {children}
      </View>
      {players.map((player, index) => {
        const angle = -Math.PI / 2 + (index / Math.max(1, players.length)) * Math.PI * 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const profile = profiles[player.uid];
        const identity = { uid: player.uid, name: profile?.name ?? player.name, photoURL: profile?.photoURL ?? null };
        const isMe = player.uid === myUid;
        return (
          <View key={player.uid} style={[styles.seat, { width: seatW, left: x - seatW / 2, top: y - avatar / 2 - 6 }]}>
            <View style={isMe ? [styles.meRing, { borderRadius: avatar }] : null}>
              <DamagedAvatar
                identity={identity}
                size={avatar}
                level={damageLevel(session, player, now)}
                holding={player.isHolding && !player.isOut}
                crown={leaderIds.includes(player.uid)}
                onExplode={() => onExplode?.(player.uid)}
              />
            </View>
            <AppText variant="bold" center numberOfLines={1} style={styles.name} color={player.isOut ? colors.textDim : colors.text}>
              {identity.name}
            </AppText>
            <PlayerStat session={session} player={player} now={now} compact />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  seat: { position: 'absolute', alignItems: 'center', gap: 2 },
  meRing: { padding: 3, borderWidth: 2, borderColor: colors.primary },
  name: { fontSize: 13, lineHeight: 16, marginTop: 4 },
});
