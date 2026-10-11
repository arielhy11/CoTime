/**
 * Deterministic geometry for wrecking avatars: cracks, shards, explosion
 * particles. Pure functions so every phone draws the same cracks on the
 * same person, and so the shapes can be unit tested.
 */

export interface Point {
  x: number;
  y: number;
}

/** FNV-1a — stable seed from a user id. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — tiny seeded PRNG returning [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function toPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(' ');
}

/** Where the "impact" lands — slightly off-centre so it looks hit, not drawn. */
export function impactPoint(seed: number, size: number): Point {
  const rand = seededRandom(seed ^ 0x9e3779b9);
  const r = size / 2;
  const angle = rand() * Math.PI * 2;
  const dist = r * (0.12 + rand() * 0.22);
  return { x: r + Math.cos(angle) * dist, y: r + Math.sin(angle) * dist };
}

const CRACKS_PER_LEVEL = [0, 4, 7, 10, 12];

/**
 * SVG path strings for a cracked-glass look over a circular avatar of
 * diameter `size`. More damage = more cracks, branches and a spider ring.
 */
export function crackPaths(seed: number, size: number, level: number): string[] {
  const count = CRACKS_PER_LEVEL[Math.max(0, Math.min(4, level))];
  if (count === 0) return [];
  const rand = seededRandom(seed);
  const r = size / 2;
  const center = { x: r, y: r };
  const impact = impactPoint(seed, size);
  const paths: string[] = [];
  const ringPoints: Point[] = [];
  const ringRadius = r * 0.32;

  for (let i = 0; i < count; i += 1) {
    const baseAngle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const points: Point[] = [impact];
    let current = impact;
    let angle = baseAngle;
    let travelled = 0;
    const segments = 4 + Math.floor(rand() * 3);
    for (let s = 0; s < segments; s += 1) {
      angle += (rand() - 0.5) * 0.7;
      const step = (r * 1.25) / segments;
      travelled += step;
      current = { x: current.x + Math.cos(angle) * step, y: current.y + Math.sin(angle) * step };
      points.push(current);
      if (ringPoints.length < count && travelled >= ringRadius && ringPoints.length === i) {
        ringPoints.push(current);
      }
      const distFromCenter = Math.hypot(current.x - center.x, current.y - center.y);
      if (distFromCenter > r) break;
    }
    paths.push(toPath(points));

    if (level >= 2 && rand() > 0.35) {
      const from = points[Math.min(points.length - 1, 1 + Math.floor(rand() * 2))];
      const branchAngle = angle + (rand() > 0.5 ? 1 : -1) * (0.5 + rand() * 0.6);
      const len = r * (0.2 + rand() * 0.3);
      const mid = { x: from.x + Math.cos(branchAngle) * len * 0.5 + (rand() - 0.5) * 4, y: from.y + Math.sin(branchAngle) * len * 0.5 + (rand() - 0.5) * 4 };
      const end = { x: from.x + Math.cos(branchAngle) * len, y: from.y + Math.sin(branchAngle) * len };
      paths.push(toPath([from, mid, end]));
    }
  }

  if (level >= 2 && ringPoints.length >= 3) {
    paths.push(`${toPath(ringPoints)} Z`);
  }
  return paths;
}

export interface Shard {
  /** Polygon in avatar coordinates (0..size). */
  points: Point[];
  /** SVG `points` attribute. */
  pointsAttr: string;
  /** Where it flies when the avatar explodes. */
  dx: number;
  dy: number;
  rotateDeg: number;
  delayMs: number;
}

/** Wedges around the impact point that together cover the whole disc. */
export function shardPolygons(seed: number, size: number, count = 9): Shard[] {
  const rand = seededRandom(seed ^ 0x51ed270b);
  const r = size / 2;
  const impact = impactPoint(seed, size);
  const angles: number[] = [];
  for (let i = 0; i < count; i += 1) {
    angles.push(((i + (rand() - 0.5) * 0.6) / count) * Math.PI * 2);
  }
  angles.sort((a, b) => a - b);

  const shards: Shard[] = [];
  for (let i = 0; i < count; i += 1) {
    const a0 = angles[i];
    const a1 = i === count - 1 ? angles[0] + Math.PI * 2 : angles[i + 1];
    const points: Point[] = [impact];
    const steps = 6;
    for (let s = 0; s <= steps; s += 1) {
      const a = a0 + ((a1 - a0) * s) / steps;
      // Slightly past the rim so neighbouring shards never leave a hairline gap.
      points.push({ x: r + Math.cos(a) * (r + 1), y: r + Math.sin(a) * (r + 1) });
    }
    const mid = (a0 + a1) / 2;
    const distance = size * (0.9 + rand() * 0.9);
    shards.push({
      points,
      pointsAttr: points.map((p) => `${round(p.x)},${round(p.y)}`).join(' '),
      dx: Math.cos(mid) * distance,
      dy: Math.sin(mid) * distance + size * 0.35 * rand(),
      rotateDeg: (rand() - 0.5) * 540,
      delayMs: Math.floor(rand() * 80),
    });
  }
  return shards;
}

export interface Particle {
  dx: number;
  dy: number;
  size: number;
  color: string;
  delayMs: number;
}

export const BLAST_COLORS = ['#FFD23F', '#FF5A1F', '#FF3B5C', '#FFF8F0'] as const;

export function explosionParticles(seed: number, radius: number, count = 18): Particle[] {
  const rand = seededRandom(seed ^ 0x2545f491);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const distance = radius * (0.9 + rand() * 1.1);
    particles.push({
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      size: 4 + rand() * 9,
      color: BLAST_COLORS[Math.floor(rand() * BLAST_COLORS.length) % BLAST_COLORS.length],
      delayMs: Math.floor(rand() * 60),
    });
  }
  return particles;
}

/** Where the band-aid goes on a level-2+ avatar. */
export function bandAidPlacement(seed: number, size: number): { x: number; y: number; rotateDeg: number } {
  const rand = seededRandom(seed ^ 0x7f4a7c15);
  const side = rand() > 0.5 ? 1 : -1;
  return {
    x: size * (0.5 + side * 0.18),
    y: size * (0.28 + rand() * 0.1),
    rotateDeg: side * (25 + rand() * 25),
  };
}

/** Teardrop flame path with its base centred at (cx, baseY). */
export function flamePath(cx: number, baseY: number, width: number, height: number): string {
  const w = width / 2;
  return [
    `M${round(cx - w)} ${round(baseY)}`,
    `C${round(cx - w)} ${round(baseY - height * 0.45)} ${round(cx - w * 0.2)} ${round(baseY - height * 0.6)} ${round(cx)} ${round(baseY - height)}`,
    `C${round(cx + w * 0.25)} ${round(baseY - height * 0.6)} ${round(cx + w)} ${round(baseY - height * 0.45)} ${round(cx + w)} ${round(baseY)}`,
    'Z',
  ].join(' ');
}
