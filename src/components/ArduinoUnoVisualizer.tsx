import React, { useState, useRef } from 'react';
import { Device } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Link, Unlink, Plus } from 'lucide-react';
import { WIRE_COLORS } from './WireManager';

interface ArduinoUnoVisualizerProps {
  devices: Device[];
  onAddDevice: (device: Device) => void;
  onRemoveDevice: (deviceId: string) => void;
  onMapPin: (deviceId: string, pinId: string, holeId: string | null) => void;
  selectedPin: { deviceId: string; pinId: string } | null;
  setSelectedPin: (pin: { deviceId: string; pinId: string } | null) => void;
  selectedHoleId: string | null;
  onUpdatePinColor?: (deviceId: string, pinId: string, color: string) => void;
}

export const ArduinoUnoVisualizer: React.FC<ArduinoUnoVisualizerProps> = ({
  devices,
  onAddDevice,
  onRemoveDevice,
  onMapPin,
  selectedPin,
  setSelectedPin,
  selectedHoleId,
  onUpdatePinColor,
}) => {
  // Find if there is an active Arduino Uno R3 in the project
  const arduino = devices.find(
    (d) =>
      d.name.toLowerCase().includes('arduino uno') ||
      (d.type === 'microcontroller' && d.name.includes('Arduino'))
  );

  const [activeColorPickerPinId, setActiveColorPickerPinId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const resetView = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-interactive="true"]') || target.closest('button')) {
        return;
      }
      setIsDragging(true);
      dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.current.x);
      setPanY(e.clientY - dragStart.current.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive="true"]') || target.closest('button')) {
      return;
    }
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - panX, y: touch.clientY - panY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setPanX(touch.clientX - dragStart.current.x);
      setPanY(touch.clientY - dragStart.current.y);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleQuickAddArduino = () => {
    // Exact structure matching POPULAR_TEMPLATES.arduino_uno
    const newArduino: Device = {
      id: `dev-arduino-${Date.now()}`,
      name: 'Arduino Uno R3',
      type: 'microcontroller',
      color: '#00979C',
      pins: [
        { id: `pin-0-${Date.now()}`, name: '5V', type: 'power_vcc', holeId: null },
        { id: `pin-1-${Date.now()}`, name: '3.3V', type: 'power_vcc', holeId: null },
        { id: `pin-2-${Date.now()}`, name: 'GND 1', type: 'power_gnd', holeId: null },
        { id: `pin-3-${Date.now()}`, name: 'GND 2', type: 'power_gnd', holeId: null },
        { id: `pin-4-${Date.now()}`, name: 'GND 3', type: 'power_gnd', holeId: null },
        { id: `pin-5-${Date.now()}`, name: 'VIN', type: 'power_vcc', holeId: null },
        { id: `pin-6-${Date.now()}`, name: 'A0', type: 'analog', holeId: null },
        { id: `pin-7-${Date.now()}`, name: 'A1', type: 'analog', holeId: null },
        { id: `pin-8-${Date.now()}`, name: 'A2', type: 'analog', holeId: null },
        { id: `pin-9-${Date.now()}`, name: 'A3', type: 'analog', holeId: null },
        { id: `pin-10-${Date.now()}`, name: 'A4 (SDA)', type: 'analog', holeId: null },
        { id: `pin-11-${Date.now()}`, name: 'A5 (SCL)', type: 'analog', holeId: null },
        { id: `pin-12-${Date.now()}`, name: 'D0 (RX)', type: 'digital', holeId: null },
        { id: `pin-13-${Date.now()}`, name: 'D1 (TX)', type: 'digital', holeId: null },
        { id: `pin-14-${Date.now()}`, name: 'D2', type: 'digital', holeId: null },
        { id: `pin-15-${Date.now()}`, name: 'D3 (~PWM)', type: 'digital', holeId: null },
        { id: `pin-16-${Date.now()}`, name: 'D4', type: 'digital', holeId: null },
        { id: `pin-17-${Date.now()}`, name: 'D5 (~PWM)', type: 'digital', holeId: null },
        { id: `pin-18-${Date.now()}`, name: 'D6 (~PWM)', type: 'digital', holeId: null },
        { id: `pin-19-${Date.now()}`, name: 'D7', type: 'digital', holeId: null },
        { id: `pin-20-${Date.now()}`, name: 'D8', type: 'digital', holeId: null },
        { id: `pin-21-${Date.now()}`, name: 'D9 (~PWM)', type: 'digital', holeId: null },
        { id: `pin-22-${Date.now()}`, name: 'D10 (~PWM)', type: 'digital', holeId: null },
        { id: `pin-23-${Date.now()}`, name: 'D11 (~PWM)', type: 'digital', holeId: null },
        { id: `pin-24-${Date.now()}`, name: 'D12', type: 'digital', holeId: null },
        { id: `pin-25-${Date.now()}`, name: 'D13 (LED)', type: 'digital', holeId: null },
        { id: `pin-26-${Date.now()}`, name: 'AREF', type: 'other', holeId: null },
        { id: `pin-27-${Date.now()}`, name: 'RESET', type: 'other', holeId: null },
      ],
      notes: 'Placa microcontroladora clássica para desenvolvimento DIY.',
    };
    onAddDevice(newArduino);
  };

  // Helper to format hole display label
  const getHoleDisplayLabel = (holeId: string | null) => {
    if (!holeId) return '';
    if (holeId.startsWith('top-outer-')) return `GND Superior (Col ${holeId.replace('top-outer-', '')})`;
    if (holeId.startsWith('top-inner-')) return `VCC Superior (Col ${holeId.replace('top-inner-', '')})`;
    if (holeId.startsWith('bottom-inner-')) return `VCC Inferior (Col ${holeId.replace('bottom-inner-', '')})`;
    if (holeId.startsWith('bottom-outer-')) return `GND Inferior (Col ${holeId.replace('bottom-outer-', '')})`;
    return `Protoboard ${holeId.toUpperCase()}`;
  };

  if (!arduino) {
    return (
      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all hover:border-indigo-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-display">
              Visualizar Arduino Uno R3 Interativo
              <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-1.5 py-0.5 rounded-full">NOVO</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg mt-1">
              Gostaria de adicionar uma placa **Arduino Uno R3 (SMD Blue Clone)** virtual ao laboratório? Você poderá ver todas as portas, pinagens com código de cores e conectar cabos Dupont diretamente na protoboard clicando neles!
            </p>
          </div>
        </div>
        <button
          onClick={handleQuickAddArduino}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0 hover:scale-102 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          Adicionar Arduino Uno
        </button>
      </div>
    );
  }

  // Define Arduino visual pins coordinate list to place on SVG Board
  // Matching the layout of the user's specific SMD blue board with Type-C
  const visualPins = [
    // Top Row: Digital Header (Index order from left to right)
    { name: 'A5 (SCL)', x: 236, y: 40, type: 'analog', labelPos: 'bottom', displayName: 'SCL' },
    { name: 'A4 (SDA)', x: 254, y: 40, type: 'analog', labelPos: 'bottom', displayName: 'SDA' },
    { name: 'AREF', x: 272, y: 40, type: 'other', labelPos: 'bottom', displayName: 'AREF' },
    { name: 'GND 3', x: 290, y: 40, type: 'power_gnd', labelPos: 'bottom', displayName: 'GND' },
    { name: 'D13 (LED)', x: 308, y: 40, type: 'digital', labelPos: 'bottom', displayName: '13', isL: true },
    { name: 'D12', x: 326, y: 40, type: 'digital', labelPos: 'bottom', displayName: '12' },
    { name: 'D11 (~PWM)', x: 344, y: 40, type: 'digital', labelPos: 'bottom', displayName: '11' },
    { name: 'D10 (~PWM)', x: 362, y: 40, type: 'digital', labelPos: 'bottom', displayName: '10' },
    { name: 'D9 (~PWM)', x: 380, y: 40, type: 'digital', labelPos: 'bottom', displayName: '9' },
    { name: 'D8', x: 398, y: 40, type: 'digital', labelPos: 'bottom', displayName: '8' },
    // (Small physical gap in board)
    { name: 'D7', x: 426, y: 40, type: 'digital', labelPos: 'bottom', displayName: '7' },
    { name: 'D6 (~PWM)', x: 444, y: 40, type: 'digital', labelPos: 'bottom', displayName: '6' },
    { name: 'D5 (~PWM)', x: 462, y: 40, type: 'digital', labelPos: 'bottom', displayName: '5' },
    { name: 'D4', x: 480, y: 40, type: 'digital', labelPos: 'bottom', displayName: '4' },
    { name: 'D3 (~PWM)', x: 498, y: 40, type: 'digital', labelPos: 'bottom', displayName: '3' },
    { name: 'D2', x: 516, y: 40, type: 'digital', labelPos: 'bottom', displayName: '2' },
    { name: 'D1 (TX)', x: 534, y: 40, type: 'digital', labelPos: 'bottom', displayName: 'TX 1' },
    { name: 'D0 (RX)', x: 552, y: 40, type: 'digital', labelPos: 'bottom', displayName: 'RX 0' },

    // Bottom Left Row: Power Header (left to right) matching the physical board
    { name: 'NC', x: 224, y: 245, type: 'other', labelPos: 'top', displayName: '' },
    { name: '5V_AUX', x: 242, y: 245, type: 'power_vcc', labelPos: 'top', displayName: '5V' },
    { name: 'RESET', x: 260, y: 245, type: 'other', labelPos: 'top', displayName: 'RES' },
    { name: '3.3V', x: 278, y: 245, type: 'power_vcc', labelPos: 'top', displayName: '3.3V' },
    { name: '5V', x: 296, y: 245, type: 'power_vcc', labelPos: 'top', displayName: '5V' },
    { name: 'GND 1', x: 314, y: 245, type: 'power_gnd', labelPos: 'top', displayName: 'GND' },
    { name: 'GND 2', x: 332, y: 245, type: 'power_gnd', labelPos: 'top', displayName: 'GND' },
    { name: 'VIN', x: 350, y: 245, type: 'power_vcc', labelPos: 'top', displayName: 'VIN' },

    // Bottom Right Row: Analog Header (left to right)
    { name: 'A0', x: 394, y: 245, type: 'analog', labelPos: 'top', displayName: 'A0' },
    { name: 'A1', x: 412, y: 245, type: 'analog', labelPos: 'top', displayName: 'A1' },
    { name: 'A2', x: 430, y: 245, type: 'analog', labelPos: 'top', displayName: 'A2' },
    { name: 'A3', x: 448, y: 245, type: 'analog', labelPos: 'top', displayName: 'A3' },
    { name: 'A4 (SDA)', x: 466, y: 245, type: 'analog', labelPos: 'top', displayName: 'A4' },
    { name: 'A5 (SCL)', x: 484, y: 245, type: 'analog', labelPos: 'top', displayName: 'A5' },
  ];

  // Map our template names/types to real active devices in state
  const pinsWithState = visualPins.map((vp) => {
    const targetName = vp.name === '5V_AUX' ? '5V' : vp.name;
    const activePin = arduino.pins.find((p) => p.name === targetName);
    return {
      ...vp,
      pinId: activePin?.id || '',
      holeId: activePin?.holeId || null,
      mapped: !!activePin?.holeId,
      color: activePin?.color || '#10B981',
    };
  });

  const activeSelectedPinInfo = selectedPin?.deviceId === arduino.id 
    ? arduino.pins.find(p => p.id === selectedPin.pinId) 
    : null;

  const handlePinClick = (pinName: string, pinId: string) => {
    if (!pinId) return;

    if (selectedPin?.deviceId === arduino.id && selectedPin?.pinId === pinId) {
      // Deselect if already selected
      setSelectedPin(null);
    } else {
      // Set as active selection to be mapped on Breadboard click
      setSelectedPin({ deviceId: arduino.id, pinId });
    }
  };

  const handleDisconnectPin = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation();
    onMapPin(arduino.id, pinId, null);
    if (selectedPin?.pinId === pinId) {
      setSelectedPin(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      {/* Title Bar with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
            <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2 uppercase tracking-wide">
              Módulo Ativo: Arduino Uno R3 (SMD Type-C)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-none mt-1 font-medium">
            Desenvolvido por <a href="http://www.runeprojects.com.br/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Rune Projects</a>. Clique em um pino para selecionar e mapear na protoboard.
          </p>
        </div>
        
        <button
          onClick={() => onRemoveDevice(arduino.id)}
          className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 border border-red-500/20 rounded-lg font-semibold transition-all cursor-pointer self-start sm:self-center"
        >
          Remover Placa do Projeto
        </button>
      </div>

      {/* Floating Mapping HUD indicator */}
      <AnimatePresence>
        {activeSelectedPinInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs gap-3"
          >
            <div className="flex items-center gap-2.5 text-amber-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                Pino <strong className="text-amber-200 font-bold bg-amber-950 px-1.5 py-0.5 rounded font-mono">{activeSelectedPinInfo.name}</strong> selecionado! Agora clique em qualquer furo da <strong>Protoboard MB-102</strong> para conectá-lo.
              </span>
            </div>
            <button
              onClick={() => setSelectedPin(null)}
              className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom / Pan Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 rounded-t-2xl border border-b-0 border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-300">Esquema Interativo Arduino Uno R3</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.15))}
            className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
            title="Afastar"
          >
            -
          </button>
          <span className="text-xs font-mono text-slate-400 w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2.5, zoom + 0.15))}
            className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
            title="Aproximar"
          >
            +
          </button>
          <button
            onClick={resetView}
            className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
            title="Resetar Zoom"
          >
            Resetar
          </button>
        </div>
      </div>

      {/* Interactive Board Board Container */}
      <div 
        className={`w-full bg-slate-950/60 border border-slate-800 rounded-b-2xl p-4 overflow-hidden relative flex flex-col items-center justify-center cursor-${isDragging ? 'grabbing' : 'grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Real-time interactive board schematic SVG matching the photo */}
        <svg
          viewBox="0 0 620 280"
          className="w-full max-w-[620px] h-auto select-none overflow-visible"
        >
          {/* DEFINITIONS FOR GRADIENTS AND FILTERS */}
          <defs>
            {/* PCB drop-shadow */}
            <filter id="shadow" x="-5%" y="-5%" width="115%" height="115%">
              <feDropShadow dx="2" dy="5" stdDeviation="6" floodColor="#020617" floodOpacity="0.8" />
            </filter>
            {/* Header socket drop-shadow */}
            <filter id="socketShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
            </filter>
            {/* PCB Copper track gradients */}
            <linearGradient id="goldCopper" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b45309" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.05" />
            </linearGradient>
            {/* Silver metal gradient for Type-C and components */}
            <linearGradient id="silverMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            {/* Darker metallic plastic */}
            <linearGradient id="headerPlastic" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* ZOOM AND PAN WRAPPER GROUP */}
          <g transform={`translate(${panX}, ${panY}) scale(${zoom})`} className="transition-transform duration-75" style={{ transformOrigin: 'center' }}>

          {/* MAIN BOARD GROUP WITH SHADOW */}
          <g filter="url(#shadow)">
            {/* Realistic Royal Blue PCB Board Base */}
            <rect
              x="15"
              y="15"
              width="590"
              height="250"
              rx="18"
              ry="18"
              fill="#104297" /* Matches the clone blue perfectly */
              stroke="#072d6e"
              strokeWidth="2"
            />
            {/* Golden board trace routing path */}
            <rect
              x="20"
              y="20"
              width="580"
              height="240"
              rx="15"
              ry="15"
              fill="none"
              stroke="#0f3473"
              strokeWidth="1.5"
              strokeDasharray="12 6"
            />
          </g>

          {/* CIRCUIT ROUTING PATHS (GOLDEN TRACES FOR HIGH REALISM) */}
          <g opacity="0.6">
            <path d="M 50 140 L 150 140 M 110 90 L 110 210" fill="none" stroke="#2b62be" strokeWidth="4" />
            <path d="M 230 90 L 310 170" fill="none" stroke="#2b62be" strokeWidth="1.5" />
            <path d="M 330 180 L 410 100" fill="none" stroke="#2b62be" strokeWidth="1.5" />
            <circle cx="370" cy="140" r="24" fill="none" stroke="#2b62be" strokeWidth="1" strokeDasharray="3 3" />
          </g>

          {/* SILKSCREEN BRANDINGS / LABELS */}
          <g>
            {/* Elegant Small "UNO" branding placed in the bottom right corner to avoid overlaps */}
            <text x="545" y="212" fill="#FFFFFF" fontFamily="sans-serif" fontSize="24" fontWeight="900" opacity="0.8" letterSpacing="1" textAnchor="middle">UNO</text>
            <text x="545" y="190" fill="#FFFFFF" fontFamily="sans-serif" fontSize="8" fontWeight="bold" opacity="0.7" textAnchor="middle">Y1</text>
            
            {/* Logo text "RuneBoard" - Perfectly repositioned to prevent overlaps */}
            <text x="55" y="125" fill="#FFFFFF" fontFamily="sans-serif" fontSize="14" fontWeight="bold" letterSpacing="0.5">RuneBoard</text>
            <text x="55" y="138" fill="#d97706" fontFamily="sans-serif" fontSize="7" fontWeight="bold" letterSpacing="0.5">www.runeprojects.com.br</text>
            <text x="55" y="149" fill="#cbd5e1" fontFamily="sans-serif" fontSize="6.5" fontWeight="medium" opacity="0.7">SIMULADOR &amp; ORGANIZADOR</text>

            {/* Header category text labels and white lines on PCB */}
            {/* Top row DIGITAL category */}
            <line x1="226" y1="86" x2="562" y2="86" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.8" />
            <text x="394" y="98" fill="#FFFFFF" fontFamily="sans-serif" fontSize="8" fontWeight="bold" letterSpacing="0.5" textAnchor="middle">DIGITAL (PWM ~)</text>

            {/* Bottom left POWER category */}
            <line x1="217" y1="200" x2="357" y2="200" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.8" />
            <text x="287" y="192" fill="#FFFFFF" fontFamily="sans-serif" fontSize="8" fontWeight="bold" letterSpacing="0.5" textAnchor="middle">POWER</text>

            {/* Bottom right ANALOG IN category */}
            <line x1="384" y1="200" x2="494" y2="200" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.8" />
            <text x="439" y="192" fill="#FFFFFF" fontFamily="sans-serif" fontSize="8" fontWeight="bold" letterSpacing="0.5" textAnchor="middle">ANALOG IN</text>

          </g>

          {/* HARDWARE COMPONENT PLACEMENT (CORRESPONDS TO THE BLUE CLONE IN PHOTO) */}
          
          {/* 1. USB Type-C Connector (Compact silver metal at left edge) */}
          <g>
            {/* Metallic casing extending slightly off the left boundary */}
            <rect x="5" y="60" width="38" height="42" rx="6" fill="url(#silverMetal)" stroke="#64748b" strokeWidth="1" />
            <rect x="8" y="65" width="32" height="32" rx="4" fill="#0f172a" />
            {/* Core Type-C inner golden contact strip */}
            <rect x="14" y="74" width="20" height="14" rx="2" fill="url(#silverMetal)" stroke="#d97706" strokeWidth="0.5" />
            {/* Outer support tags */}
            <rect x="18" y="58" width="8" height="3" fill="#475569" />
            <rect x="18" y="101" width="8" height="3" fill="#475569" />
          </g>

          {/* 2. DC Power Jack (Robust black barrel adapter at bottom-left) */}
          <g>
            <rect x="5" y="180" width="60" height="42" rx="4" fill="#09090b" stroke="#1e293b" strokeWidth="1.5" />
            {/* Inner socket core */}
            <rect x="5" y="191" width="30" height="20" rx="1" fill="#18181b" />
            <circle cx="20" cy="201" r="5" fill="#475569" />
            <circle cx="20" cy="201" r="2" fill="#020617" />
            {/* Metal solder pins details */}
            <rect x="40" y="177" width="10" height="4" fill="#64748b" />
          </g>

           {/* 3. Two SMD Aluminum Electrolytic Capacitors (Silver canisters, marked "47 35V VT") */}
          {/* Capacitor 1 */}
          <g transform="translate(86, 175)">
            <circle cx="12" cy="12" r="12" fill="url(#silverMetal)" stroke="#64748b" strokeWidth="0.5" />
            {/* Polarity black crescent marking */}
            <path d="M 0 12 A 12 12 0 0 1 24 12 Z" fill="#18181b" />
            {/* Silver terminal contacts underneath */}
            <rect x="1" y="-1" width="22" height="3" fill="#cbd5e1" rx="1" />
            <text x="12" y="10" fill="#cbd5e1" fontFamily="monospace" fontSize="5" fontWeight="bold" textAnchor="middle" transform="rotate(90 12 10)">47</text>
            <text x="12" y="17" fill="#cbd5e1" fontFamily="monospace" fontSize="5" fontWeight="bold" textAnchor="middle" transform="rotate(90 12 17)">35V</text>
          </g>
          {/* Capacitor 2 */}
          <g transform="translate(86, 212)">
            <circle cx="12" cy="12" r="12" fill="url(#silverMetal)" stroke="#64748b" strokeWidth="0.5" />
            {/* Polarity black crescent marking */}
            <path d="M 0 12 A 12 12 0 0 1 24 12 Z" fill="#18181b" />
            <text x="12" y="10" fill="#cbd5e1" fontFamily="monospace" fontSize="5" fontWeight="bold" textAnchor="middle" transform="rotate(90 12 10)">47</text>
            <text x="12" y="17" fill="#cbd5e1" fontFamily="monospace" fontSize="5" fontWeight="bold" textAnchor="middle" transform="rotate(90 12 17)">35V</text>
          </g>

          {/* 4. ATmega328P Main MCU (Black SMD QFP square package in center) */}
          <g transform="translate(300, 120)">
            {/* Square chip body */}
            <rect x="0" y="0" width="46" height="46" rx="4" fill="#1c1917" stroke="#292524" strokeWidth="1" />
            {/* Corner pin 1 indicator dot */}
            <circle cx="7" cy="7" r="2" fill="#44403c" />
            
            {/* ATMEGA328P Chip Text branding */}
            <text x="23" y="20" fill="#a8a29e" fontFamily="monospace" fontSize="7.5" fontWeight="bold" textAnchor="middle">Atmel</text>
            <text x="23" y="30" fill="#78716c" fontFamily="monospace" fontSize="6.5" fontWeight="bold" textAnchor="middle">MEGA328P</text>
            <text x="23" y="38" fill="#57534e" fontFamily="monospace" fontSize="5.5" fontWeight="bold" textAnchor="middle">U-KR</text>

            {/* 32 Silver pin legs extending from all 4 sides */}
            {Array.from({ length: 8 }).map((_, i) => {
              const offset = 6 + i * 5;
              return (
                <g key={i}>
                  {/* Top legs */}
                  <rect x={offset} y="-4" width="2" height="4.5" fill="#94a3b8" />
                  {/* Bottom legs */}
                  <rect x={offset} y="45.5" width="2" height="4.5" fill="#94a3b8" />
                  {/* Left legs */}
                  <rect x="-4" y={offset} width="4.5" height="2" fill="#94a3b8" />
                  {/* Right legs */}
                  <rect x="45.5" y={offset} width="4.5" height="2" fill="#94a3b8" />
                </g>
              );
            })}
          </g>

          {/* 5. USB CH340G Interface Chip (Rectangular black SOIC-16 next to crystal) */}
          <g transform="translate(165, 115)">
            <rect x="0" y="0" width="34" height="20" rx="1.5" fill="#18181b" stroke="#27272a" strokeWidth="1" />
            <circle cx="5" cy="5" r="1" fill="#09090b" />
            <text x="17" y="12" fill="#52525b" fontFamily="monospace" fontSize="6.5" fontWeight="bold" textAnchor="middle">CH340G</text>
            {/* Pins on top and bottom */}
            {Array.from({ length: 8 }).map((_, i) => (
              <g key={i}>
                <rect x={3 + i * 4} y="-3.5" width="1.5" height="4" fill="#94a3b8" />
                <rect x={3 + i * 4} y="19.5" width="1.5" height="4" fill="#94a3b8" />
              </g>
            ))}
          </g>

          {/* 6. Main 16.000 MHz Crystal Oscillator (Vertical silver metal can, perfectly placed above Analog In text) */}
          <g transform="translate(372, 105)">
            {/* Silver metallic rounded container rotated 90 degrees */}
            <rect x="0" y="0" width="14" height="32" rx="7" fill="url(#silverMetal)" stroke="#64748b" strokeWidth="0.75" />
            <rect x="2" y="3" width="10" height="26" rx="4" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
            {/* 16.000 text rotated vertically to align with the canister */}
            <text x="7" y="16" fill="#475569" fontFamily="monospace" fontSize="6.5" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 7 16)">16.000</text>
            {/* Top and Bottom metal solder pads */}
            <line x1="7" y1="0" x2="7" y2="-2" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="7" y1="32" x2="7" y2="34" stroke="#94a3b8" strokeWidth="1.5" />
          </g>

          {/* 7. Reset Tactile Button (Red/pink plunger on top-left) */}
          <g transform="translate(50, 32)">
            {/* Tactile body casing */}
            <rect x="0" y="0" width="22" height="22" rx="3" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            {/* Metallic retention bracket */}
            <rect x="2" y="2" width="18" height="18" rx="2" fill="none" stroke="#71717a" strokeWidth="1" />
            {/* Pinkish/Red circular push plunger */}
            <circle cx="11" cy="11" r="5" fill="#f43f5e" />
            <circle cx="11" cy="11" r="3" fill="#e11d48" />
            {/* Silver terminal contacts on sides */}
            <rect x="-3" y="4" width="3" height="4" fill="#94a3b8" />
            <rect x="-3" y="14" width="3" height="4" fill="#94a3b8" />
            <rect x="22" y="4" width="3" height="4" fill="#94a3b8" />
            <rect x="22" y="14" width="3" height="4" fill="#94a3b8" />
          </g>

          {/* 8. Onboard SMD Indicator LEDs (Glowing ambient status) */}
          {/* Power LED 'ON' */}
          <g transform="translate(215, 80)">
            <rect x="0" y="0" width="5" height="7" fill="#27272a" rx="1" />
            <rect x="1" y="1" width="3" height="5" fill="#eab308" filter="drop-shadow(0 0 2px #eab308)" />
            <text x="8" y="6" fill="#cbd5e1" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold">ON</text>
          </g>
          {/* Pin 13 LED 'L' */}
          <g transform="translate(215, 95)">
            <rect x="0" y="0" width="5" height="7" fill="#27272a" rx="1" />
            <rect x="1" y="1" width="3" height="5" fill="#3b82f6" opacity="0.6" />
            <text x="8" y="6" fill="#cbd5e1" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold">L</text>
          </g>
          {/* TX LED */}
          <g transform="translate(215, 110)">
            <rect x="0" y="0" width="5" height="7" fill="#27272a" rx="1" />
            <rect x="1" y="1" width="3" height="5" fill="#22c55e" opacity="0.6" />
            <text x="8" y="6" fill="#cbd5e1" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold">TX</text>
          </g>
          {/* RX LED */}
          <g transform="translate(215, 125)">
            <rect x="0" y="0" width="5" height="7" fill="#27272a" rx="1" />
            <rect x="1" y="1" width="3" height="5" fill="#22c55e" opacity="0.6" />
            <text x="8" y="6" fill="#cbd5e1" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold">RX</text>
          </g>


          {/* 9. ISCP 2x3 Male Pin Header Block (Extremely detailed, realistic 3D appearance) */}
          <g transform="translate(555, 125)">
            {/* White silkscreen outer border */}
            <rect x="-3" y="-3" width="18" height="30" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.8" />
            {/* Solid black/dark plastic pin base blocks */}
            <rect x="0" y="0" width="12" height="24" rx="1.5" fill="#1e293b" stroke="#09090b" strokeWidth="0.75" />
            
            {/* Individual row divisions */}
            <line x1="0" y1="8" x2="12" y2="8" stroke="#09090b" strokeWidth="0.5" />
            <line x1="0" y1="16" x2="12" y2="16" stroke="#09090b" strokeWidth="0.5" />

            {/* Six gold pins with metallic highlights */}
            {Array.from({ length: 3 }).map((_, row) => (
              <g key={row} transform={`translate(0, ${row * 8})`}>
                {/* Left Pin */}
                {/* Gold collar */}
                <rect x="1.5" y="2.5" width="3" height="3" rx="0.5" fill="#ca8a04" />
                {/* Pin top center highlight */}
                <circle cx="3" cy="4" r="1.2" fill="#facc15" />
                <circle cx="2.6" cy="3.6" r="0.4" fill="#FFFFFF" />

                {/* Right Pin */}
                {/* Gold collar */}
                <rect x="7.5" y="2.5" width="3" height="3" rx="0.5" fill="#ca8a04" />
                {/* Pin top center highlight */}
                <circle cx="9" cy="4" r="1.2" fill="#facc15" />
                <circle cx="8.6" cy="3.6" r="0.4" fill="#FFFFFF" />
              </g>
            ))}
            {/* "ISCP" Label beautifully placed above */}
            <text x="6" y="-6" fill="#FFFFFF" fontFamily="sans-serif" fontSize="7" fontWeight="bold" textAnchor="middle" opacity="0.9" letterSpacing="0.5">ISCP</text>
          </g>

          {/* Debug Interface Solder Grid and Labels (Unique characteristic of CH340G Arduino Clone) */}
          <g>
            {/* White Silkscreen labels */}
            <text x="526" y="164.5" fill="#FFFFFF" fontFamily="monospace" fontSize="6.2" fontWeight="bold" textAnchor="end" opacity="0.9" letterSpacing="0.1">RX TX 5V GND</text>
            <text x="526" y="173.1" fill="#FFFFFF" fontFamily="monospace" fontSize="6.2" fontWeight="bold" textAnchor="end" opacity="0.9" letterSpacing="0.1">SCL SDA 5V GND</text>
            <text x="526" y="181.7" fill="#FFFFFF" fontFamily="monospace" fontSize="6.2" fontWeight="bold" textAnchor="end" opacity="0.9" letterSpacing="0.1">3.3V3.3V GND GND</text>

            {/* Grid Container */}
            <rect x="532" y="158" width="36" height="26" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.8" />
            
            {/* Grid Lines */}
            <line x1="532" y1="166.6" x2="568" y2="166.6" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.8" />
            <line x1="532" y1="175.3" x2="568" y2="175.3" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.8" />
            <line x1="541" y1="158" x2="541" y2="184" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.8" />
            <line x1="550" y1="158" x2="550" y2="184" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.8" />
            <line x1="559" y1="158" x2="559" y2="184" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.8" />

            {/* 12 Solder Pads with Holes */}
            {Array.from({ length: 3 }).map((_, r) => {
              const yVal = 162.3 + r * 8.6;
              return Array.from({ length: 4 }).map((_, c) => {
                const xVal = 536.5 + c * 9;
                return (
                  <g key={`debug-hole-${r}-${c}`}>
                    <circle cx={xVal} cy={yVal} r="1.8" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
                    <circle cx={xVal} cy={yVal} r="0.7" fill="#0f172a" />
                  </g>
                );
              });
            })}
          </g>

          {/* 10. REALISTIC PIN HEADERS (WITH PARALLEL ROWS OF SOLDER HOLES LIKE CLONE) */}

          {/* Solder Holes next to Top headers (Silver circles with inner black) */}
          {visualPins.filter(p => p.labelPos === 'bottom').map((pin) => (
            <g key={`hole-top-${pin.name}-${pin.x}-${pin.y}`}>
              {/* Gold/silver solder pad next to socket */}
              <circle cx={pin.x} cy={pin.y + 14} r="3" fill="none" stroke="#eab308" strokeWidth="0.75" />
              <circle cx={pin.x} cy={pin.y + 14} r="1" fill="#0f172a" />
            </g>
          ))}

          {/* Solder Holes next to Bottom Power/Analog headers */}
          {visualPins.filter(p => p.labelPos === 'top').map((pin) => (
            <g key={`hole-bottom-${pin.name}-${pin.x}-${pin.y}`}>
              {/* Gold/silver solder pad next to socket */}
              <circle cx={pin.x} cy={pin.y - 14} r="3" fill="none" stroke="#eab308" strokeWidth="0.75" />
              <circle cx={pin.x} cy={pin.y - 14} r="1" fill="#0f172a" />
            </g>
          ))}

          {/* Top Row Header Plastic Housing (Digital pins) */}
          <rect
            x="226"
            y="30"
            width="336"
            height="18"
            rx="2"
            fill="url(#headerPlastic)"
            stroke="#1e293b"
            strokeWidth="1.5"
            filter="url(#socketShadow)"
          />

          {/* Bottom Left Power Header Plastic Housing */}
          <rect
            x="215"
            y="240"
            width="144"
            height="18"
            rx="2"
            fill="url(#headerPlastic)"
            stroke="#1e293b"
            strokeWidth="1.5"
            filter="url(#socketShadow)"
          />

          {/* Bottom Right Analog Header Plastic Housing */}
          <rect
            x="384"
            y="240"
            width="112"
            height="18"
            rx="2"
            fill="url(#headerPlastic)"
            stroke="#1e293b"
            strokeWidth="1.5"
            filter="url(#socketShadow)"
          />


          {/* RENDERING INTERACTIVE SOCKET HOLES (EXACTLY MATCHING CLONE) */}
          {pinsWithState.map((pin) => {
            const isSelected = selectedPin?.deviceId === arduino.id && selectedPin?.pinId === pin.pinId;
            
            // Core style colors
            let socketColor = '#020617'; // Inside hole deep dark
            let ringColor = isSelected ? '#3b82f6' : '#475569'; // Blue highlight if selected
            let ringWidth = isSelected ? '2' : '1';

            if (pin.mapped) {
              socketColor = pin.color;
              ringColor = pin.color;
            }

            return (
              <g 
                key={`${pin.name}-${pin.x}-${pin.y}`}
                className="group/pin cursor-pointer"
                data-interactive="true"
                onClick={() => handlePinClick(pin.name, pin.pinId)}
              >
                {/* Header socket black square hole */}
                <rect
                  x={pin.x - 6.5}
                  y={pin.y - 6.5}
                  width="13"
                  height="13"
                  rx="1.5"
                  fill={socketColor}
                  stroke={ringColor}
                  strokeWidth={ringWidth}
                  className="transition-all duration-200 group-hover/pin:stroke-blue-400 group-hover/pin:fill-blue-950/40"
                />

                {/* Inner silver metal connector leaf inside socket hole */}
                <rect
                  x={pin.x - 2.5}
                  y={pin.y - 2.5}
                  width="5"
                  height="5"
                  rx="0.5"
                  fill={pin.mapped ? '#ffffff' : '#94a3b8'}
                  className="transition-all duration-200 group-hover/pin:fill-blue-300"
                />

                {/* Pulsing glow indicator for mapped pins */}
                {pin.mapped && (
                  <circle
                     cx={pin.x}
                     cy={pin.y}
                     r="4"
                     fill={pin.color}
                     stroke="#FFFFFF"
                     strokeWidth="1"
                     filter={`drop-shadow(0 0 3px ${pin.color})`}
                  />
                )}

                {/* Outer socket name text matching the photo's fine lettering, rotated vertically with generous spacing to prevent overlaps */}
                <text
                  x={pin.x}
                  y={pin.labelPos === 'bottom' ? pin.y + 26 : pin.y - 26}
                  transform={pin.labelPos === 'bottom' 
                    ? `rotate(90, ${pin.x}, ${pin.y + 26})` 
                    : `rotate(-90, ${pin.x}, ${pin.y - 26})`
                  }
                  fill={pin.mapped ? pin.color : isSelected ? '#3b82f6' : '#cbd5e1'}
                  fontFamily="monospace"
                  fontSize="6.5"
                  fontWeight="bold"
                  textAnchor="start"
                  dominantBaseline="middle"
                  className="transition-colors group-hover/pin:fill-blue-300"
                >
                  {pin.displayName}
                </text>

                {/* Interactive Tooltip HUD details */}
                <g className="opacity-0 group-hover/pin:opacity-100 transition-opacity duration-150 pointer-events-none">
                  {/* Tooltip board container */}
                  <rect
                    x={pin.x - 55}
                    y={pin.labelPos === 'bottom' ? pin.y + 54 : pin.y - 72}
                    width="110"
                    height="18"
                    rx="4"
                    fill="#020617"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x={pin.x}
                    y={pin.labelPos === 'bottom' ? pin.y + 66 : pin.y - 60}
                    fill="#FFFFFF"
                    fontFamily="sans-serif"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {pin.mapped ? `${pin.name} ➔ ${pin.holeId?.toUpperCase()}` : `${pin.name} (Livre)`}
                  </text>
                </g>
              </g>
            );
          })}
          </g>
        </svg>

        {/* Legend block for the interactive Arduino */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-slate-800/60 w-full text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#020617] border border-[#475569]" />
            <span>Porta Livre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-950 border border-blue-400" />
            <span>Porta Selecionada (Clique para Conectar)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
            <span>Cabo Conectado à Protoboard</span>
          </div>
        </div>
      </div>

      {/* Connection table helper - show quick review of pin mappings */}
      <div className="bg-slate-950/25 border border-slate-800/50 rounded-xl p-3.5 mt-1 text-left">
        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5 text-indigo-400" />
          Mapeamento Ativo de Portas do Arduino
        </h4>
        
        {pinsWithState.filter(p => p.mapped).length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">
            Nenhuma porta do Arduino está ligada à protoboard ainda. Clique em uma porta na placa acima e depois selecione o furo na protoboard para criar um cabo Dupont virtual de ligação!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {pinsWithState.filter(p => p.mapped).map((pin) => (
              <div 
                key={`${pin.name}-${pin.x}-${pin.y}`}
                className="flex flex-col text-[11px] bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg group hover:border-slate-700/60 transition-colors gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    {/* Clickable color dot to change color */}
                    <button
                      onClick={() => setActiveColorPickerPinId(activeColorPickerPinId === pin.pinId ? null : pin.pinId)}
                      className="w-3 h-3 rounded-full shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-all relative border border-white/20"
                      style={{ backgroundColor: pin.color }}
                      title="Mudar cor do cabo"
                    >
                      <span className="absolute inset-0 rounded-full border border-black/10 hover:border-white/20" />
                    </button>
                    <span className="font-bold text-slate-200 font-mono text-[10px]">{pin.name}</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-indigo-400 font-mono font-bold truncate">{getHoleDisplayLabel(pin.holeId)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setActiveColorPickerPinId(activeColorPickerPinId === pin.pinId ? null : pin.pinId)}
                      className="text-[9.5px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                      title="Mudar cor do cabo"
                    >
                      Cor
                    </button>
                    <button
                      onClick={(e) => handleDisconnectPin(e, pin.pinId)}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                      title="Desconectar pino"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline color palette picker expander */}
                {activeColorPickerPinId === pin.pinId && (
                  <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-800/60 animate-fadeIn">
                    <div className="flex flex-wrap gap-1">
                      {WIRE_COLORS.map((col) => (
                        <button
                          key={col.value}
                          onClick={() => {
                            if (onUpdatePinColor) {
                              onUpdatePinColor(arduino.id, pin.pinId, col.value);
                            }
                            setActiveColorPickerPinId(null);
                          }}
                          className={`w-4.5 h-4.5 rounded-full border transition-all cursor-pointer hover:scale-115 relative ${pin.color === col.value ? 'border-indigo-400 scale-110 shadow-md shadow-indigo-500/10' : 'border-slate-800'}`}
                          style={{ backgroundColor: col.value }}
                          title={col.name}
                        >
                          {pin.color === col.value && (
                            <span className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
