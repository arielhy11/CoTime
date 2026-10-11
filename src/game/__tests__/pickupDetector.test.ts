import {
  angleBetweenDeg,
  createDetectorState,
  DEFAULT_DETECTOR_CONFIG,
  feedSample,
  forcePickup,
  manualPlace,
  tiltFromHorizontalDeg,
  type DetectorEvent,
  type DetectorState,
  type Vec3,
} from '../pickupDetector';

const FACE_DOWN: Vec3 = { x: 0.01, y: -0.02, z: 1 };
const FACE_UP: Vec3 = { x: 0, y: 0, z: -1 };
const IN_HAND: Vec3 = { x: 0, y: -0.75, z: -0.65 };

/** Feed a constant reading every 100ms; returns final state and every event seen. */
function hold(state: DetectorState, v: Vec3, fromMs: number, durationMs: number) {
  let s = state;
  const events: DetectorEvent[] = [];
  for (let t = fromMs; t <= fromMs + durationMs; t += 100) {
    const step = feedSample(s, { ...v, t });
    s = step.state;
    if (step.event) events.push(step.event);
  }
  return { state: s, events };
}

describe('geometry', () => {
  it('flat either way up is 0° tilt', () => {
    expect(tiltFromHorizontalDeg(FACE_DOWN)).toBeLessThan(3);
    expect(tiltFromHorizontalDeg(FACE_UP)).toBeLessThan(1);
    expect(tiltFromHorizontalDeg(IN_HAND)).toBeGreaterThan(40);
  });

  it('measures angles between orientations', () => {
    expect(Math.round(angleBetweenDeg(FACE_UP, FACE_DOWN))).toBe(179);
    expect(Math.round(angleBetweenDeg({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }))).toBe(90);
  });
});

describe('pickup detector', () => {
  it('arms once the phone lies still', () => {
    const { state, events } = hold(createDetectorState(), FACE_DOWN, 0, 1500);
    expect(events).toEqual(['armed']);
    expect(state.phase).toBe('down');
  });

  it('does not arm while held in a hand', () => {
    const { state, events } = hold(createDetectorState(), IN_HAND, 0, 3000);
    expect(events).toEqual([]);
    expect(state.phase).toBe('waiting');
  });

  it('does not arm while wobbling', () => {
    let s = createDetectorState();
    const events: DetectorEvent[] = [];
    for (let t = 0; t < 3000; t += 100) {
      const wobble = t % 200 === 0 ? 0.15 : -0.15;
      const step = feedSample(s, { x: wobble, y: 0, z: 1, t });
      s = step.state;
      if (step.event) events.push(step.event);
    }
    expect(events).toEqual([]);
  });

  it('flags a pickup on a sustained tilt, then a putdown when it is back', () => {
    const placed = hold(createDetectorState(), FACE_DOWN, 0, 1500).state;
    const picked = hold(placed, IN_HAND, 1600, 500);
    expect(picked.events).toEqual(['pickup']);
    expect(picked.state.phase).toBe('up');
    const back = hold(picked.state, FACE_DOWN, 2200, 1500);
    expect(back.events).toEqual(['putdown']);
  });

  it('ignores a quick bump of the table', () => {
    const placed = hold(createDetectorState(), FACE_DOWN, 0, 1500).state;
    const bumped = feedSample(placed, { ...IN_HAND, t: 1600 });
    const settled = hold(bumped.state, FACE_DOWN, 1700, 1000);
    expect(bumped.event).toBe(null);
    expect(settled.events).toEqual([]);
    expect(settled.state.phase).toBe('down');
  });

  it('flags a straight-up lift without tilt', () => {
    const placed = hold(createDetectorState(), FACE_DOWN, 0, 1500).state;
    const lifted = hold(placed, { x: 0, y: 0, z: 1.6 }, 1600, 300);
    expect(lifted.events).toEqual(['pickup']);
  });

  it('works when placed face up too', () => {
    const placed = hold(createDetectorState(), FACE_UP, 0, 1500);
    expect(placed.events).toEqual(['armed']);
    expect(hold(placed.state, IN_HAND, 1600, 500).events).toEqual(['pickup']);
  });

  it('touch or leaving the app counts as a pickup only once placed', () => {
    const waiting = createDetectorState();
    expect(forcePickup(waiting, 'touch').event).toBe(null);
    const placed = hold(waiting, FACE_DOWN, 0, 1500).state;
    const touched = forcePickup(placed, 'touch');
    expect(touched.event).toBe('pickup');
    expect(touched.reason).toBe('touch');
    expect(forcePickup(touched.state, 'appHidden').event).toBe(null);
  });

  it('never placing the phone counts as a pickup', () => {
    const step = forcePickup(createDetectorState(), 'neverPlaced');
    expect(step.event).toBe('pickup');
    expect(step.state.armed).toBe(true);
  });

  it('manual placement for devices without sensors', () => {
    const first = manualPlace(createDetectorState());
    expect(first.event).toBe('armed');
    const up = forcePickup(first.state, 'touch');
    expect(manualPlace(up.state).event).toBe('putdown');
  });

  it('uses sane defaults', () => {
    expect(DEFAULT_DETECTOR_CONFIG.pickupTiltDeg).toBeGreaterThan(DEFAULT_DETECTOR_CONFIG.flatMaxTiltDeg);
  });
});
