import React, { useState } from 'react';
import { Device, DevicePin, DeviceTemplate } from '../types';
import { POPULAR_TEMPLATES } from '../utils/breadboard';
import { Plus, Trash2, Zap, HelpCircle, X, Check, Power } from 'lucide-react';

interface DeviceManagerProps {
  devices: Device[];
  onAddDevice: (device: Device) => void;
  onRemoveDevice: (deviceId: string) => void;
  onMapPin: (deviceId: string, pinId: string, holeId: string | null) => void;
  selectedPin: { deviceId: string; pinId: string } | null;
  setSelectedPin: (pin: { deviceId: string; pinId: string } | null) => void;
  selectedHoleId: string | null;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  devices,
  onAddDevice,
  onRemoveDevice,
  onMapPin,
  selectedPin,
  setSelectedPin,
  selectedHoleId,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#8B5CF6'); // Purple default
  const [customPinsInput, setCustomPinsInput] = useState('VCC, GND, IN, OUT');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('dht22');

  const handleAddFromTemplate = () => {
    const template = POPULAR_TEMPLATES[selectedTemplateKey];
    if (!template) return;

    const newDevice: Device = {
      id: `dev-${Date.now()}`,
      name: template.name,
      type: template.type,
      color: template.color,
      pins: template.pins.map((p, idx) => ({
        id: `pin-${idx}-${Date.now()}`,
        name: p.name,
        type: p.type,
        holeId: null,
      })),
      notes: template.description,
    };

    onAddDevice(newDevice);
    setShowAddForm(false);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const pinNames = customPinsInput
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newDevice: Device = {
      id: `dev-${Date.now()}`,
      name: customName,
      type: 'custom',
      color: customColor,
      pins: pinNames.map((name, idx) => {
        let type: DevicePin['type'] = 'other';
        const lowerName = name.toLowerCase();
        if (lowerName.includes('vcc') || lowerName.includes('5v') || lowerName.includes('3v') || lowerName.includes('vdd') || lowerName.includes('power')) {
          type = 'power_vcc';
        } else if (lowerName.includes('gnd') || lowerName.includes('vss') || lowerName.includes('terra')) {
          type = 'power_gnd';
        } else if (lowerName.includes('analog') || lowerName.startsWith('a') && !isNaN(Number(lowerName.slice(1)))) {
          type = 'analog';
        } else if (lowerName.includes('digital') || lowerName.startsWith('d') && !isNaN(Number(lowerName.slice(1))) || lowerName.includes('gpio')) {
          type = 'digital';
        }

        return {
          id: `pin-${idx}-${Date.now()}`,
          name,
          type,
          holeId: null,
        };
      }),
      notes: 'Dispositivo personalizado.',
    };

    onAddDevice(newDevice);
    setCustomName('');
    setCustomPinsInput('VCC, GND, IN, OUT');
    setShowAddForm(false);
  };

  // Selects or deselects a pin for active breadboard mapping
  const toggleSelectPin = (deviceId: string, pinId: string) => {
    if (selectedPin?.deviceId === deviceId && selectedPin?.pinId === pinId) {
      setSelectedPin(null);
    } else {
      setSelectedPin({ deviceId, pinId });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Componentes & Dispositivos ({devices.length})
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </button>
      </div>

      {/* Add Device Modal/Form */}
      {showAddForm && (
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 shadow-inner flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-bold text-slate-300">Novo Componente</h4>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preset templates selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-400 font-semibold uppercase">Escolher Modelo Pronto</label>
            <div className="flex gap-2">
              <select
                value={selectedTemplateKey}
                onChange={(e) => setSelectedTemplateKey(e.target.value)}
                className="flex-1 text-xs rounded bg-slate-900 border border-slate-700/80 text-slate-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-hidden"
              >
                {Object.entries(POPULAR_TEMPLATES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name} ({value.pins.length} pinos)
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddFromTemplate}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Adicionar Pronto
              </button>
            </div>
            <p className="text-[9.5px] text-slate-500 italic">
              {POPULAR_TEMPLATES[selectedTemplateKey]?.description}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center my-1">
            <div className="flex-1 border-t border-slate-800/80"></div>
            <span className="px-2 text-[9px] text-slate-500 font-bold uppercase">Ou criar personalizado</span>
            <div className="flex-1 border-t border-slate-800/80"></div>
          </div>

          {/* Custom Creation Form */}
          <form onSubmit={handleAddCustom} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Nome do Dispositivo</label>
                <input
                  type="text"
                  placeholder="Ex: Sensor Presença"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="text-xs rounded bg-slate-900 border border-slate-700/80 text-slate-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase font-sans">Cor Temática</label>
                <div className="flex gap-1.5 h-full items-center">
                  {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCustomColor(color)}
                      className={`w-5 h-5 rounded-full transition-all ${customColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Pinos (Separados por vírgula)</label>
              <input
                type="text"
                placeholder="Ex: VCC, GND, OUT"
                value={customPinsInput}
                onChange={(e) => setCustomPinsInput(e.target.value)}
                className="text-xs rounded bg-slate-900 border border-slate-700/80 text-slate-300 p-2 focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono"
              />
              <span className="text-[9px] text-slate-500">Pinos nomeados como VCC ou GND herdam inteligência de curtos-circuitos.</span>
            </div>

            <button
              type="submit"
              disabled={!customName.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              Criar Dispositivo Personalizado
            </button>
          </form>
        </div>
      )}

      {/* Empty State */}
      {devices.length === 0 && (
        <div className="p-6 bg-slate-950/40 border border-slate-800 border-dashed rounded-lg text-center flex flex-col items-center justify-center gap-2">
          <HelpCircle className="w-7 h-7 text-slate-600" />
          <p className="text-xs text-slate-400 font-medium">Nenhum dispositivo adicionado.</p>
          <p className="text-[10px] text-slate-500">Adicione um Arduino Uno, Sensor DHT22 ou crie componentes sob medida para começar.</p>
        </div>
      )}

      {/* List of Registered Devices */}
      <div className="flex flex-col gap-3.5 max-h-[480px] lg:max-h-none overflow-y-auto lg:overflow-visible pr-1">
        {devices.map((device) => (
          <div
            key={device.id}
            className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2 shadow-xs group"
          >
            {/* Device Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: device.color }}
                ></span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{device.name}</h4>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-semibold">
                    {device.type === 'custom' ? 'Customizado' : device.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveDevice(device.id)}
                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                title="Excluir componente"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {device.notes && (
              <p className="text-[10px] text-slate-400 leading-relaxed italic bg-slate-900/60 p-1.5 rounded">
                &ldquo;{device.notes}&rdquo;
              </p>
            )}

            {/* Pins Wiremapping Grid */}
            <div className="mt-1 border-t border-slate-900 pt-2 flex flex-col gap-1.5">
              <span className="text-[9.5px] text-slate-400 font-semibold uppercase tracking-wider block">Mapeamento de Pinos:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {device.pins.map((pin) => {
                  const isPinSelected = selectedPin?.deviceId === device.id && selectedPin?.pinId === pin.id;
                  const isMapped = pin.holeId !== null;

                  let pinBadgeColor = 'bg-slate-800 text-slate-400';
                  if (pin.type === 'power_vcc') pinBadgeColor = 'bg-red-950/60 text-red-400 border border-red-900/40';
                  if (pin.type === 'power_gnd') pinBadgeColor = 'bg-slate-900 text-slate-300 border border-slate-700/40';
                  if (pin.type === 'digital') pinBadgeColor = 'bg-sky-950/60 text-sky-400 border border-sky-900/40';
                  if (pin.type === 'analog') pinBadgeColor = 'bg-amber-950/60 text-amber-400 border border-amber-900/40';

                  return (
                    <div
                      key={pin.id}
                      className={`flex flex-col gap-1 p-1.5 rounded transition-all border ${isPinSelected ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/30' : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[9.5px] font-mono px-1 rounded truncate max-w-[80px] font-bold ${pinBadgeColor}`} title={pin.name}>
                          {pin.name}
                        </span>
                        
                        {isMapped ? (
                          <button
                            onClick={() => onMapPin(device.id, pin.id, null)}
                            className="text-[9px] text-red-400 hover:underline cursor-pointer flex items-center"
                            title="Desconectar do furo"
                          >
                            <X className="w-2.5 h-2.5 mr-0.5" /> Desc.
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-500">Aberto</span>
                        )}
                      </div>

                      {/* Map interactive button */}
                      {!isMapped ? (
                        <button
                          type="button"
                          onClick={() => toggleSelectPin(device.id, pin.id)}
                          className={`w-full py-0.5 text-[10px] font-semibold rounded text-center transition-all cursor-pointer ${isPinSelected ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                        >
                          {isPinSelected ? 'Clique no Furo' : 'Encaixar Fio'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 mt-0.5 bg-slate-900/60 px-1 py-0.5 rounded">
                          <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span className="text-[10px] text-emerald-400 font-semibold font-mono truncate">
                            Furo {pin.holeId?.toUpperCase().replace('TOP-OUTER-', 'T-GND-').replace('TOP-INNER-', 'T-VCC-').replace('BOTTOM-INNER-', 'B-VCC-').replace('BOTTOM-OUTER-', 'B-GND-')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Help Banner if a pin is active */}
      {selectedPin && (
        <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded-lg text-xs text-amber-200 animate-pulse flex items-start gap-1.5">
          <Power className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Modo de Encaixe Ativo!</p>
            <p className="text-[10px] text-amber-300 leading-relaxed">
              Clique em qualquer furo da protoboard acima para encaixar este pino nela.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
