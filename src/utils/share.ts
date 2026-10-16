import { Project } from '../types';

/** Minimal, portable shape of a project used for share links and JSON import. */
export interface SharedProject {
  name: string;
  description: string;
  wires: Project['wires'];
  devices: Project['devices'];
}

export const SHARE_HASH_PREFIX = '#p=';

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

const hasCompression = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export function toSharedProject(p: Project): SharedProject {
  return { name: p.name, description: p.description, wires: p.wires, devices: p.devices };
}

/** Validate untrusted data (from a link or file) and return a clean SharedProject, or null. */
export function sanitizeSharedProject(data: unknown): SharedProject | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.wires) || !Array.isArray(d.devices)) return null;
  const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');
  const wires = d.wires
    .filter((w: any) => w && typeof w.sourceId === 'string' && typeof w.destId === 'string')
    .slice(0, 2000)
    .map((w: any, i: number) => ({
      id: str(w.id, 80) || `w-${i}`,
      sourceId: str(w.sourceId, 40),
      destId: str(w.destId, 40),
      color: str(w.color, 20) || '#EF4444',
      ...(w.label ? { label: str(w.label, 200) } : {}),
      ...(w.notes ? { notes: str(w.notes, 1000) } : {}),
    }));
  const devices = d.devices
    .filter((dev: any) => dev && Array.isArray(dev.pins))
    .slice(0, 200)
    .map((dev: any, i: number) => ({
      id: str(dev.id, 80) || `dev-${i}`,
      name: str(dev.name, 120) || 'Componente',
      type: str(dev.type, 40) || 'custom',
      color: str(dev.color, 20) || '#4A5568',
      ...(dev.notes ? { notes: str(dev.notes, 1000) } : {}),
      pins: dev.pins.slice(0, 100).map((p: any, j: number) => ({
        id: str(p?.id, 80) || `pin-${i}-${j}`,
        name: str(p?.name, 80) || `P${j + 1}`,
        ...(p?.type ? { type: p.type } : {}),
        holeId: typeof p?.holeId === 'string' ? p.holeId.slice(0, 40) : null,
        ...(p?.color ? { color: str(p.color, 20) } : {}),
      })),
    }));
  return { name: str(d.name, 120) || 'Projeto compartilhado', description: str(d.description, 1000), wires, devices };
}

/** Encode a project into a URL-safe string ("z" = deflate compressed, "j" = plain JSON). */
export async function encodeProject(p: Project | SharedProject): Promise<string> {
  const json = JSON.stringify('id' in p ? toSharedProject(p as Project) : p);
  const bytes = new TextEncoder().encode(json);
  if (hasCompression()) {
    try {
      return 'z' + bytesToBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
    } catch {
      /* fall through to plain */
    }
  }
  return 'j' + bytesToBase64Url(bytes);
}

export async function decodeProject(encoded: string): Promise<SharedProject | null> {
  try {
    const kind = encoded[0];
    let bytes = base64UrlToBytes(encoded.slice(1));
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (kind !== 'j') return null;
    return sanitizeSharedProject(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

export async function buildShareUrl(p: Project): Promise<string> {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}${SHARE_HASH_PREFIX}${await encodeProject(p)}`;
}
