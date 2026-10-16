import { useEffect, useRef } from 'react';
import { decodeProject, SharedProject, SHARE_HASH_PREFIX } from '../utils/share';

/** On load (and when the hash changes), import a project encoded as #p=... and clear the hash. */
export function useSharedProjectFromHash(onImport: (p: SharedProject) => void) {
  const cb = useRef(onImport);
  cb.current = onImport;
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const hash = window.location.hash;
      if (!hash.startsWith(SHARE_HASH_PREFIX)) return;
      const shared = await decodeProject(hash.slice(SHARE_HASH_PREFIX.length));
      history.replaceState(null, '', window.location.pathname + window.location.search);
      if (cancelled) return;
      if (shared) cb.current(shared);
      else window.alert('Link de projeto inválido ou corrompido.');
    };
    // Wait a tick so stored projects are loaded before importing
    const t = window.setTimeout(check, 0);
    window.addEventListener('hashchange', check);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener('hashchange', check);
    };
  }, []);
}
