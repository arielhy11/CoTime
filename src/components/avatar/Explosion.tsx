import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Polygon } from 'react-native-svg';
import { explosionParticles, hashString, shardPolygons, type Particle, type Shard } from '../../game/avatarFx';
import { FaceContent, useSvgId, type AvatarIdentity } from './AvatarArt';

export const BOMB_DROP_MS = 650;
export const FUSE_MS = 650;
export const BLAST_MS = 1000;
export const EXPLOSION_TOTAL_MS = BOMB_DROP_MS + FUSE_MS + BLAST_MS;

/** A cartoon bomb with a lit fuse. */
export function Bomb({ size }: { size: number }) {
  const spark = useSharedValue(1);
  useEffect(() => {
    spark.value = withRepeat(withSequence(withTiming(1.5, { duration: 90 }), withTiming(0.8, { duration: 110 })), -1, true);
  }, [spark]);
  const sparkStyle = useAnimatedStyle(() => ({ transform: [{ scale: spark.value }] }));
  const s = size;
  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s} viewBox="0 0 100 100">
        <Path d="M62 30 C 70 18, 78 16, 84 10" stroke="#C9A36B" strokeWidth={4} fill="none" strokeLinecap="round" />
        <Circle cx={45} cy={60} r={34} fill="#1E1A24" />
        <Circle cx={45} cy={60} r={34} fill="none" stroke="#3B3446" strokeWidth={3} />
        <Ellipse cx={33} cy={47} rx={9} ry={6} fill="#FFFFFF" opacity={0.35} transform="rotate(-30 33 47)" />
        <G transform="translate(55 22) rotate(30)">
          <Path d="M0 0 h14 v12 h-14 z" fill="#3B3446" />
        </G>
      </Svg>
      <Animated.View style={[styles.spark, { left: s * 0.78, top: s * 0.02, width: s * 0.16, height: s * 0.16 }, sparkStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 20 20">
          <Path d="M10 0 L12 7 L20 10 L12 13 L10 20 L8 13 L0 10 L8 7 Z" fill="#FFD23F" />
          <Circle cx={10} cy={10} r={3} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function FlyingShard({ shard, identity, size, blast, clipId }: { shard: Shard; identity: AvatarIdentity; size: number; blast: SharedValue<number>; clipId: string }) {
  const style = useAnimatedStyle(() => {
    const p = blast.value;
    return {
      opacity: interpolate(p, [0, 0.05, 0.75, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: shard.dx * p },
        { translateY: shard.dy * p + size * 0.6 * p * p },
        { rotate: `${shard.rotateDeg * p}deg` },
        { scale: 1 - 0.3 * p },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={clipId}>
            <Polygon points={shard.pointsAttr} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>
          <FaceContent identity={identity} size={size} />
        </G>
        <Polygon points={shard.pointsAttr} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.5} />
      </Svg>
    </Animated.View>
  );
}

function Spark({ particle, center, blast }: { particle: Particle; center: number; blast: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = blast.value;
    return {
      opacity: interpolate(p, [0, 0.05, 0.6, 1], [0, 1, 1, 0]),
      transform: [{ translateX: particle.dx * p }, { translateY: particle.dy * p }, { scale: 1 - 0.6 * p }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { left: center - particle.size / 2, top: center - particle.size / 2, width: particle.size, height: particle.size, borderRadius: particle.size / 2, backgroundColor: particle.color },
        style,
      ]}
    />
  );
}

interface ExplosionProps {
  identity: AvatarIdentity;
  size: number;
  /** Change this number to replay the explosion. */
  playKey: number;
  /** Skip the bomb drop (e.g. when the photo itself is what blows up). */
  withBomb?: boolean;
  onBlast?: () => void;
  onDone?: () => void;
}

/**
 * Bomb drops onto the face, fuse fizzes, BOOM: flash, shockwave, sparks,
 * and the photo shatters into flying shards. Renders nothing afterwards —
 * the parent swaps in the crater.
 */
export function Explosion({ identity, size, playKey, withBomb = true, onBlast, onDone }: ExplosionProps) {
  const seed = hashString(identity.uid);
  const shards = useMemo(() => shardPolygons(seed, size, 9), [seed, size]);
  const particles = useMemo(() => explosionParticles(seed + playKey, size * 0.9, 20), [seed, size, playKey]);
  const idBase = useSvgId('boom');

  const drop = useSharedValue(0);
  const wobble = useSharedValue(0);
  const blast = useSharedValue(0);
  const faceVisible = useSharedValue(1);

  const leadIn = withBomb ? BOMB_DROP_MS + FUSE_MS : 150;

  useEffect(() => {
    drop.value = 0;
    blast.value = 0;
    wobble.value = 0;
    faceVisible.value = 1;
    if (withBomb) {
      drop.value = withTiming(1, { duration: BOMB_DROP_MS, easing: Easing.bezier(0.5, 0, 0.75, 0) });
      wobble.value = withDelay(BOMB_DROP_MS, withRepeat(withSequence(withTiming(1, { duration: 70 }), withTiming(-1, { duration: 70 })), Math.ceil(FUSE_MS / 140), true));
    }
    faceVisible.value = withDelay(leadIn, withTiming(0, { duration: 1 }));
    blast.value = withDelay(leadIn, withTiming(1, { duration: BLAST_MS, easing: Easing.out(Easing.cubic) }));

    const blastTimer = setTimeout(() => onBlast?.(), leadIn);
    const doneTimer = setTimeout(() => onDone?.(), leadIn + BLAST_MS);
    return () => {
      clearTimeout(blastTimer);
      clearTimeout(doneTimer);
    };
    // Replays only when playKey changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  const bombSize = size * 0.62;
  const bombStyle = useAnimatedStyle(() => ({
    opacity: blast.value > 0 ? 0 : 1,
    transform: [
      { translateY: interpolate(drop.value, [0, 1], [-size * 1.6, size * 0.12]) },
      { rotate: `${wobble.value * 8}deg` },
      { scale: interpolate(drop.value, [0.9, 1], [1, 1.08], Extrapolation.CLAMP) },
    ],
  }));
  const faceStyle = useAnimatedStyle(() => ({ opacity: faceVisible.value }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(blast.value, [0, 0.02, 0.35], [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(blast.value, [0, 0.35], [0.3, 2.2], Extrapolation.CLAMP) }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(blast.value, [0, 0.05, 0.6], [0, 0.9, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(blast.value, [0, 0.6], [0.4, 2.8], Extrapolation.CLAMP) }],
  }));
  const smokeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(blast.value, [0.15, 0.4, 1], [0, 0.7, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(blast.value, [0.15, 1], [0.6, 1.8], Extrapolation.CLAMP) }, { translateY: -size * 0.3 * blast.value }],
  }));

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, faceStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <ClipPath id={`${idBase}f`}>
              <Circle cx={size / 2} cy={size / 2} r={size / 2} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#${idBase}f)`}>
            <FaceContent identity={identity} size={size} />
          </G>
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.centered, { width: size * 1.6, height: size * 1.6, left: -size * 0.3, top: -size * 0.3 }, smokeStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Circle cx={35} cy={45} r={22} fill="#4A4057" />
          <Circle cx={60} cy={38} r={26} fill="#5A4F68" />
          <Circle cx={52} cy={62} r={20} fill="#3E3549" />
        </Svg>
      </Animated.View>

      {shards.map((shard, i) => (
        <FlyingShard key={`${playKey}-${i}`} shard={shard} identity={identity} size={size} blast={blast} clipId={`${idBase}s${i}`} />
      ))}

      <Animated.View style={[styles.centered, { width: size, height: size, left: 0, top: 0, borderRadius: size / 2, borderWidth: Math.max(3, size / 20), borderColor: '#FFD23F' }, ringStyle]} />
      <Animated.View style={[styles.centered, { width: size, height: size, left: 0, top: 0, borderRadius: size / 2, backgroundColor: '#FFF3C4' }, flashStyle]} />

      {particles.map((particle, i) => (
        <Spark key={`${playKey}-p${i}`} particle={particle} center={size / 2} blast={blast} />
      ))}

      {withBomb ? (
        <Animated.View style={[styles.centered, { width: bombSize, height: bombSize, left: (size - bombSize) / 2, top: (size - bombSize) / 2 - size * 0.15 }, bombStyle]}>
          <Bomb size={bombSize} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { position: 'absolute' },
  spark: { position: 'absolute' },
  particle: { position: 'absolute' },
});
