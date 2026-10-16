import { describe, it, expect } from 'vitest';
import { generateHoles, getHoleNetId, isVccNet, isGndNet, computeConnectedComponents, detectShortCircuits } from './breadboard';
import type { Wire, Device } from '../types';

const wire = (id: string, sourceId: string, destId: string): Wire => ({ id, sourceId, destId, color: '#000' });

describe('hole grouping', () => {
  it('generates unique holes', () => {
    const holes = generateHoles();
    expect(holes.length).toBeGreaterThan(0);
    expect(new Set(holes.map((h) => h.id)).size).toBe(holes.length);
  });

  it('groups terminal columns by half', () => {
    expect(getHoleNetId('a-5')).toBe(getHoleNetId('e-5'));
    expect(getHoleNetId('f-5')).toBe(getHoleNetId('j-5'));
    expect(getHoleNetId('e-5')).not.toBe(getHoleNetId('f-5'));
    expect(getHoleNetId('a-5')).not.toBe(getHoleNetId('a-6'));
  });

  it('splits power rails in the middle', () => {
    expect(getHoleNetId('top-inner-1')).toBe('top-inner-left');
    expect(getHoleNetId('top-inner-30')).toBe('top-inner-left');
    expect(getHoleNetId('top-inner-31')).toBe('top-inner-right');
    expect(getHoleNetId('bogus')).toBe('isolated-bogus');
  });

  it('classifies rails', () => {
    expect(isVccNet('top-inner-left')).toBe(true);
    expect(isGndNet('top-outer-left')).toBe(true);
    expect(isVccNet('top-outer-left')).toBe(false);
  });

  it('bottom rails keep the same polarity on both halves (inner = +, outer = -)', () => {
    for (const side of ['left', 'right']) {
      expect(isVccNet(`bottom-inner-${side}`)).toBe(true);
      expect(isGndNet(`bottom-inner-${side}`)).toBe(false);
      expect(isGndNet(`bottom-outer-${side}`)).toBe(true);
      expect(isVccNet(`bottom-outer-${side}`)).toBe(false);
      expect(isVccNet(`top-inner-${side}`)).toBe(true);
      expect(isGndNet(`top-outer-${side}`)).toBe(true);
    }
  });
});

describe('short circuit detection', () => {
  it('no alerts on empty board', () => {
    const { components } = computeConnectedComponents([], []);
    expect(detectShortCircuits(components)).toEqual([]);
  });

  it('merges nets connected by a wire', () => {
    const { holeToComponentMap } = computeConnectedComponents([wire('w1', 'a-1', 'a-10')], []);
    expect(holeToComponentMap.get('e-1')).toBe(holeToComponentMap.get('c-10'));
    expect(holeToComponentMap.get('e-1')).not.toBe(holeToComponentMap.get('a-2'));
  });

  it('detects VCC rail wired to GND rail', () => {
    const { components } = computeConnectedComponents([wire('w1', 'top-inner-5', 'top-outer-5')], []);
    const alerts = detectShortCircuits(components);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('rail_short');
  });

  it('detects short through an intermediate column', () => {
    const wires = [wire('w1', 'top-inner-5', 'a-5'), wire('w2', 'b-5', 'top-outer-8')];
    expect(detectShortCircuits(computeConnectedComponents(wires, []).components)).toHaveLength(1);
  });

  it('detects device VCC and GND pins in the same column', () => {
    const dev: Device = {
      id: 'd1', name: 'DHT22', type: 'sensor', color: '#fff',
      pins: [
        { id: 'p1', name: 'VCC', type: 'power_vcc', holeId: 'a-3' },
        { id: 'p2', name: 'GND', type: 'power_gnd', holeId: 'c-3' },
      ],
    };
    const alerts = detectShortCircuits(computeConnectedComponents([], [dev]).components);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('DHT22');
  });

  it('no alert for a valid power wiring', () => {
    const wires = [wire('w1', 'top-inner-5', 'a-5'), wire('w2', 'top-outer-8', 'a-8')];
    expect(detectShortCircuits(computeConnectedComponents(wires, []).components)).toEqual([]);
  });
});
