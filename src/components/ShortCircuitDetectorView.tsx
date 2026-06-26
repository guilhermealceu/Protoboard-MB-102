import React from 'react';
import { NetComponent, ShortCircuitAlert } from '../utils/breadboard';
import { ShieldAlert, ShieldCheck, HelpCircle, Activity, Info } from 'lucide-react';

interface ShortCircuitDetectorViewProps {
  components: NetComponent[];
  alerts: ShortCircuitAlert[];
  onSelectComponent: (componentId: string | null) => void;
  selectedComponentId: string | null;
}

export const ShortCircuitDetectorView: React.FC<ShortCircuitDetectorViewProps> = ({
  components,
  alerts,
  onSelectComponent,
  selectedComponentId,
}) => {
  // Filter out completely empty nets (nets with only 1 baseNet or no active connections/wires)
  // Let's only display networks that have either wires connected OR devices connected,
  // since these are the "active" nodes.
  const activeComponents = components.filter(
    (comp) => comp.connectedPins.length > 0 || comp.netIds.size > 1
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Circuit Diagnostics Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Status do Circuito & Barramentos
        </h3>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
          {activeComponents.length} Canais Ativos
        </span>
      </div>

      {/* Health Check Status card */}
      {alerts.length > 0 ? (
        <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg flex gap-3 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-red-400">ALERTA DE SEGURANÇA!</span>
            <p className="text-[11px] text-red-200 leading-relaxed">
              Detectamos falhas graves que podem queimar seus componentes ou placa física.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-emerald-950/35 border border-emerald-900/60 rounded-lg flex gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-emerald-400">Circuito Saudável</span>
            <p className="text-[10px] text-emerald-300 leading-relaxed">
              Nenhum curto-circuito ou curto de pinos detectado. Pronto para montagem física!
            </p>
          </div>
        </div>
      )}

      {/* Alerts Details */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              onClick={() => onSelectComponent(alert.componentId)}
              className="p-3 bg-slate-950 rounded-lg border border-red-900/40 hover:border-red-500/60 cursor-pointer transition-all flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span className="text-xs font-bold text-red-400">Curto-Circuito #{index + 1}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">{alert.message}</p>
              <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                Componentes afetados: clique para destacar furos na placa.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bridged Networks Overview */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Canais Elétricos Conectados</span>
        
        {activeComponents.length === 0 ? (
          <div className="p-4 bg-slate-950/20 border border-slate-900 rounded-lg text-center text-slate-500 text-xs italic">
            Nenhuma ligação elétrica ativa. Puxe um cabo ou mapeie um pino para ver conexões aqui.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {activeComponents.map((comp) => {
              const isSelected = selectedComponentId === comp.id;
              
              // Determine labels
              let netLabel = 'Canal Desconhecido';
              let badgeColor = 'bg-slate-800 text-slate-300';

              if (comp.isPowerVcc) {
                netLabel = 'Linha Positiva de Energia (VCC)';
                badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/20';
              } else if (comp.isPowerGnd) {
                netLabel = 'Linha de Terra / Negativa (GND)';
                badgeColor = 'bg-slate-500/15 text-slate-400 border border-slate-700/30';
              } else if (comp.connectedPins.length > 0) {
                const pinsStr = comp.connectedPins.map(p => `${p.deviceName} [${p.pinName}]`).join(' e ');
                netLabel = `Sinal: ${pinsStr}`;
                badgeColor = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
              } else {
                netLabel = `Ponte de Fios (Furos ${Array.from<string>(comp.netIds).map(n => n.replace('terminal-upper-col-', 'U').replace('terminal-lower-col-', 'L')).join(', ')})`;
                badgeColor = 'bg-slate-800 text-slate-400 border border-slate-800';
              }

              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectComponent(isSelected ? null : comp.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-1.5 ${isSelected ? 'bg-slate-900 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/20' : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                      {netLabel}
                    </span>
                    <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${badgeColor}`}>
                      {comp.isPowerVcc ? 'VCC' : comp.isPowerGnd ? 'GND' : 'SINAL'}
                    </span>
                  </div>

                  {/* Connected holes & pins */}
                  <div className="flex flex-col gap-1 mt-0.5 border-t border-slate-900 pt-1.5">
                    {comp.connectedPins.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {comp.connectedPins.map((p, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] bg-slate-900 text-slate-300 px-1 py-0.5 rounded border border-slate-800"
                          >
                            {p.deviceName} &bull; <span className="text-amber-400 font-bold">{p.pinName}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-[9.5px] text-slate-500 font-mono">
                      Pontos de conexão: {Array.from<string>(comp.holeIds).slice(0, 10).map(h => h.toUpperCase()).join(', ')}
                      {comp.holeIds.size > 10 && ' ...'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-[10.5px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p>
          As protoboards MB-102 possuem duas metades separadas para os barramentos de energia. Se você ligar energia na esquerda, use cabos de ponte (jumpers) para passar a energia para o lado direito!
        </p>
      </div>
    </div>
  );
};
