import React, { useState } from 'react';
import { Undo2, Redo2, Share2, Check, Moon, Sun, Crosshair } from 'lucide-react';
import { Project } from '../types';
import { buildShareUrl } from '../utils/share';
import { THEMES, useTheme } from '../hooks/useTheme';

interface HeaderToolsProps {
  currentProject: Project;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const btn =
  'w-8 h-8 rounded-lg flex items-center justify-center border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 cursor-pointer disabled:opacity-35 disabled:hover:bg-transparent';

export const HeaderTools: React.FC<HeaderToolsProps> = ({ currentProject, canUndo, canRedo, onUndo, onRedo }) => {
  const { theme, cycleTheme } = useTheme();
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  const handleShare = async () => {
    const url = await buildShareUrl(currentProject);
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `RuneBoard: ${currentProject.name}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2000);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      window.prompt('Copie o link do projeto:', url);
    }
  };

  const nextTheme = THEMES[(THEMES.findIndex((t) => t.id === theme) + 1) % THEMES.length];
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Crosshair;

  return (
    <div className="flex items-center gap-1">
      <button type="button" className={btn} onClick={onUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
        <Undo2 className="w-4 h-4" />
      </button>
      <button type="button" className={btn} onClick={onRedo} disabled={!canRedo} title="Refazer (Ctrl+Y)" aria-label="Refazer">
        <Redo2 className="w-4 h-4" />
      </button>
      <button type="button" className={btn} onClick={handleShare} title="Copiar link de compartilhamento do projeto" aria-label="Compartilhar">
        {shareState === 'copied' ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      </button>
      <button
        type="button"
        className={btn}
        onClick={cycleTheme}
        title={`Tema: ${THEMES.find((t) => t.id === theme)?.label} (trocar para ${nextTheme.label})`}
        aria-label="Trocar tema"
      >
        <ThemeIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
