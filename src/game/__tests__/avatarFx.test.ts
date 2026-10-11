import { bandAidPlacement, crackPaths, explosionParticles, flamePath, hashString, impactPoint, seededRandom, shardPolygons } from '../avatarFx';

describe('seeding', () => {
  it('hashes stably', () => {
    expect(hashString('ariel')).toBe(hashString('ariel'));
    expect(hashString('ariel')).not.toBe(hashString('dana'));
  });

  it('random is deterministic and in range', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 20; i += 1) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('crackPaths', () => {
  it('has no cracks at level 0 and more as damage grows', () => {
    expect(crackPaths(1, 100, 0)).toEqual([]);
    const counts = [1, 2, 3].map((level) => crackPaths(7, 100, level).length);
    expect(counts[0]).toBeLessThan(counts[1]);
    expect(counts[1]).toBeLessThanOrEqual(counts[2]);
  });

  it('emits valid path strings', () => {
    for (const path of crackPaths(99, 120, 3)) {
      expect(path).toMatch(/^M[-\d.]+ [-\d.]+( L[-\d.]+ [-\d.]+)+( Z)?$/);
    }
  });

  it('starts at the impact point inside the avatar', () => {
    const p = impactPoint(5, 100);
    expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThan(50);
  });
});

describe('shardPolygons', () => {
  it('covers the full circle with wedges', () => {
    const shards = shardPolygons(3, 100, 9);
    expect(shards.length).toBe(9);
    let total = 0;
    for (const shard of shards) {
      const first = shard.points[1];
      const last = shard.points[shard.points.length - 1];
      const a0 = Math.atan2(first.y - 50, first.x - 50);
      let a1 = Math.atan2(last.y - 50, last.x - 50);
      while (a1 < a0) a1 += Math.PI * 2;
      total += a1 - a0;
    }
    expect(Math.abs(total - Math.PI * 2)).toBeLessThan(0.001);
  });

  it('every shard flies away', () => {
    for (const shard of shardPolygons(11, 100)) {
      expect(Math.hypot(shard.dx, shard.dy)).toBeGreaterThan(50);
      expect(shard.pointsAttr.split(' ').length).toBe(shard.points.length);
    }
  });
});

describe('extras', () => {
  it('particles spread around', () => {
    const particles = explosionParticles(1, 60, 12);
    expect(particles.length).toBe(12);
    expect(particles.every((p) => Math.hypot(p.dx, p.dy) >= 50)).toBe(true);
  });

  it('places the band-aid on the upper face', () => {
    const b = bandAidPlacement(8, 100);
    expect(b.y).toBeLessThan(50);
  });

  it('draws a closed flame', () => {
    expect(flamePath(50, 100, 20, 30)).toMatch(/^M.*Z$/);
  });
});
