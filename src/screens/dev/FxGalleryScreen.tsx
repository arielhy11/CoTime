import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { DamagedAvatar } from '../../components/avatar/DamagedAvatar';
import { Explosion } from '../../components/avatar/Explosion';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Header } from '../../components/common/Header';
import { Screen } from '../../components/common/Screen';
import { TableRing } from '../../components/game/TableRing';
import type { DamageLevel } from '../../game/damage';
import type { GameModeId } from '../../models/Session';
import { playSound } from '../../services/sound';
import { colors, spacing } from '../../theme/tokens';
import { ResultsView } from '../session/ResultsView';
import { fakeTable } from './fakeGame';

const SAMPLE_PHOTO = Image.resolveAssetSource(require('../../../assets/images/sample-face.png')).uri;
const LEVELS: DamageLevel[] = [0, 1, 2, 3, 4];
const MODES: GameModeId[] = ['zen', 'threeStrikes', 'timeBank', 'suddenDeath'];

/**
 * Dev-only gallery at /dev/fx — every damage level, the bomb, the table,
 * and a results screen, all with fake data (no Firebase needed).
 */
export function FxGalleryScreen() {
  const [playKey, setPlayKey] = useState(1);
  const [mode, setMode] = useState<GameModeId>('zen');
  const [showResults, setShowResults] = useState(false);
  const [now] = useState(() => Date.now());
  const demo = fakeTable(now, SAMPLE_PHOTO);
  const identity = { uid: 'dana', name: 'Dana', photoURL: SAMPLE_PHOTO };
  const initials = { uid: 'mo', name: 'Big Mo', photoURL: null };

  if (showResults) {
    return (
      <ResultsView
        session={{ ...demo.session, mode }}
        players={demo.players}
        profiles={demo.profiles}
        myUid="ariel"
        live
        onRematch={async () => setShowResults(false)}
        onJoinRematch={async () => setShowResults(false)}
      />
    );
  }

  return (
    <Screen scroll>
      <Header title="FX gallery" />
      <AppText variant="label" style={styles.section}>Damage levels</AppText>
      {[identity, initials].map((who) => (
        <View key={who.uid} style={styles.row}>
          {LEVELS.map((level) => (
            <View key={level} style={styles.cell}>
              <DamagedAvatar identity={who} size={60} level={level} animateChanges={false} holding={level === 2} crown={level === 0} />
              <AppText variant="caption" center>{level}</AppText>
            </View>
          ))}
        </View>
      ))}

      <AppText variant="label" style={styles.section}>Bomb</AppText>
      <View style={styles.boom}>
        <Explosion key={playKey} identity={identity} size={150} playKey={playKey} onBlast={() => playSound('boom')} />
      </View>
      <Button title="Boom again 💣" onPress={() => { playSound('whistle'); setPlayKey((k) => k + 1); }} />

      <AppText variant="label" style={styles.section}>Table</AppText>
      <View style={styles.chips}>
        {MODES.map((m) => <Chip key={m} label={m} selected={mode === m} onPress={() => setMode(m)} />)}
      </View>
      <View style={styles.table}>
        <TableRing
          session={{ ...demo.session, mode, status: 'live' }}
          players={demo.players}
          profiles={demo.profiles}
          now={now}
          diameter={340}
          myUid="ariel"
          leaderIds={['zen-master']}
        >
          <AppText variant="title" center>12:34</AppText>
        </TableRing>
      </View>
      <Button title="Show results screen" variant="secondary" onPress={() => setShowResults(true)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, paddingTop: spacing.md },
  cell: { alignItems: 'center', gap: 4 },
  boom: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.surface, borderRadius: 24, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  table: { alignItems: 'center', marginVertical: spacing.lg },
});
