import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { DamageLevel } from '../../game/damage';
import { colors } from '../../theme/tokens';
import { AppText } from '../common/AppText';
import { AvatarFace, type AvatarIdentity } from './AvatarArt';
import { Crater, DamageOverlay, Flames } from './DamageOverlay';
import { Explosion } from './Explosion';

interface DamagedAvatarProps {
  identity: AvatarIdentity;
  size: number;
  level: DamageLevel;
  /** Phone is in their hand right now: pulsing red alarm ring. */
  holding?: boolean;
  crown?: boolean;
  /**
   * Animate level changes (hit shake, bomb on knock-out). Off for lists
   * that first render with damage already applied.
   */
  animateChanges?: boolean;
  onExplode?: () => void;
}

/**
 * A player's face in whatever state they've earned: pristine, cracked,
 * band-aided, on fire, or blown to bits.
 */
export function DamagedAvatar({ identity, size, level, holding = false, crown = false, animateChanges = true, onExplode }: DamagedAvatarProps) {
  const previous = useRef(level);
  const [exploding, setExploding] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  const shake = useSharedValue(0);
  const punch = useSharedValue(1);
  const flash = useSharedValue(0);
  const alarm = useSharedValue(0);

  useEffect(() => {
    const before = previous.current;
    previous.current = level;
    if (!animateChanges || level <= before) return;
    if (level === 4) {
      setExploding(true);
      setPlayKey((k) => k + 1);
      return;
    }
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-7, { duration: 50 }),
      withTiming(7, { duration: 50 }),
      withTiming(0, { duration: 60 })
    );
    punch.value = withSequence(withTiming(1.15, { duration: 90 }), withTiming(1, { duration: 220, easing: Easing.out(Easing.back(2)) }));
    flash.value = withSequence(withTiming(0.85, { duration: 40 }), withTiming(0, { duration: 260 }));
  }, [level, animateChanges, shake, punch, flash]);

  useEffect(() => {
    alarm.value = holding
      ? withRepeat(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }), -1, false)
      : withTiming(0, { duration: 150 });
  }, [holding, alarm]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: punch.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const alarmStyle = useAnimatedStyle(() => ({
    opacity: holding ? 1 - alarm.value : 0,
    transform: [{ scale: 1 + alarm.value * 0.35 }],
  }));

  const showCrater = level === 4 && !exploding;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(3, size / 22) }, alarmStyle]} />
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        {exploding ? (
          <Explosion
            identity={identity}
            size={size}
            playKey={playKey}
            onBlast={onExplode}
            onDone={() => setExploding(false)}
          />
        ) : showCrater ? (
          <Crater identity={identity} size={size} />
        ) : (
          <>
            <AvatarFace identity={identity} size={size} />
            <DamageOverlay uid={identity.uid} size={size} level={level} />
            {level === 3 ? <Flames size={size} /> : null}
          </>
        )}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: '#FFFFFF' }, flashStyle]} />
      </Animated.View>
      {holding && !exploding ? (
        <View style={[styles.badge, { width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19, right: -size * 0.04, top: -size * 0.04 }]}>
          <AppText style={{ fontSize: size * 0.2, lineHeight: size * 0.26 }} center>📱</AppText>
        </View>
      ) : null}
      {crown && level < 4 ? (
        <AppText style={[styles.crown, { fontSize: size * 0.38, lineHeight: size * 0.46, top: -size * 0.34 }]} center>👑</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderColor: colors.danger,
  },
  badge: {
    position: 'absolute',
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  crown: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
