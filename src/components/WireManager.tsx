import React, { useState } from 'react';
import { Wire } from '../types';
import { Trash2, Edit3, Save, Compass, MessageSquare, Info } from 'lucide-react';

interface WireManagerProps {
  wires: Wire[];
  onAddWire: (wire: Wire) => void;
  onRemoveWire: (wireId: string) => void;
  onUpdateWire: (wireId: string, label: string, notes: string) => void;
  selectedWireId: string | null;
  setSelectedWireId: (wireId: string | null) => void;
  activeWireColor: string;
  setActiveWireColor: (color: string) => void;
  wireModeActive: boolean;
  setWireModeActive: (active: boolean) => void;
}

export const WIRE_COLORS = [
  { name: 'Vermelho (VCC)', value: '#EF4444' },
  { name: 'Preto (GND)', value: '#1A1A1A' },
  { name: 'Azul (Sinal)', value: '#3B82F6' },
  { name: 'Amarelo', value: '#F59E0B' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Branco', value: '#FFFFFF' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Cinza', value: '#6B7280' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Castanho', value: '#78350F' }
];

export const WireManager: React.FC<WireManagerProps> = ({
  wires,
  onAddWire,
  onRemoveWire,
  onUpdateWire,
  selectedWireId,
  setSelectedWireId,
  activeWireColor,
  setActiveWireColor,
  wireModeActive,
  setWireModeActive,
}) => {
  const [editingWireId, setEditingWireId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const startEditing = (wire: Wire) => {
    setEditingWireId(wire.id);
    setEditLabel(wire.label || '');
    setEditNotes(wire.notes || '');
  };

  const handleSave = (wireId: string) => {
    onUpdateWire(wireId, editLabel, editNotes);
    setEditingWireId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Wire Creator Configuration */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            Puxar Cabos & Fios ({wires.length})
          </h3>
          <button
            onClick={() => setWireModeActive(!wireModeActive)}
            className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${wireModeActive ? 'bg-emerald-600 text-white animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
          >
            {wireModeActive ? 'Modo Cabo: Ativo' : 'Ativar Modo Fio'}
          </button>
        </div>

        {/* Color Palette Selector */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Cor do Próximo Fio</span>
          <div className="grid grid-cols-5 gap-2">
            {WIRE_COLORS.map((col) => (
              <button
                key={col.value}
                onClick={() => {
                  setActiveWireColor(col.value);
                  setWireModeActive(true); // Auto activate wire mode when color is changed
                }}
                className={`group relative h-7 rounded border transition-all flex items-center justify-center cursor-pointer ${activeWireColor === col.value ? 'border-sky-400 scale-105 shadow-md ring-1 ring-sky-500/20' : 'border-slate-800 hover:border-slate-700'}`}
                style={{ backgroundColor: col.value === '#FFFFFF' ? '#F3F4F6' : col.value }}
                title={col.name}
              >
                {/* Visual indicator for black wire or white wire to make them look nice */}
                <span
                  className={`w-2.5 h-2.5 rounded-full ${col.value === '#FFFFFF' ? 'bg-slate-300' : 'bg-white/20'}`}
                ></span>
                {col.value === activeWireColor && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-400 rounded-full border border-slate-950"></span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[9.5px] text-slate-500 italic mt-0.5">
            Dica: Vermelho é padrão para VCC (Alimentação), Preto é padrão para GND (Terra).
          </p>
        </div>
      </div>

      {/* Wire placement instructions */}
      {wireModeActive && (
        <div className="p-2.5 bg-sky-950/40 border border-sky-900/60 rounded-lg text-xs text-sky-200 animate-pulse flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
          <p className="leading-relaxed text-[11px]">
            <span className="font-bold">Como puxar:</span> Clique no furo de origem na protoboard, depois clique no furo de destino. O cabo será criado automaticamente com a cor selecionada!
          </p>
        </div>
      )}

      {/* List of Wires */}
      <div className="flex flex-col gap-2 max-h-[360px] lg:max-h-none overflow-y-auto lg:overflow-visible pr-1">
        {wires.length === 0 ? (
          <div className="p-4 bg-slate-950/30 border border-slate-900 border-dashed rounded-lg text-center text-slate-500 text-xs italic">
            Nenhum cabo puxado.
          </div>
        ) : (
          wires.map((wire) => {
            const isEditing = editingWireId === wire.id;
            const isSelected = selectedWireId === wire.id;

            return (
              <div
                key={wire.id}
                onClick={() => setSelectedWireId(wire.id)}
                className={`p-2.5 bg-slate-950 rounded-lg border transition-all flex flex-col gap-1.5 cursor-pointer ${isSelected ? 'border-sky-500/80 ring-1 ring-sky-500/20 shadow-xs' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-slate-800"
                      style={{ backgroundColor: wire.color }}
                    ></span>
                    <span className="text-xs font-mono font-semibold text-slate-300">
                      {wire.sourceId.toUpperCase()} &rarr; {wire.destId.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEditing) handleSave(wire.id);
                        else startEditing(wire);
                      }}
                      className="text-slate-400 hover:text-sky-400 p-0.5 transition-colors cursor-pointer"
                      title={isEditing ? 'Salvar anotação' : 'Adicionar nota'}
                    >
                      {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveWire(wire.id);
                      }}
                      className="text-slate-400 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                      title="Apagar cabo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex flex-col gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="Identificação do cabo (Ex: Dados DHT)"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 p-1.5 focus:ring-1 focus:ring-sky-500 outline-hidden"
                    />
                    <textarea
                      placeholder="Adicione uma nota sobre esta conexão..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="text-[11px] rounded bg-slate-900 border border-slate-700 text-slate-300 p-1.5 focus:ring-1 focus:ring-sky-500 outline-hidden resize-none"
                    />
                    <button
                      onClick={() => handleSave(wire.id)}
                      className="py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Salvar Notas
                    </button>
                  </div>
                ) : (
                  (wire.label || wire.notes) && (
                    <div className="text-[11px] text-slate-400 pl-5 leading-normal">
                      {wire.label && <div className="font-semibold text-slate-300 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        {wire.label}
                      </div>}
                      {wire.notes && <div className="italic text-slate-400 mt-0.5">&ldquo;{wire.notes}&rdquo;</div>}
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
