import { useEffect, useState } from 'react';

export type ThemeName = 'dark' | 'light' | 'hud';
export const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'dark', label: 'Escuro' },
  { id: 'light', label: 'Claro' },
  { id: 'hud', label: 'HUD' },
];
const THEME_KEY = 'runeboard_theme_v1';

export function readStoredTheme(): ThemeName {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'hud' || t === 'dark') return t;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(readStoredTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const cycleTheme = () => setTheme((t) => THEMES[(THEMES.findIndex((x) => x.id === t) + 1) % THEMES.length].id);
  return { theme, setTheme, cycleTheme };
}
