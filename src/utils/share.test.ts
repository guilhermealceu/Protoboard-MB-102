import { describe, it, expect } from 'vitest';
import { encodeProject, decodeProject, sanitizeSharedProject } from './share';
import { DEFAULT_PROJECTS } from '../data/defaultProjects';

describe('share links', () => {
  it('round-trips a project through the URL encoding', async () => {
    const p = DEFAULT_PROJECTS[0];
    const enc = await encodeProject(p);
    expect(enc).toMatch(/^[zj][A-Za-z0-9_-]+$/);
    const dec = await decodeProject(enc);
    expect(dec?.name).toBe(p.name);
    expect(dec?.wires).toEqual(p.wires);
    expect(dec?.devices.length).toBe(p.devices.length);
    expect(dec?.devices[0].pins[0].holeId).toBe(p.devices[0].pins[0].holeId);
  });

  it('rejects garbage', async () => {
    expect(await decodeProject('xnope')).toBeNull();
    expect(await decodeProject('j!!!')).toBeNull();
    expect(sanitizeSharedProject({ wires: 'x' })).toBeNull();
  });

  it('drops malformed wires', () => {
    const s = sanitizeSharedProject({ name: 'a', wires: [{ sourceId: 'a-1' }, { sourceId: 'a-1', destId: 'a-2' }], devices: [] });
    expect(s?.wires.length).toBe(1);
  });
});
