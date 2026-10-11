import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { bandAidPlacement, crackPaths, flamePath, hashString, shardPolygons } from '../../game/avatarFx';
import type { DamageLevel } from '../../game/damage';
import { FaceContent, useSvgId, type AvatarIdentity } from './AvatarArt';

interface OverlayProps {
  uid: string;
  size: number;
  level: DamageLevel;
}

const SOOT_OPACITY: Record<DamageLevel, number> = { 0: 0, 1: 0, 2: 0.28, 3: 0.55, 4: 0.6 };

/** Cracked glass, soot and a band-aid drawn over the face. */
export function DamageOverlay({ uid, size, level }: OverlayProps) {
  const seed = hashString(uid);
  const clipId = useSvgId('dmg');
  const sootId = useSvgId('soot');
  const cracks = useMemo(() => crackPaths(seed, size, level), [seed, size, level]);
  const bandAid = useMemo(() => bandAidPlacement(seed, size), [seed, size]);
  if (level === 0 || level === 4) return null;

  const strokeWidth = Math.max(1, size / 70);
  const aidW = size * 0.42;
  const aidH = size * 0.14;

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} />
        </ClipPath>
        <RadialGradient id={sootId} cx="50%" cy="60%" r="65%">
          <Stop offset="0%" stopColor="#1B1311" stopOpacity={0.15} />
          <Stop offset="100%" stopColor="#1B1311" stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {SOOT_OPACITY[level] > 0 ? (
          <Rect x={0} y={0} width={size} height={size} fill={`url(#${sootId})`} opacity={SOOT_OPACITY[level]} />
        ) : null}
        {cracks.map((d, i) => (
          <Path key={`s${i}`} d={d} stroke="#000" strokeOpacity={0.45} strokeWidth={strokeWidth * 2.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {cracks.map((d, i) => (
          <Path key={`c${i}`} d={d} stroke="#FFFFFF" strokeOpacity={0.92} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </G>
      {level >= 2 ? (
        <G transform={`translate(${bandAid.x} ${bandAid.y}) rotate(${bandAid.rotateDeg})`}>
          <Rect x={-aidW / 2} y={-aidH / 2} width={aidW} height={aidH} rx={aidH / 2} fill="#F3C79B" stroke="#C99467" strokeWidth={strokeWidth} />
          <Rect x={-aidW * 0.16} y={-aidH / 2} width={aidW * 0.32} height={aidH} fill="#E2AE80" />
          {[-0.36, -0.28, 0.28, 0.36].map((fx) => (
            <Circle key={fx} cx={aidW * fx} cy={0} r={aidH * 0.07} fill="#C99467" />
          ))}
        </G>
      ) : null}
    </Svg>
  );
}

/** Flickering flames licking up from the bottom of a level-3 avatar. */
export function Flames({ size }: { size: number }) {
  const flicker = useSharedValue(1);
  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 140, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.92, { duration: 170, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.05, { duration: 120 })
      ),
      -1,
      true
    );
  }, [flicker]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: flicker.value }] }));

  const base = size * 1.02;
  const flames = [
    { cx: size * 0.22, w: size * 0.26, h: size * 0.38, color: '#FF5A1F' },
    { cx: size * 0.5, w: size * 0.34, h: size * 0.55, color: '#FF5A1F' },
    { cx: size * 0.78, w: size * 0.26, h: size * 0.42, color: '#FF5A1F' },
    { cx: size * 0.36, w: size * 0.16, h: size * 0.3, color: '#FFD23F' },
    { cx: size * 0.62, w: size * 0.18, h: size * 0.36, color: '#FFD23F' },
  ];
  return (
    <Animated.View pointerEvents="none" style={[styles.flames, { width: size, height: size, transformOrigin: 'bottom' }, style]}>
      <Svg width={size} height={size * 1.05}>
        {flames.map((f) => (
          <Path key={`${f.cx}-${f.color}`} d={flamePath(f.cx, base, f.w, f.h)} fill={f.color} opacity={0.95} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** What's left after the bomb: the photo blown into shards, scorched. */
export function Crater({ identity, size }: { identity: AvatarIdentity; size: number }) {
  const seed = hashString(identity.uid);
  const shards = useMemo(() => shardPolygons(seed, size, 9), [seed, size]);
  const baseId = useSvgId('crater');
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="#14100F" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.42} fill="#000" opacity={0.6} />
      </Svg>
      {shards.map((shard, i) => (
        <CraterShard key={i} index={i} identity={identity} size={size} pointsAttr={shard.pointsAttr} dx={shard.dx * 0.06} dy={shard.dy * 0.06} rotateDeg={shard.rotateDeg * 0.04} idBase={baseId} />
      ))}
    </View>
  );
}

function CraterShard({ identity, size, pointsAttr, dx, dy, rotateDeg, index, idBase }: {
  identity: AvatarIdentity; size: number; pointsAttr: string; dx: number; dy: number; rotateDeg: number; index: number; idBase: string;
}) {
  const clipId = `${idBase}s${index}`;
  return (
    <View style={[StyleSheet.absoluteFill, { transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${rotateDeg}deg` }, { scale: 0.86 }] }]}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={clipId}>
            <Polygon points={pointsAttr} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>
          <FaceContent identity={identity} size={size} />
          <Rect x={0} y={0} width={size} height={size} fill="#1B1311" opacity={0.5} />
        </G>
        <Polygon points={pointsAttr} fill="none" stroke="#000" strokeOpacity={0.7} strokeWidth={Math.max(1, size / 60)} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  flames: { position: 'absolute', left: 0, bottom: 0 },
});
