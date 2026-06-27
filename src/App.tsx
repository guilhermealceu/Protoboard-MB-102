import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Wire, Device, DevicePin } from './types';
import { generateHoles, computeConnectedComponents, detectShortCircuits, NetComponent, ShortCircuitAlert, getHoleNetId, isVccNet, isGndNet } from './utils/breadboard';
import { BreadboardSVG } from './components/BreadboardSVG';
import { DeviceManager } from './components/DeviceManager';
import { WireManager, WIRE_COLORS } from './components/WireManager';
import { ShortCircuitDetectorView } from './components/ShortCircuitDetectorView';
import { ProjectActions } from './components/ProjectActions';
import { AiAssistant } from './components/AiAssistant';
import { ArduinoUnoVisualizer } from './components/ArduinoUnoVisualizer';
import { MobileCompactView } from './components/MobileCompactView';
import { 
  Cpu, 
  Wrench, 
  Sparkles, 
  Trash2, 
  Plus, 
  X, 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Info, 
  Cable, 
  Settings2, 
  HelpCircle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'mb102_breadboard_projects_v1';
const ACTIVE_PROJECT_ID_KEY = 'mb102_breadboard_active_id_v1';

// Initial dummy project to show off capabilities immediately!
const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-default-1',
    name: 'Termômetro DHT22 com Alerta KY-038',
    description: 'Protótipo laboratorial de medição térmica com sensor DHT22, Arduino Uno e módulo de microfone KY-038 para detecção de pico de ruído.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    devices: [
      {
        id: 'dev-uno',
        name: 'Arduino Uno R3',
        type: 'microcontroller',
        color: '#00979C',
        pins: [
          { id: 'pin-uno-5v', name: '5V', type: 'power_vcc', holeId: 'top-inner-5' },
          { id: 'pin-uno-gnd', name: 'GND 1', type: 'power_gnd', holeId: 'top-outer-5' },
          { id: 'pin-uno-d2', name: 'D2', type: 'digital', holeId: 'a-10' },
          { id: 'pin-uno-d3', name: 'D3 (~PWM)', type: 'digital', holeId: 'a-18' }
        ],
        notes: 'Microcontrolador central de controle.'
      },
      {
        id: 'dev-dht',
        name: 'Sensor DHT22',
        type: 'sensor',
        color: '#4A5568',
        pins: [
          { id: 'pin-dht-vcc', name: 'VDD (3-5V)', type: 'power_vcc', holeId: 'e-10' },
          { id: 'pin-dht-data', name: 'DATA', type: 'digital', holeId: 'e-11' },
          { id: 'pin-dht-nc', name: 'NC', type: 'other', holeId: null },
          { id: 'pin-dht-gnd', name: 'GND', type: 'power_gnd', holeId: 'e-13' }
        ],
        notes: 'Sensor de temperatura e umidade.'
      }
    ],
    wires: [
      { id: 'w-1', sourceId: 'top-inner-5', destId: 'top-inner-10', color: '#EF4444', label: 'Energia VCC DHT22' },
      { id: 'w-2', sourceId: 'top-outer-5', destId: 'top-outer-13', color: '#1A1A1A', label: 'GND DHT22' },
      { id: 'w-3', sourceId: 'b-10', destId: 'd-10', color: '#3B82F6', label: 'Linha VCC Bridge' },
      { id: 'w-4', sourceId: 'c-11', destId: 'b-10', color: '#F59E0B', label: 'Sinal de Dados D2' },
      { id: 'w-5', sourceId: 'a-13', destId: 'top-outer-13', color: '#1A1A1A', label: 'GND Bridge' }
    ]
  }
];

export default function App() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');

  // UI Interactive States
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [hoveredHoleId, setHoveredHoleId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [activeWireColor, setActiveWireColor] = useState<string>('#EF4444'); // Default RED
  const [wireModeActive, setWireModeActive] = useState<boolean>(false);
  const [firstHoleForWire, setFirstHoleForWire] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<{ deviceId: string; pinId: string } | null>(null);
  const [highlightedComponentId, setHighlightedComponentId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'devices' | 'wires' | 'ai' | 'health'>('devices');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Responsive / Mobile-friendly States
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileViewType, setMobileViewType] = useState<'grafico' | 'simplificado'>('grafico');

  // Detect mobile screen width on mount and resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // States for Hole Modal Editing
  const [editWireLabel, setEditWireLabel] = useState<string>('');
  const [editWireNotes, setEditWireNotes] = useState<string>('');
  const [editingWireInModalId, setEditingWireInModalId] = useState<string | null>(null);

  // Load all projects from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setAllProjects(parsed);
          const defaultId = parsed.find((p: any) => p.id === savedActiveId)?.id || parsed[0].id;
          setCurrentProjectId(defaultId);
          return;
        }
      } catch (err) {
        console.error('Error parsing projects', err);
      }
    }

    // Default Fallback
    setAllProjects(DEFAULT_PROJECTS);
    setCurrentProjectId(DEFAULT_PROJECTS[0].id);
  }, []);

  // Save projects to LocalStorage
  const saveAllToStorage = (updatedProjects: Project[]) => {
    setAllProjects(updatedProjects);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProjects));
  };

  const currentProject = useMemo(() => {
    const proj = allProjects.find((p) => p.id === currentProjectId);
    return proj || DEFAULT_PROJECTS[0];
  }, [allProjects, currentProjectId]);

  // Compute connected components and diagnostics in real time!
  const diagnostics = useMemo(() => {
    const { holeToComponentMap, components } = computeConnectedComponents(
      currentProject.wires,
      currentProject.devices
    );
    const alerts = detectShortCircuits(components);

    return { holeToComponentMap, components, alerts };
  }, [currentProject]);

  // Compute active pins list for telemetry dashboard
  const activePinsList = useMemo(() => {
    return currentProject.devices.flatMap(dev => 
      dev.pins.filter(p => p.holeId !== null).map(p => ({
        deviceName: dev.name,
        deviceColor: p.color || dev.color,
        pinName: p.name,
        holeId: p.holeId!
      }))
    );
  }, [currentProject]);

  // Compute wire colors breakdown for telemetry dashboard
  const wireInventory = useMemo(() => {
    const counts: { [key: string]: number } = {};
    currentProject.wires.forEach(w => {
      counts[w.color] = (counts[w.color] || 0) + 1;
    });
    return Object.entries(counts).map(([color, count]) => ({ color, count }));
  }, [currentProject.wires]);

  // Translate code coordinates to friendly terms
  const getFriendlyHoleName = (id: string) => {
    if (!id) return '';
    const norm = id.toLowerCase();
    if (norm.startsWith('top-outer-')) {
      const col = norm.replace('top-outer-', '');
      return `Barramento Superior: Terra (GND - Azul) • Coluna ${col}`;
    }
    if (norm.startsWith('top-inner-')) {
      const col = norm.replace('top-inner-', '');
      return `Barramento Superior: Alimentação (VCC - Vermelho) • Coluna ${col}`;
    }
    if (norm.startsWith('bottom-inner-')) {
      const col = parseInt(norm.replace('bottom-inner-', ''), 10);
      if (col <= 30) {
        return `Barramento Inferior: Alimentação (VCC - Vermelho) • Coluna ${col}`;
      } else {
        return `Barramento Inferior: Terra (GND - Azul) • Coluna ${col}`;
      }
    }
    if (norm.startsWith('bottom-outer-')) {
      const col = parseInt(norm.replace('bottom-outer-', ''), 10);
      if (col <= 30) {
        return `Barramento Inferior: Terra (GND - Azul) • Coluna ${col}`;
      } else {
        return `Barramento Inferior: Alimentação (VCC - Vermelho) • Coluna ${col}`;
      }
    }
    
    // Terminal rows a-j
    const parts = id.split('-');
    if (parts.length === 2) {
      const row = parts[0].toUpperCase();
      const col = parts[1];
      const section = ['A', 'B', 'C', 'D', 'E'].includes(row) ? 'Superior' : 'Inferior';
      return `Furo ${row}-${col} • Linha ${row}, Coluna ${col} (Seção ${section})`;
    }
    return id.toUpperCase();
  };

  const getHoleDisplayLabel = (holeId: string) => {
    const id = holeId.toUpperCase();
    if (id.startsWith('TOP-OUTER-')) return 'GND-T ' + id.replace('TOP-OUTER-', '');
    if (id.startsWith('TOP-INNER-')) return 'VCC-T ' + id.replace('TOP-INNER-', '');
    
    if (id.startsWith('BOTTOM-INNER-')) {
      const col = parseInt(id.replace('BOTTOM-INNER-', ''), 10);
      return col <= 30 ? `VCC-B ${col}` : `GND-B ${col}`;
    }
    if (id.startsWith('BOTTOM-OUTER-')) {
      const col = parseInt(id.replace('BOTTOM-OUTER-', ''), 10);
      return col <= 30 ? `GND-B ${col}` : `VCC-B ${col}`;
    }
    return id;
  };

  // Find all wires connected to a specific hole
  const getWiresForHole = (holeId: string) => {
    return currentProject.wires.filter(w => w.sourceId === holeId || w.destId === holeId);
  };

  // Find pin connected to a specific hole
  const getPinForHole = (holeId: string) => {
    for (const dev of currentProject.devices) {
      for (const pin of dev.pins) {
        if (pin.holeId === holeId) {
          return { device: dev, pin };
        }
      }
    }
    return null;
  };

  // Find pins that are available to be plugged in (currently soltos/sem furo, or in other furos)
  const getAvailablePinsToPlug = () => {
    const list: { device: Device; pin: DevicePin }[] = [];
    currentProject.devices.forEach((dev) => {
      dev.pins.forEach((pin) => {
        list.push({ device: dev, pin });
      });
    });
    return list;
  };

  // 1. Hole Click Controller
  const handleHoleClick = (holeId: string) => {
    // A. Pin Mapping Mode (se ativado por fora)
    if (selectedPin) {
      onMapPin(selectedPin.deviceId, selectedPin.pinId, holeId);
      setSelectedPin(null);
      return;
    }

    // B. Drawing Wire Mode (se ativado por fora)
    if (wireModeActive) {
      if (!firstHoleForWire) {
        setFirstHoleForWire(holeId);
      } else {
        if (firstHoleForWire === holeId) {
          setFirstHoleForWire(null); // Cancel same point
          return;
        }

        // Create standard wire
        const newWire: Wire = {
          id: `w-${Date.now()}`,
          sourceId: firstHoleForWire,
          destId: holeId,
          color: activeWireColor,
        };

        onAddWire(newWire);
        setFirstHoleForWire(null);
        setWireModeActive(false); // Desativar após completar o cabo para maior fluidez
      }
      return;
    }

    // C. Regular Hole Inspection Mode - Opens modal!
    setSelectedHoleId(holeId);
    setSelectedWireId(null);
  };

  // Wire operations
  const onAddWire = (wire: Wire) => {
    const updatedWires = [...currentProject.wires, wire];
    const updatedProject = {
      ...currentProject,
      wires: updatedWires,
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = allProjects.map((p) => (p.id === currentProjectId ? updatedProject : p));
    saveAllToStorage(updatedAll);
  };

  const onRemoveWire = (wireId: string) => {
    const updatedWires = currentProject.wires.filter((w) => w.id !== wireId);
    const updatedProject = {
      ...currentProject,
      wires: updatedWires,
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = allProjects.map((p) => (p.id === currentProjectId ? updatedProject : p));
    saveAllToStorage(updatedAll);
    if (selectedWireId === wireId) setSelectedWireId(null);
  };

  const onUpdateWire = (wireId: string, label: string, notes: string) => {
    const updatedWires = currentProject.wires.map((w) =>
      w.id === wireId ? { ...w, label, notes } : w
    );
    const updatedProject = {
      ...currentProject,
      wires: updatedWires,
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = allProjects.map((p) => (p.id === currentProjectId ? updatedProject : p));
    saveAllToStorage(updatedAll);
  };

  // AI Assistant auto wire callback
  const handleAddAutoWire = (source: string, dest: string, color: string, label: string) => {
    const newWire: Wire = {
      id: `w-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sourceId: source,
      destId: dest,
      color,
      label,
    };
    onAddWire(newWire);
  };

  // Device operations
  const onAddDevice = (device: Device) => {
    const updatedDevices = [...currentProject.devices, device];
    const updatedProject = {
      ...currentProject,
      devices: updatedDevices,
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = allProjects.map((p) => (p.id === currentProjectId ? updatedProject : p));
    saveAllToStorage(updatedAll);
  };

  const onRemoveDevice = (deviceId: string) => {
    const updatedDevices = currentProject.devices.filter((d) => d.id !== deviceId);
    const updatedProject = {
      ...currentProject,
      devices: updatedDevices,
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = allProjects.map((p) => (p.id === currentProjectId ? updatedProject : p));
    saveAllToStorage(updatedAll);
  };

  const onMapPin = (deviceId: string, pinId: string, holeId: string | null) => {
    const updatedDevices = currentProject.devices.map((dev) => {
      if (dev.id !== deviceId) return dev;
      return {
        ...dev,
        pins: dev.pins.map((p) => {
          if (p.id === pinId) {
            // Assign the active wire color if the pin is being connected and has no custom color yet
            const updatedColor = holeId ? (p.color || activeWireColor) : p.color;
            return { ...p, holeId, color: updatedColor };
          }
          return p;
        }),
      };
    });

    const updatedProject = {
      ...currentProject,
      devices: updatedDevices,
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = allProjects.map((p) => (p.id === currentProjectId ? updatedProject : p));
    saveAllToStorage(updatedAll);
  };

  const onUpdatePinColor = (deviceId: string, pinId: string, color: string) => {
    const updatedDevices = currentProject.devices.map((dev) => {
      if (dev.id !== deviceId) return dev;
      return {
        ...dev,
        pins: dev.pins.map((p) => (p.id === pinId ? { ...p, color } : p)),
      };
    });

    const updatedProject = {
      ...currentProject,
      devices: updatedDevices,
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = allProjects.map((p) => (p.id === currentProjectId ? updatedProject : p));
    saveAllToStorage(updatedAll);
  };

  // Project operations
  const handleSaveProject = (proj: Project) => {
    const exists = allProjects.some((p) => p.id === proj.id);
    let updatedAll;
    if (exists) {
      updatedAll = allProjects.map((p) => (p.id === proj.id ? proj : p));
    } else {
      updatedAll = [...allProjects, proj];
    }
    saveAllToStorage(updatedAll);
  };

  const handleLoadProject = (projId: string) => {
    setCurrentProjectId(projId);
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projId);
    // Clear interactive states
    setSelectedHoleId(null);
    setSelectedWireId(null);
    setFirstHoleForWire(null);
    setSelectedPin(null);
  };

  const handleCreateNewProject = (name: string, description: string) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      wires: [],
      devices: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = [...allProjects, newProj];
    saveAllToStorage(updatedAll);
    setCurrentProjectId(newProj.id);
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, newProj.id);
  };

  const handleDeleteProject = (projId: string) => {
    const updatedAll = allProjects.filter((p) => p.id !== projId);
    if (updatedAll.length === 0) return; // Prevent deleting last one
    saveAllToStorage(updatedAll);
    if (currentProjectId === projId) {
      setCurrentProjectId(updatedAll[0].id);
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, updatedAll[0].id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none print:bg-white print:text-black">
      
      {/* 1. BRAND HEADER (COMPACT PREMIUM CAD) */}
      <header className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between gap-4 shrink-0 print:hidden z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] border border-indigo-400/20">
            <Cpu className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-display font-bold text-white tracking-tight flex items-center gap-1.5">
              RuneBoard
              <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono px-1.5 py-0.5 rounded-full font-bold">
                PRO v1.5
              </span>
            </h1>
            <a 
              href="http://www.runeprojects.com.br/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold block leading-none hover:underline mt-0.5"
            >
              by Rune Projects
            </a>
          </div>
        </div>

        {/* Project Selector & Actions Toolbar */}
        <div className="flex items-center gap-2">
          <ProjectActions
            currentProject={currentProject}
            onSaveProject={handleSaveProject}
            onLoadProject={handleLoadProject}
            onCreateNewProject={handleCreateNewProject}
            onDeleteProject={handleDeleteProject}
            allProjects={allProjects}
          />
          
          <div className="h-5 w-px bg-slate-800/80 mx-1 hidden sm:block" />
          
          {/* Sidebar Toggle inside Toolbar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${sidebarOpen ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-xs' : 'text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60'}`}
            title={sidebarOpen ? "Ocultar Painel Lateral" : "Mostrar Painel Lateral"}
          >
            <Settings2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN SPLIT SECTION (GRID CAD LAYOUT) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden print:p-0 relative">
        
        {/* LEFT/CENTER WORKSPACE: THE BREADBOARD VISUAL STAGE (NOW CENTRALIZED) */}
        <div className="flex-1 flex flex-col lg:overflow-y-auto overflow-visible bg-slate-900 bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] [background-size:20px_20px] p-4 lg:p-6 print:p-0 relative">
          
          {/* Header Dashboard Summary cards (Floating on top of board) */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 print:hidden z-10">
            
            {/* Quick Health Bar */}
            {diagnostics.alerts.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 p-3 bg-red-950/80 backdrop-blur-md border border-red-900/60 rounded-xl flex items-center gap-3 shadow-md"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 animate-pulse shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-red-300 block uppercase tracking-wider text-[10px]">Curto-circuito Detectado!</span>
                  <p className="text-red-200 text-[11px] font-medium leading-relaxed">
                    Existem {diagnostics.alerts.length} conflitos graves de energia que podem queimar sua placa.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 p-3 bg-emerald-950/80 backdrop-blur-md border border-emerald-900/60 rounded-xl flex items-center gap-3 shadow-md"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-emerald-300 block uppercase tracking-wider text-[10px]">Circuito Saudável</span>
                  <p className="text-emerald-200/90 text-[11px] font-medium leading-relaxed">
                    Nenhum curto-circuito. Suas ligações físicas estão seguras para montagem.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Quick Statistics Stats Card */}
            <div className="sm:w-64 p-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Zap className="w-4.5 h-4.5" />
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Elementos</span>
                  <span className="text-slate-200 font-bold block text-[11px] font-mono">
                    {currentProject.devices.length} Peças • {currentProject.wires.length} Fios
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedHoleId(null);
                  setSelectedWireId(null);
                  setFirstHoleForWire(null);
                }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md font-bold transition-all cursor-pointer"
              >
                Limpar Foco
              </button>
            </div>
          </div>

          {/* FLUX HELPER: WIRE MODE HUD (Floating indicator when drawing a wire) */}
          <AnimatePresence>
            {wireModeActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-full max-w-md bg-indigo-950/95 border border-indigo-500/40 rounded-xl p-3.5 shadow-[0_10px_30px_rgba(99,102,241,0.25)] backdrop-blur-md flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Modo Desenho de Cabo Ativo
                  </span>
                  <button
                    onClick={() => {
                      setWireModeActive(false);
                      setFirstHoleForWire(null);
                    }}
                    className="p-1 hover:bg-indigo-900 rounded text-indigo-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-indigo-200 leading-normal">
                  {!firstHoleForWire ? (
                    <span><strong>Passo 1:</strong> Clique no furo de <strong>origem</strong> da protoboard para fixar o cabo.</span>
                  ) : (
                    <span><strong>Passo 2:</strong> Origem definida em <strong className="font-mono text-emerald-400 text-xs bg-indigo-900 px-1.5 py-0.5 rounded">{firstHoleForWire.toUpperCase()}</strong>. Agora clique no furo de <strong>destino</strong>!</span>
                  )}
                </p>

                {/* Color quick changer inside wire HUD */}
                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-indigo-900/60">
                  <span className="text-[9.5px] text-indigo-300 font-semibold uppercase">Paleta Dupont:</span>
                  <div className="flex gap-1.5 overflow-x-auto py-0.5">
                    {WIRE_COLORS.slice(0, 7).map(col => (
                      <button
                        key={col.value}
                        onClick={() => setActiveWireColor(col.value)}
                        className={`w-4.5 h-4.5 rounded-full border transition-all cursor-pointer ${activeWireColor === col.value ? 'ring-2 ring-indigo-400 scale-110 border-white' : 'border-slate-700 hover:border-slate-500'}`}
                        style={{ backgroundColor: col.value === '#FFFFFF' ? '#F3F4F6' : col.value }}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* VIEW SWITCH FOR MOBILE ONLY */}
          {isMobile && (
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 gap-1.5 mb-4 z-10 shrink-0">
              <button
                type="button"
                onClick={() => setMobileViewType('grafico')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mobileViewType === 'grafico' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Esquema Gráfico (Zoom)
              </button>
              <button
                type="button"
                onClick={() => setMobileViewType('simplificado')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mobileViewType === 'simplificado' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Lista Simplificada (Caixinhas 📱)
              </button>
            </div>
          )}

          {isMobile && mobileViewType === 'simplificado' ? (
            <div className="z-10 mb-6 shrink-0">
              <MobileCompactView
                wires={currentProject.wires}
                devices={currentProject.devices}
                onAddWire={onAddWire}
                onRemoveWire={onRemoveWire}
                onMapPin={onMapPin}
                onUpdatePinColor={onUpdatePinColor}
              />
            </div>
          ) : (
            <>
              {/* Interactive Protoboard SVG Stage in Center (Now with scale entry animation) */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex-1 min-h-[380px] max-h-[460px] print:max-h-none print:min-h-0 relative z-0 flex items-center justify-center"
              >
                <div className="w-full h-full relative group">
                  <BreadboardSVG
                    wires={currentProject.wires}
                    devices={currentProject.devices}
                    onHoleClick={handleHoleClick}
                    selectedHoleId={selectedHoleId}
                    hoveredHoleId={hoveredHoleId}
                    setHoveredHoleId={setHoveredHoleId}
                    onWireClick={(wire) => {
                      setSelectedWireId(wire.id);
                      setSelectedHoleId(null);
                    }}
                    selectedWireId={selectedWireId}
                    highlightedComponentId={highlightedComponentId}
                    holeToComponentMap={diagnostics.holeToComponentMap}
                  />
                </div>
              </motion.div>

              {/* Active Cable Jumper Details Inspector (Floating below board) */}
              <AnimatePresence>
                {selectedWireId && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="p-4 bg-slate-950/90 backdrop-blur-md border border-sky-900/40 rounded-xl shadow-lg mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden z-10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-950 border border-sky-800/30 flex items-center justify-center shrink-0">
                        <Cable className="w-5.5 h-5.5 text-sky-400" />
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" style={{ backgroundColor: currentProject.wires.find(w => w.id === selectedWireId)?.color }}></span>
                          <h4 className="font-bold text-slate-200">Cabo Dupont Selecionado: {currentProject.wires.find(w => w.id === selectedWireId)?.sourceId.toUpperCase()} &rarr; {currentProject.wires.find(w => w.id === selectedWireId)?.destId.toUpperCase()}</h4>
                        </div>
                        {currentProject.wires.find(w => w.id === selectedWireId)?.label && (
                          <p className="text-sky-400 font-semibold mt-1 font-mono text-[11px] bg-sky-950/40 border border-sky-900/30 px-1.5 py-0.5 rounded w-fit">
                            Etiqueta: {currentProject.wires.find(w => w.id === selectedWireId)?.label}
                          </p>
                        )}
                        {currentProject.wires.find(w => w.id === selectedWireId)?.notes && (
                          <p className="text-slate-400 italic mt-1 pl-1 leading-normal">
                            &ldquo;{currentProject.wires.find(w => w.id === selectedWireId)?.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          // Trigger modal of source hole to edit details
                          const w = currentProject.wires.find(w => w.id === selectedWireId);
                          if (w) setSelectedHoleId(w.sourceId);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                      >
                        Editar Informações
                      </button>
                      <button
                        onClick={() => onRemoveWire(selectedWireId)}
                        className="px-3 py-1.5 bg-red-950 hover:bg-red-900/80 text-red-400 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                      >
                        Apagar Cabo
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsible / Interactive Arduino Uno R3 Visualizer section */}
              <div className="mt-6 z-10 print:hidden">
                <ArduinoUnoVisualizer
                  devices={currentProject.devices}
                  onAddDevice={onAddDevice}
                  onRemoveDevice={onRemoveDevice}
                  onMapPin={onMapPin}
                  selectedPin={selectedPin}
                  setSelectedPin={setSelectedPin}
                  selectedHoleId={selectedHoleId}
                  onUpdatePinColor={onUpdatePinColor}
                />
              </div>
            </>
          )}

          {/* Real-time Telemetry Dashboard below the Breadboard Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 print:hidden z-10">
            {/* Column 1: Mapeamento de Pinos Ativos */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-col gap-2.5 hover:border-slate-700/60 transition-colors">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs tracking-wider uppercase">
                <Wrench className="w-4 h-4" />
                <span>Mapeamento de Pinos Ativos</span>
              </div>
              <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {activePinsList.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-1">Nenhum pino de componente mapeado ainda.</p>
                ) : (
                  activePinsList.map((pin, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-900/80">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pin.deviceColor }} />
                        <span className="font-bold text-slate-200 truncate max-w-[85px]" title={pin.deviceName}>{pin.deviceName}</span>
                        <span className="text-slate-400 font-mono text-[9px] shrink-0">&rarr; {pin.pinName}</span>
                      </span>
                      <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0">
                        {getHoleDisplayLabel(pin.holeId)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Pontes Dupont Ativas */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-col gap-2.5 hover:border-slate-700/60 transition-colors">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs tracking-wider uppercase">
                <Zap className="w-4 h-4" />
                <span>Pontes Dupont Ativas</span>
              </div>
              <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {currentProject.wires.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-1">Nenhum cabo de ponte (jumper) na protoboard.</p>
                ) : (
                  currentProject.wires.map((wire) => (
                    <div key={wire.id} className="flex items-center justify-between text-[11px] bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-900/80">
                      <span className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded shrink-0 border border-white/10" style={{ backgroundColor: wire.color }} />
                        <span className="font-mono text-slate-300 text-[10px] truncate">
                          {getHoleDisplayLabel(wire.sourceId)} &harr; {getHoleDisplayLabel(wire.destId)}
                        </span>
                      </span>
                      {wire.label && (
                        <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded truncate max-w-[70px]" title={wire.label}>
                          {wire.label}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Inventário de Hardware */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-col gap-2.5 hover:border-slate-700/60 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs tracking-wider uppercase">
                <Activity className="w-4 h-4" />
                <span>Inventário de Hardware</span>
              </div>
              <div className="flex flex-col gap-2.5 text-[11px] text-slate-400">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Distribuição de Cabos:</span>
                  <div className="flex flex-wrap gap-1.5 py-1 max-h-[75px] overflow-y-auto">
                    {wireInventory.length === 0 ? (
                      <span className="text-slate-500 italic text-[10px]">Nenhum cabo ativo na protoboard.</span>
                    ) : (
                      wireInventory.map((item, idx) => {
                        const colorInfo = WIRE_COLORS.find(c => c.value === item.color);
                        const cleanColorName = colorInfo ? colorInfo.name.split(' ')[0] : 'Cabo';
                        return (
                          <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-950/60 border border-slate-900 px-2 py-1 rounded-md text-[10px] text-slate-300 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/5" style={{ backgroundColor: item.color }} />
                            <span>{cleanColorName}: <strong className="text-white font-mono">{item.count}</strong></span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="h-px bg-slate-800/60" />

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-400">Componentes Integrados:</span>
                  <span className="font-mono font-bold text-slate-200 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    {currentProject.devices.length}
                  </span>
                </div>
              </div>
            </div>
          </div>



          {/* Print Layout details */}
          <div className="hidden print:block font-sans text-xs p-6 border-t border-slate-300 mt-12">
            <h2 className="text-lg font-bold uppercase mb-2">{currentProject.name}</h2>
            <p className="mb-4 text-slate-700">{currentProject.description}</p>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold uppercase border-b border-slate-400 pb-1 mb-2">Componentes</h3>
                <ul className="space-y-1">
                  {currentProject.devices.map(dev => (
                    <li key={dev.id} className="text-[11px]">
                      <strong>{dev.name}</strong> ({dev.type}): {dev.pins.map(p => `${p.name} -> ${p.holeId?.toUpperCase() || 'Não conectado'}`).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold uppercase border-b border-slate-400 pb-1 mb-2">Cabeamento</h3>
                <ul className="space-y-1">
                  {currentProject.wires.map(w => (
                    <li key={w.id} className="text-[11px]">
                      {w.sourceId.toUpperCase()} para {w.destId.toUpperCase()} - Cor {w.color} {w.label ? `(${w.label})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Retractable Action Sidebar (Bento Tabs Layout) */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? '100%' : 440, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="w-full lg:w-[440px] bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 overflow-hidden print:hidden z-10 shadow-2xl relative lg:h-auto h-[60vh]"
            >
              {/* Sidebar Tab Selectors */}
              <div className="flex bg-slate-950 border-b border-slate-800/80 p-1 font-semibold text-xs shrink-0 z-10 sticky top-0 backdrop-blur-md">
                <button
                  onClick={() => setSidebarTab('devices')}
                  className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${sidebarTab === 'devices' ? 'border-indigo-500 text-white font-bold bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Componentes
                </button>
                <button
                  onClick={() => setSidebarTab('wires')}
                  className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${sidebarTab === 'wires' ? 'border-indigo-500 text-white font-bold bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Cabos
                </button>
                <button
                  onClick={() => setSidebarTab('ai')}
                  className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1 ${sidebarTab === 'ai' ? 'border-indigo-500 text-white font-bold bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  Mestre IA
                </button>
                <button
                  onClick={() => setSidebarTab('health')}
                  className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${sidebarTab === 'health' ? 'border-indigo-500 text-white font-bold bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Status ({diagnostics.components.filter(c => c.connectedPins.length > 0 || c.netIds.size > 1).length})
                </button>
              </div>

              {/* Panel Container (with fade animations per tab) */}
              <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={sidebarTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {sidebarTab === 'devices' && (
                      <DeviceManager
                        devices={currentProject.devices}
                        onAddDevice={onAddDevice}
                        onRemoveDevice={onRemoveDevice}
                        onMapPin={onMapPin}
                        selectedPin={selectedPin}
                        setSelectedPin={setSelectedPin}
                        selectedHoleId={selectedHoleId}
                      />
                    )}

                    {sidebarTab === 'wires' && (
                      <WireManager
                        wires={currentProject.wires}
                        onAddWire={onAddWire}
                        onRemoveWire={onRemoveWire}
                        onUpdateWire={onUpdateWire}
                        selectedWireId={selectedWireId}
                        setSelectedWireId={setSelectedWireId}
                        activeWireColor={activeWireColor}
                        setActiveWireColor={setActiveWireColor}
                        wireModeActive={wireModeActive}
                        setWireModeActive={setWireModeActive}
                      />
                    )}

                    {sidebarTab === 'ai' && (
                      <AiAssistant
                        devices={currentProject.devices}
                        wires={currentProject.wires}
                        onAddAutoWire={handleAddAutoWire}
                      />
                    )}

                    {sidebarTab === 'health' && (
                      <ShortCircuitDetectorView
                        components={diagnostics.components}
                        alerts={diagnostics.alerts}
                        onSelectComponent={setHighlightedComponentId}
                        selectedComponentId={highlightedComponentId}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



      </main>

      {/* 3. MODERN HOLE DETAILS MODAL (INTERACTIVE CONNECTION SYSTEM) */}
      <AnimatePresence>
        {selectedHoleId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Dark Backdrop with heavy blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => {
                setSelectedHoleId(null);
                setEditingWireInModalId(null);
              }}
            />

            {/* Modal Card (Styled like high-tech panel) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              {/* Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Activity className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm font-mono tracking-tight">
                      Explorar Furo: {selectedHoleId.toUpperCase()}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {getFriendlyHoleName(selectedHoleId)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedHoleId(null);
                    setEditingWireInModalId(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-100 bg-slate-900 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-5 flex-col gap-4 overflow-y-auto flex">
                
                {/* A. Electrical Net/Barramento Info */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mapeamento Elétrico</span>
                    <span className="text-slate-200 font-medium font-mono text-[11px]">
                      Linha de Conexão: {getHoleNetId(selectedHoleId).replace('terminal-upper-col-', 'Coluna Superior ').replace('terminal-lower-col-', 'Coluna Inferior ')}
                    </span>
                  </div>
                  {(() => {
                    const hNet = getHoleNetId(selectedHoleId);
                    const isVcc = isVccNet(hNet);
                    const isGnd = isGndNet(hNet);
                    return (
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${isVcc ? 'bg-red-500/10 text-red-400 border-red-500/20' : isGnd ? 'bg-slate-500/20 text-slate-400 border-slate-700/50' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                        {isVcc ? 'VCC (+)' : isGnd ? 'GND (-)' : 'SINAL (S)'}
                      </span>
                    );
                  })()}
                </div>

                {/* B. Connected Device Pins (Pinos do Arduino/Sensor neste Furo) */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pinos de Peças Encaixados</span>
                  
                  {(() => {
                    const pinConnection = getPinForHole(selectedHoleId);
                    if (pinConnection) {
                      const { device, pin } = pinConnection;
                      return (
                        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-slate-800 shrink-0"
                              style={{ backgroundColor: device.color }}
                            />
                            <div className="text-xs">
                              <span className="font-bold text-slate-200 block leading-tight">{device.name}</span>
                              <span className="text-slate-400 text-[11px]">Pino: <strong className="text-amber-400 font-mono">{pin.name}</strong> • Tipo {pin.type.toUpperCase()}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              onMapPin(device.id, pin.id, null);
                              // Refresh modal representation is reactive
                            }}
                            className="p-1 px-2.5 bg-red-950/60 hover:bg-red-950 text-red-400 text-[10px] font-bold rounded-md border border-red-900/30 hover:border-red-500/40 transition-colors cursor-pointer flex items-center gap-1"
                            title="Remover encaixe físico deste pino"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Retirar
                          </button>
                        </div>
                      );
                    } else {
                      // Se não houver pino, mostra opção de plugar pinos disponíveis!
                      const availablePins = getAvailablePinsToPlug();
                      const soltos = availablePins.filter(item => item.pin.holeId === null);
                      
                      return (
                        <div className="flex flex-col gap-2">
                          <p className="text-[11px] text-slate-400 italic">Nenhum componente físico está encaixado neste buraquinho da placa.</p>
                          
                          {availablePins.length === 0 ? (
                            <div className="p-2.5 bg-slate-950/40 border border-slate-800/40 border-dashed rounded-lg text-center text-[11px] text-slate-500 italic">
                              Cadastre um Arduino ou Sensor na aba lateral de Componentes para poder plugar aqui.
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex flex-col gap-2">
                              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Encaixar Pino Disponível:</span>
                              
                              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                                {availablePins.map(({ device, pin }) => {
                                  const isCurrentlyPlugged = pin.holeId !== null;
                                  return (
                                    <div 
                                      key={pin.id}
                                      onClick={() => {
                                        onMapPin(device.id, pin.id, selectedHoleId);
                                      }}
                                      className="p-2 bg-slate-900 hover:bg-slate-850 hover:border-indigo-500/40 border border-slate-800/80 rounded-lg flex items-center justify-between gap-2.5 cursor-pointer transition-all"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: device.color }} />
                                        <div className="text-[11px]">
                                          <strong className="text-slate-300">{device.name}</strong>
                                          <span className="text-slate-400 ml-1.5">Pino: <strong className="text-amber-400 font-mono">{pin.name}</strong></span>
                                        </div>
                                      </div>
                                      <span className={`text-[8.5px] px-1.5 py-0.5 rounded-md font-mono ${isCurrentlyPlugged ? 'bg-amber-950/50 text-amber-400 border border-amber-900/20' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/30 font-bold'}`}>
                                        {isCurrentlyPlugged ? `Mover de ${pin.holeId?.toUpperCase()}` : 'Plugar'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* C. Dupont Wires Connected to this hole (Cabos) */}
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cabos Dupont Conectados</span>
                  
                  {(() => {
                    const wiresInHole = getWiresForHole(selectedHoleId);
                    if (wiresInHole.length === 0) {
                      return <p className="text-[11px] text-slate-400 italic">Nenhum cabo de ponte (jumper) está plugado neste furo.</p>;
                    }

                    return (
                      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                        {wiresInHole.map((wire) => {
                          const otherEnd = wire.sourceId === selectedHoleId ? wire.destId : wire.sourceId;
                          const isEditingThisWire = editingWireInModalId === wire.id;

                          return (
                            <div 
                              key={wire.id}
                              className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2"
                            >
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full border border-slate-800" style={{ backgroundColor: wire.color }} />
                                  <span className="font-mono text-[11px] text-slate-300 font-bold uppercase">
                                    Cabo para: {otherEnd.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      if (isEditingThisWire) {
                                        onUpdateWire(wire.id, editWireLabel, editWireNotes);
                                        setEditingWireInModalId(null);
                                      } else {
                                        setEditingWireInModalId(wire.id);
                                        setEditWireLabel(wire.label || '');
                                        setEditWireNotes(wire.notes || '');
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-900 rounded transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1"
                                  >
                                    {isEditingThisWire ? 'Salvar' : 'Editar Nota'}
                                  </button>
                                  <button
                                    onClick={() => onRemoveWire(wire.id)}
                                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                                    title="Remover este cabo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {isEditingThisWire ? (
                                <div className="flex flex-col gap-2 p-1.5 bg-slate-900 rounded-lg">
                                  <input 
                                    type="text"
                                    placeholder="Identificador (Ex: Linha Reset)"
                                    value={editWireLabel}
                                    onChange={(e) => setEditWireLabel(e.target.value)}
                                    className="text-xs bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                  <textarea 
                                    placeholder="Anotações adicionais da conexão..."
                                    value={editWireNotes}
                                    onChange={(e) => setEditWireNotes(e.target.value)}
                                    rows={2}
                                    className="text-[11px] bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                  />
                                </div>
                              ) : (
                                (wire.label || wire.notes) && (
                                  <div className="text-[11px] pl-5 border-l border-slate-800 leading-normal text-slate-400">
                                    {wire.label && <div className="font-bold text-slate-300">{wire.label}</div>}
                                    {wire.notes && <div className="italic mt-0.5">&ldquo;{wire.notes}&rdquo;</div>}
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* D. Main Action: Start wire from here */}
                <div className="mt-2 border-t border-slate-850 pt-4">
                  <button
                    onClick={() => {
                      setFirstHoleForWire(selectedHoleId);
                      setWireModeActive(true);
                      setSelectedHoleId(null); // Close modal and focus on breadboard
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                  >
                    <Cable className="w-4.5 h-4.5" />
                    Puxar Novo Jumper deste Furo
                  </button>
                  <p className="text-[9.5px] text-slate-500 text-center italic mt-1.5">
                    Isso fixará a ponta deste cabo em {selectedHoleId.toUpperCase()} para você clicar no destino na placa.
                  </p>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

