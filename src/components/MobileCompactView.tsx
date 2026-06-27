import React, { useState, useRef, useEffect } from 'react';
import { Wire, Device, DevicePin } from '../types';
import { Plus, Trash2, Cable, Cpu, AlertTriangle, Check, Link, MapPin, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface MobileCompactViewProps {
  wires: Wire[];
  devices: Device[];
  onAddWire: (wire: { sourceId: string; destId: string; color: string; label?: string; notes?: string }) => void;
  onRemoveWire: (id: string) => void;
  onMapPin: (deviceId: string, pinId: string, holeId: string | null) => void;
  onUpdatePinColor?: (deviceId: string, pinId: string, color: string) => void;
}

const COLOR_OPTIONS = [
  { value: '#EF4444', name: 'Vermelho (VCC)' },
  { value: '#1A1A1A', name: 'Preto (GND)' },
  { value: '#3B82F6', name: 'Azul (Sinal)' },
  { value: '#10B981', name: 'Verde (Sinal)' },
  { value: '#F59E0B', name: 'Amarelo' },
  { value: '#8B5CF6', name: 'Roxo' },
  { value: '#FFFFFF', name: 'Branco' }
];

// Standard rows matching real protoboard sections
const TERMINAL_ROWS_TOP = ['a', 'b', 'c', 'd', 'e'];
const TERMINAL_ROWS_BOTTOM = ['f', 'g', 'h', 'i', 'j'];

export const MobileCompactView: React.FC<MobileCompactViewProps> = ({
  wires,
  devices,
  onAddWire,
  onRemoveWire,
  onMapPin,
  onUpdatePinColor
}) => {
  const [activeTab, setActiveTab] = useState<'wires' | 'pins'>('wires');
  const [selectedHole, setSelectedHole] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Form State for Quick Jumper
  const [wireSource, setWireSource] = useState('');
  const [wireDest, setWireDest] = useState('');
  const [wireColor, setWireColor] = useState('#EF4444');
  const [wireLabel, setWireLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State for Pin Mapping
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedPinId, setSelectedPinId] = useState('');
  const [targetHole, setTargetHole] = useState('');
  const [mappingError, setMappingError] = useState('');

  // Validate hole ID format
  const isValidHole = (hole: string): boolean => {
    const clean = hole.trim().toLowerCase();
    if (!clean) return false;
    
    if (/^[a-j]-[0-9]+$/.test(clean)) {
      const parts = clean.split('-');
      const col = parseInt(parts[1], 10);
      return col >= 1 && col <= 63;
    }

    if (/^(top|bottom)-(inner|outer)-[0-9]+$/.test(clean)) {
      const parts = clean.split('-');
      const col = parseInt(parts[2], 10);
      return col >= 1 && col <= 30;
    }

    return false;
  };

  const handleCreateWire = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const src = wireSource.trim().toLowerCase();
    const dest = wireDest.trim().toLowerCase();

    if (!src || !dest) {
      setErrorMsg('Selecione ou digite os furos de origem e destino.');
      return;
    }

    if (!isValidHole(src)) {
      setErrorMsg(`Furo de origem inválido: "${wireSource}".`);
      return;
    }

    if (!isValidHole(dest)) {
      setErrorMsg(`Furo de destino inválido: "${wireDest}".`);
      return;
    }

    if (src === dest) {
      setErrorMsg('A origem e o destino não podem ser o mesmo.');
      return;
    }

    onAddWire({
      sourceId: src,
      destId: dest,
      color: wireColor,
      label: wireLabel.trim() || undefined,
      notes: 'Conectado via Matriz Tátil Mobile.'
    });

    setWireSource('');
    setWireDest('');
    setWireLabel('');
    setSelectedHole(null);
  };

  const handlePinConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setMappingError('');

    if (!selectedDevice || !selectedPinId) {
      setMappingError('Selecione o componente e o pino.');
      return;
    }

    const hole = targetHole.trim().toLowerCase();
    if (!hole) {
      setMappingError('Selecione ou digite um furo.');
      return;
    }

    if (!isValidHole(hole)) {
      setMappingError(`Furo inválido: "${targetHole}".`);
      return;
    }

    onMapPin(selectedDevice, selectedPinId, hole);
    setTargetHole('');
    setSelectedHole(null);
  };

  const handleDisconnectPin = (deviceId: string, pinId: string) => {
    onMapPin(deviceId, pinId, null);
  };

  // Find connection metadata for a specific hole id
  const getHoleConnection = (holeId: string) => {
    // 1. Pin connections
    for (const dev of devices) {
      const pin = dev.pins.find(p => p.holeId === holeId);
      if (pin) {
        return {
          type: 'pin',
          color: dev.color || '#3B82F6',
          label: `${dev.name}: ${pin.name}`,
          tag: pin.name
        };
      }
    }
    // 2. Wires
    const wire = wires.find(w => w.sourceId === holeId || w.destId === holeId);
    if (wire) {
      return {
        type: 'wire',
        color: wire.color,
        label: wire.label || 'Cabo Jumper',
        tag: 'Cabo'
      };
    }
    return null;
  };

  // Smooth horizontal scroll helpers
  const scrollGrid = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Quick Action Handlers for Tapped Hole
  const setAsSource = () => {
    if (selectedHole) {
      setWireSource(selectedHole);
      setActiveTab('wires');
    }
  };

  const setAsDest = () => {
    if (selectedHole) {
      setWireDest(selectedHole);
      setActiveTab('wires');
    }
  };

  const setAsPinTarget = () => {
    if (selectedHole) {
      setTargetHole(selectedHole);
      setActiveTab('pins');
    }
  };

  const currentDeviceObj = devices.find(d => d.id === selectedDevice);
  const tappedHoleConnection = selectedHole ? getHoleConnection(selectedHole) : null;

  // Total columns of MB-102 (1 to 63)
  const columns = Array.from({ length: 63 }, (_, i) => i + 1);

  return (
    <div className="w-full flex flex-col gap-4">
      
      {/* 1. VISUAL POCKET MATRIX (The requested simple, horizontal-scrolling Grid layout matching the sketch) */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Mini-Matriz de Contato Tátil
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Role para o lado para navegar de 1 a 63</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => scrollGrid('left')}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Voltar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollGrid('right')}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Avançar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Matrix Area */}
        <div 
          ref={scrollContainerRef}
          className="w-full overflow-x-auto pb-2 custom-scrollbar select-none"
        >
          <div className="flex flex-col gap-1.5 min-w-max pr-4">
            
            {/* Column Coordinates Header Row */}
            <div className="flex gap-1 items-center mb-1">
              {/* Row Header column placeholder */}
              <div className="w-8 text-[9px] font-bold text-slate-600 text-right pr-2">Col</div>
              {columns.map((col) => (
                <div 
                  key={`col-head-${col}`} 
                  className={`w-6 text-[9px] font-mono text-center font-bold ${col % 5 === 0 || col === 1 || col === 63 ? 'text-slate-400 font-extrabold' : 'text-slate-700'}`}
                >
                  {col}
                </div>
              ))}
            </div>

            {/* UPPER POWER BUS LINES (+ / -) */}
            <div className="flex flex-col gap-1 bg-slate-900/40 p-1.5 rounded-lg border border-slate-900/60 mb-1">
              {/* Top Negative Rail (-) */}
              <div className="flex gap-1 items-center">
                <div className="w-8 text-[9px] font-bold text-blue-500 font-mono text-right pr-2">-</div>
                {columns.map((col) => {
                  // Max 30 groups for power bus
                  const powerCol = Math.min(30, Math.ceil(col / 2.1));
                  const holeId = `top-outer-${powerCol}`;
                  const isSelected = selectedHole === holeId;
                  const conn = getHoleConnection(holeId);
                  
                  return (
                    <button
                      key={holeId}
                      type="button"
                      onClick={() => setSelectedHole(holeId)}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-mono transition-all border ${
                        isSelected 
                          ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-slate-850' 
                          : conn 
                            ? 'bg-slate-900 font-bold border-2' 
                            : 'bg-slate-950 border-slate-900 text-slate-700 hover:border-slate-800'
                      }`}
                      style={{ 
                        borderColor: isSelected ? undefined : (conn ? conn.color : undefined),
                        color: conn ? '#FFF' : undefined
                      }}
                      title={holeId}
                    >
                      {conn ? '•' : '-'}
                    </button>
                  );
                })}
              </div>

              {/* Top Positive Rail (+) */}
              <div className="flex gap-1 items-center">
                <div className="w-8 text-[9px] font-bold text-red-500 font-mono text-right pr-2">+</div>
                {columns.map((col) => {
                  const powerCol = Math.min(30, Math.ceil(col / 2.1));
                  const holeId = `top-inner-${powerCol}`;
                  const isSelected = selectedHole === holeId;
                  const conn = getHoleConnection(holeId);
                  
                  return (
                    <button
                      key={holeId}
                      type="button"
                      onClick={() => setSelectedHole(holeId)}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-mono transition-all border ${
                        isSelected 
                          ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-slate-850' 
                          : conn 
                            ? 'bg-slate-900 font-bold border-2' 
                            : 'bg-slate-950 border-slate-900 text-slate-700 hover:border-slate-800'
                      }`}
                      style={{ 
                        borderColor: isSelected ? undefined : (conn ? conn.color : undefined),
                        color: conn ? '#FFF' : undefined
                      }}
                      title={holeId}
                    >
                      {conn ? '•' : '+'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UPPER TERMINAL STRIPS (A to E) */}
            <div className="flex flex-col gap-1">
              {TERMINAL_ROWS_TOP.map((row) => (
                <div key={row} className="flex gap-1 items-center">
                  <div className="w-8 text-[11px] font-bold text-slate-500 uppercase text-right pr-2 font-mono">{row}</div>
                  {columns.map((col) => {
                    const holeId = `${row}-${col}`;
                    const isSelected = selectedHole === holeId;
                    const conn = getHoleConnection(holeId);
                    
                    return (
                      <button
                        key={holeId}
                        type="button"
                        onClick={() => setSelectedHole(holeId)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-mono transition-all border ${
                          isSelected 
                            ? 'border-blue-400 ring-2 ring-blue-500/50 bg-slate-800' 
                            : conn 
                              ? 'bg-slate-900 font-bold border-2' 
                              : 'bg-slate-950 border-slate-850 text-slate-700 hover:border-slate-800'
                        }`}
                        style={{ 
                          borderColor: isSelected ? undefined : (conn ? conn.color : undefined),
                          color: conn ? '#FFF' : undefined
                        }}
                        title={holeId}
                      >
                        {conn ? '•' : ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* CENTRAL CANYON DIVIDER (FOSSA CENTRAL) */}
            <div className="flex gap-1 items-center my-1.5 h-1.5 bg-slate-900 rounded border-y border-slate-800/40">
              <div className="w-8 shrink-0"></div>
              {columns.map((col) => (
                <div key={`canyon-col-${col}`} className="w-6 h-full shrink-0"></div>
              ))}
            </div>

            {/* LOWER TERMINAL STRIPS (F to J) */}
            <div className="flex flex-col gap-1">
              {TERMINAL_ROWS_BOTTOM.map((row) => (
                <div key={row} className="flex gap-1 items-center">
                  <div className="w-8 text-[11px] font-bold text-slate-500 uppercase text-right pr-2 font-mono">{row}</div>
                  {columns.map((col) => {
                    const holeId = `${row}-${col}`;
                    const isSelected = selectedHole === holeId;
                    const conn = getHoleConnection(holeId);
                    
                    return (
                      <button
                        key={holeId}
                        type="button"
                        onClick={() => setSelectedHole(holeId)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-mono transition-all border ${
                          isSelected 
                            ? 'border-blue-400 ring-2 ring-blue-500/50 bg-slate-800' 
                            : conn 
                              ? 'bg-slate-900 font-bold border-2' 
                              : 'bg-slate-950 border-slate-850 text-slate-700 hover:border-slate-800'
                        }`}
                        style={{ 
                          borderColor: isSelected ? undefined : (conn ? conn.color : undefined),
                          color: conn ? '#FFF' : undefined
                        }}
                        title={holeId}
                      >
                        {conn ? '•' : ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* LOWER POWER BUS LINES (+ / -) */}
            <div className="flex flex-col gap-1 bg-slate-900/40 p-1.5 rounded-lg border border-slate-900/60 mt-1">
              {/* Bottom Positive Rail (+) */}
              <div className="flex gap-1 items-center">
                <div className="w-8 text-[9px] font-bold text-red-500 font-mono text-right pr-2">+</div>
                {columns.map((col) => {
                  const powerCol = Math.min(30, Math.ceil(col / 2.1));
                  const holeId = `bottom-inner-${powerCol}`;
                  const isSelected = selectedHole === holeId;
                  const conn = getHoleConnection(holeId);
                  
                  return (
                    <button
                      key={holeId}
                      type="button"
                      onClick={() => setSelectedHole(holeId)}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-mono transition-all border ${
                        isSelected 
                          ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-slate-850' 
                          : conn 
                            ? 'bg-slate-900 font-bold border-2' 
                            : 'bg-slate-950 border-slate-900 text-slate-700 hover:border-slate-800'
                      }`}
                      style={{ 
                        borderColor: isSelected ? undefined : (conn ? conn.color : undefined),
                        color: conn ? '#FFF' : undefined
                      }}
                      title={holeId}
                    >
                      {conn ? '•' : '+'}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Negative Rail (-) */}
              <div className="flex gap-1 items-center">
                <div className="w-8 text-[9px] font-bold text-blue-500 font-mono text-right pr-2">-</div>
                {columns.map((col) => {
                  const powerCol = Math.min(30, Math.ceil(col / 2.1));
                  const holeId = `bottom-outer-${powerCol}`;
                  const isSelected = selectedHole === holeId;
                  const conn = getHoleConnection(holeId);
                  
                  return (
                    <button
                      key={holeId}
                      type="button"
                      onClick={() => setSelectedHole(holeId)}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-mono transition-all border ${
                        isSelected 
                          ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-slate-850' 
                          : conn 
                            ? 'bg-slate-900 font-bold border-2' 
                            : 'bg-slate-950 border-slate-900 text-slate-700 hover:border-slate-800'
                      }`}
                      style={{ 
                        borderColor: isSelected ? undefined : (conn ? conn.color : undefined),
                        color: conn ? '#FFF' : undefined
                      }}
                      title={holeId}
                    >
                      {conn ? '•' : '-'}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Selected Hole Quick Actions bar (This speeds up prototyping on mobile enormously!) */}
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Ponto Selecionado:</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {selectedHole ? selectedHole.toUpperCase() : 'Nenhum'}
              </span>
            </div>
            {tappedHoleConnection && (
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-950">
                Conectado: <span className="font-bold">{tappedHoleConnection.tag}</span>
              </span>
            )}
          </div>

          {selectedHole ? (
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={setAsSource}
                className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Definir Origem
              </button>
              <button
                type="button"
                onClick={setAsDest}
                className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Definir Destino
              </button>
              <button
                type="button"
                onClick={setAsPinTarget}
                className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Vincular Pino
              </button>
            </div>
          ) : (
            <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 italic justify-center py-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Toque em qualquer buraquinho da grade acima para criar atalhos de conexões rápidas!</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. FORM ACTION CARDS BELOW */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Header bar */}
        <div className="flex bg-slate-950 p-1 font-semibold text-xs border-b border-slate-800/80 sticky top-0 z-10">
          <button
            onClick={() => setActiveTab('wires')}
            className={`flex-1 py-3 text-center rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'wires' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Cable className="w-4 h-4" />
            Pontes Dupont ({wires.length})
          </button>
          <button
            onClick={() => setActiveTab('pins')}
            className={`flex-1 py-3 text-center rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'pins' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Cpu className="w-4 h-4" />
            Pinos do Hardware
          </button>
        </div>

        {/* Tab 1: Wires Jumper List */}
        {activeTab === 'wires' && (
          <div className="p-4 flex flex-col gap-4">
            
            {/* Quick Creator Box */}
            <form onSubmit={handleCreateWire} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Puxar Cabo Rápido
              </h4>

              {errorMsg && (
                <div className="p-2 bg-red-950/80 border border-red-900/60 rounded-lg text-[11px] text-red-300 flex items-center gap-1.5 leading-snug">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Furo Origem</label>
                  <input
                    type="text"
                    placeholder="ex: a-10"
                    value={wireSource}
                    onChange={(e) => setWireSource(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs px-2.5 py-2 rounded-lg font-mono focus:outline-none placeholder-slate-600 uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Furo Destino</label>
                  <input
                    type="text"
                    placeholder="ex: d-10"
                    value={wireDest}
                    onChange={(e) => setWireDest(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs px-2.5 py-2 rounded-lg font-mono focus:outline-none placeholder-slate-600 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Identificação / Nome (Opcional)</label>
                <input
                  type="text"
                  placeholder="ex: LED Positivo, Sinal Botão"
                  value={wireLabel}
                  onChange={(e) => setWireLabel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs px-2.5 py-2 rounded-lg focus:outline-none placeholder-slate-600"
                />
              </div>

              {/* Color grid */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Cor do Cabo</label>
                <div className="flex gap-2 py-0.5 overflow-x-auto">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setWireColor(c.value)}
                      className={`w-7 h-7 rounded-full border shrink-0 transition-all cursor-pointer flex items-center justify-center ${wireColor === c.value ? 'ring-2 ring-indigo-500 scale-105 border-white' : 'border-slate-800 hover:border-slate-700'}`}
                      style={{ backgroundColor: c.value === '#FFFFFF' ? '#F3F4F6' : c.value }}
                      title={c.name}
                    >
                      {wireColor === c.value && (
                        <Check className={`w-3.5 h-3.5 ${c.value === '#FFFFFF' ? 'text-slate-900' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                Ligar Cabo na Protoboard
              </button>
            </form>

            {/* List of Wires in Boxes */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cabos Dupont Instalados ({wires.length})</h4>
              {wires.length === 0 ? (
                <div className="p-6 bg-slate-950/20 border border-slate-800/50 border-dashed rounded-xl text-center text-slate-500 text-xs italic">
                  Nenhum cabo esticado. Utilize o formulário acima ou a grade tátil para puxar o primeiro jumper!
                </div>
              ) : (
                wires.map((wire) => (
                  <div key={wire.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0 shadow-xs" style={{ backgroundColor: wire.color }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
                          <span className="font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-indigo-400">{wire.sourceId.toUpperCase()}</span>
                          <span className="text-slate-500">&rarr;</span>
                          <span className="font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-indigo-400">{wire.destId.toUpperCase()}</span>
                        </div>
                        {wire.label && (
                          <p className="text-[11px] text-slate-300 font-medium mt-1 truncate">{wire.label}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveWire(wire.id)}
                      className="p-2 bg-slate-900 hover:bg-red-950/80 hover:text-red-400 border border-slate-800 text-slate-400 hover:border-red-900/40 rounded-lg cursor-pointer transition-colors"
                      title="Remover Cabo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Hardware Pins Connection */}
        {activeTab === 'pins' && (
          <div className="p-4 flex flex-col gap-4">
            
            {/* Quick Mapping Box */}
            <form onSubmit={handlePinConnect} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Mapear Pino para Furo
              </h4>

              {mappingError && (
                <div className="p-2 bg-red-950/80 border border-red-900/60 rounded-lg text-[11px] text-red-300 flex items-center gap-1.5 leading-snug">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{mappingError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Placa / Componente</label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => {
                      setSelectedDevice(e.target.value);
                      setSelectedPinId('');
                    }}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs px-2.5 py-2.5 rounded-lg focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.pins.length} pinos)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Selecione o Pino</label>
                  <select
                    value={selectedPinId}
                    onChange={(e) => setSelectedPinId(e.target.value)}
                    disabled={!selectedDevice}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs px-2.5 py-2.5 rounded-lg focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Selecione...</option>
                    {currentDeviceObj?.pins.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.holeId ? `(Atualmente: ${p.holeId.toUpperCase()})` : '(Desconectado)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Furo Alvo na Protoboard</label>
                <input
                  type="text"
                  placeholder="ex: a-15, top-outer-4"
                  value={targetHole}
                  disabled={!selectedPinId}
                  onChange={(e) => setTargetHole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs px-2.5 py-2 rounded-lg font-mono focus:outline-none placeholder-slate-600 uppercase disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedPinId}
                className="w-full mt-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <Link className="w-4 h-4" />
                Mapear Pino Elétrico
              </button>
            </form>

            {/* List of Hardware components and connection pins */}
            <div className="flex flex-col gap-3">
              {devices.map((device) => (
                <div key={device.id} className="bg-slate-950 rounded-xl border border-slate-800/80 p-3 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-md shrink-0 shadow-sm" style={{ backgroundColor: device.color }} />
                      {device.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-900/80 border border-slate-800/40 px-1.5 py-0.5 rounded-md">
                      {device.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {device.pins.map((pin) => (
                      <div key={pin.id} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-900/80">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-semibold text-slate-300">{pin.name}</span>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          {pin.holeId ? (
                            <>
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-900/30 text-[10px]">
                                {pin.holeId.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDisconnectPin(device.id, pin.id)}
                                className="text-[10px] text-red-400 bg-red-950/40 hover:bg-red-900/40 px-1.5 py-1 rounded transition-colors cursor-pointer"
                                title="Desconectar"
                              >
                                Remover
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-500 text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800/40 italic">
                              Sem conexão
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
