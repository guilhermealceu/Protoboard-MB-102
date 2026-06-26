import React, { useState, useRef, useEffect } from 'react';
import { Hole, Wire, Device } from '../types';
import { generateHoles, getHoleNetId } from '../utils/breadboard';

interface BreadboardSVGProps {
  wires: Wire[];
  devices: Device[];
  onHoleClick: (holeId: string) => void;
  selectedHoleId: string | null;
  hoveredHoleId: string | null;
  setHoveredHoleId: (holeId: string | null) => void;
  onWireClick: (wire: Wire) => void;
  selectedWireId: string | null;
  highlightedComponentId: string | null;
  holeToComponentMap: Map<string, string>;
}

// Coordinate mappings
export function getHoleCoords(holeId: string) {
  const colSpacing = 22; // spacing between columns
  const rowSpacing = 16; // spacing between rows
  const startX = 60;     // horizontal offset
  
  // Terminal upper: a to e (Rows A-E)
  if (/^[a-e]-[0-9]+$/.test(holeId)) {
    const parts = holeId.split('-');
    const rowChar = parts[0].toUpperCase();
    const col = parseInt(parts[1], 10);
    const colIndex = col - 1;
    
    const rowMapping: { [key: string]: number } = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };
    const rowIndex = rowMapping[rowChar];

    return {
      x: startX + colIndex * colSpacing,
      y: 110 + rowIndex * rowSpacing,
    };
  }

  // Terminal lower: f to j (Rows F-J)
  if (/^[f-j]-[0-9]+$/.test(holeId)) {
    const parts = holeId.split('-');
    const rowChar = parts[0].toUpperCase();
    const col = parseInt(parts[1], 10);
    const colIndex = col - 1;
    
    const rowMapping: { [key: string]: number } = { 'F': 0, 'G': 1, 'H': 2, 'I': 3, 'J': 4 };
    const rowIndex = rowMapping[rowChar];

    return {
      x: startX + colIndex * colSpacing,
      y: 220 + rowIndex * rowSpacing,
    };
  }

  // Top Outer (Negative, GND, Blue line)
  if (holeId.startsWith('top-outer-')) {
    const col = parseInt(holeId.replace('top-outer-', ''), 10);
    return {
      x: startX + (col - 1) * colSpacing,
      y: 44,
    };
  }

  // Top Inner (Positive, VCC, Red line)
  if (holeId.startsWith('top-inner-')) {
    const col = parseInt(holeId.replace('top-inner-', ''), 10);
    return {
      x: startX + (col - 1) * colSpacing,
      y: 64,
    };
  }

  // Bottom Inner (Positive, VCC, Red line)
  if (holeId.startsWith('bottom-inner-')) {
    const col = parseInt(holeId.replace('bottom-inner-', ''), 10);
    return {
      x: startX + (col - 1) * colSpacing,
      y: 316,
    };
  }

  // Bottom Outer (Negative, GND, Blue line)
  if (holeId.startsWith('bottom-outer-')) {
    const col = parseInt(holeId.replace('bottom-outer-', ''), 10);
    return {
      x: startX + (col - 1) * colSpacing,
      y: 336,
    };
  }

  // Fallback
  return { x: 0, y: 0 };
}

export const BreadboardSVG: React.FC<BreadboardSVGProps> = ({
  wires,
  devices,
  onHoleClick,
  selectedHoleId,
  hoveredHoleId,
  setHoveredHoleId,
  onWireClick,
  selectedWireId,
  highlightedComponentId,
  holeToComponentMap,
}) => {
  const holes = generateHoles();
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan to show the entire breadboard
  const resetView = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click if clicking on the background, not on a hole
    if (e.button === 0 && (e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).id === 'board-body') {
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

  // Find pin label mapping for any hole
  const getPinForHole = (holeId: string) => {
    for (const dev of devices) {
      for (const pin of dev.pins) {
        if (pin.holeId === holeId) {
          return {
            deviceName: dev.name,
            deviceColor: dev.color,
            pinName: pin.name,
            pinType: pin.type,
          };
        }
      }
    }
    return null;
  };

  // Check if a hole belongs to the currently hovered or highlighted electrical net/component
  const isHoleElectricallyConnected = (holeId: string) => {
    if (!hoveredHoleId && !selectedHoleId && !highlightedComponentId) return false;

    // 1. Highlight by selected electrical net component ID from sidebar
    if (highlightedComponentId) {
      return holeToComponentMap.get(holeId) === highlightedComponentId;
    }

    // 2. Highlight by hovered hole's electrical net
    const referenceHoleId = hoveredHoleId || selectedHoleId;
    if (referenceHoleId) {
      const refNet = getHoleNetId(referenceHoleId);
      const holeNet = getHoleNetId(holeId);

      // Simple internal vertical strips (A-E column-wise, F-J column-wise)
      if (refNet === holeNet) return true;

      // Also support tracing bridged connections via wires!
      const compId1 = holeToComponentMap.get(referenceHoleId);
      const compId2 = holeToComponentMap.get(holeId);
      if (compId1 && compId2 && compId1 === compId2) {
        return true;
      }
    }

    return false;
  };

  // Helper to draw a natural wire curve
  const renderWirePath = (wire: Wire) => {
    const start = getHoleCoords(wire.sourceId);
    const end = getHoleCoords(wire.destId);

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Dynamic curvature based on distance
    // If the wire is long, loop it higher. If it's a direct neighbor, keep it small.
    // If dy is small, loop upwards. If vertical, loop sideways.
    let cp1x = start.x;
    let cp1y = start.y;
    let cp2x = end.x;
    let cp2y = end.y;

    const curvature = Math.max(25, dist * 0.35);

    if (Math.abs(dy) < 30) {
      // Horizontal or close horizontal wire: loop upwards
      cp1y = start.y - curvature;
      cp2y = end.y - curvature;
    } else if (Math.abs(dx) < 30) {
      // Vertical or close vertical wire: loop slightly to the right or left
      cp1x = start.x + curvature * 0.6;
      cp2x = end.x + curvature * 0.6;
    } else {
      // Diagonal: blend curves naturally
      cp1y = start.y - curvature * 0.5;
      cp2y = end.y - curvature * 0.5;
      cp1x = start.x + dx * 0.25;
      cp2x = end.x - dx * 0.25;
    }

    const isSelected = selectedWireId === wire.id;

    return (
      <g key={wire.id} className="cursor-pointer group">
        {/* Shadow for 3D effect */}
        <path
          d={`M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`}
          fill="none"
          stroke="black"
          strokeWidth={isSelected ? 7 : 5}
          strokeOpacity={0.15}
          transform="translate(0, 3)"
          pointerEvents="none"
        />
        
        {/* Highlight boundary for easy clicking */}
        <path
          d={`M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          onClick={(e) => {
            e.stopPropagation();
            onWireClick(wire);
          }}
        />

        {/* The Colored Wire */}
        <path
          d={`M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`}
          fill="none"
          stroke={wire.color}
          strokeWidth={isSelected ? 5 : 3.5}
          strokeLinecap="round"
          className="transition-all duration-150"
          onClick={(e) => {
            e.stopPropagation();
            onWireClick(wire);
          }}
        />

        {/* Glow if selected */}
        {isSelected && (
          <path
            d={`M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}

        {/* Small center label if wire has a label */}
        {wire.label && (
          <foreignObject
            x={(start.x + end.x) / 2 - 40}
            y={(start.y + end.y) / 2 - curvature * 0.5 - 10}
            width="80"
            height="20"
            className="pointer-events-none"
          >
            <div className="bg-slate-900/80 text-[9px] text-white font-medium px-1 rounded text-center truncate backdrop-blur-xs border border-white/10 shadow-xs">
              {wire.label}
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden select-none">
      {/* Zoom / Pan Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-300">Visualizador Físico MB-102 (830 Pontos)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.15))}
            className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
            title="Afastar"
          >
            -
          </button>
          <span className="text-xs font-mono text-slate-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2.5, zoom + 0.15))}
            className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
            title="Aproximar"
          >
            +
          </button>
          <button
            onClick={resetView}
            className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            title="Resetar Zoom"
          >
            Resetar
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-slate-900/50 cursor-${isDragging ? 'grabbing' : 'grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1480 395"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          {/* Main Zoom and Drag Group */}
          <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
            
            {/* 1. White Breadboard Plastic Body */}
            <rect
              id="board-body"
              x="10"
              y="10"
              width="1440"
              height="365"
              rx="12"
              fill="#F9FAFB" // Clean white plastic color
              stroke="#D1D5DB"
              strokeWidth="2.5"
              className="shadow-lg"
            />

            {/* Middle Divider / Trough Groove (Fossa central) */}
            <rect
              x="10"
              y="190"
              width="1440"
              height="18"
              fill="#E5E7EB" // slightly darker grey for deep groove
              stroke="#D1D5DB"
              strokeWidth="0.5"
            />
            {/* Thin gap line inside central groove */}
            <line x1="10" y1="199" x2="1450" y2="199" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="2 1" />

            {/* 2. SILKSCREEN LINES & LABELS */}
            {/* Power lines - Top Negative (Blue) - Above top row of holes (y=44) */}
            <line x1="50" y1="30" x2="685" y2="30" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
            <line x1="745" y1="30" x2="1395" y2="30" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />

            {/* Power lines - Top Positive (Red) - Below second row of holes (y=64) */}
            <line x1="50" y1="78" x2="685" y2="78" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            <line x1="745" y1="78" x2="1395" y2="78" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />

            {/* Power lines - Bottom Positive (Red on left, Blue on right) */}
            <line x1="50" y1="306" x2="685" y2="306" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            <line x1="745" y1="306" x2="1395" y2="306" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />

            {/* Power lines - Bottom Negative (Blue on left, Red on right) */}
            <line x1="50" y1="346" x2="685" y2="346" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
            <line x1="745" y1="346" x2="1395" y2="346" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />

            {/* "+" and "-" Silkscreen Indicators */}
            {/* Top Power Labels */}
            <text x="32" y="34" fill="#3B82F6" fontSize="13" fontWeight="bold" fontFamily="sans-serif">-</text>
            <text x="32" y="82" fill="#EF4444" fontSize="13" fontWeight="bold" fontFamily="sans-serif">+</text>
            <text x="1410" y="34" fill="#3B82F6" fontSize="13" fontWeight="bold" fontFamily="sans-serif">-</text>
            <text x="1410" y="82" fill="#EF4444" fontSize="13" fontWeight="bold" fontFamily="sans-serif">+</text>

            {/* Bottom Power Labels */}
            {/* Left Side (Columns 1-30) */}
            <text x="32" y="310" fill="#EF4444" fontSize="13" fontWeight="bold" fontFamily="sans-serif">+</text>
            <text x="32" y="350" fill="#3B82F6" fontSize="13" fontWeight="bold" fontFamily="sans-serif">-</text>
            {/* Right Side (Columns 31-63 - Inverted) */}
            <text x="1410" y="310" fill="#3B82F6" fontSize="13" fontWeight="bold" fontFamily="sans-serif">-</text>
            <text x="1410" y="350" fill="#EF4444" fontSize="13" fontWeight="bold" fontFamily="sans-serif">+</text>

            {/* Column coordinate numbers: 1, 5, 10, ... 60, 63 above and below terminal rows */}
            {Array.from({ length: 13 }).map((_, i) => {
              const colNum = i === 12 ? 63 : (i * 5 === 0 ? 1 : i * 5);
              const coords = getHoleCoords(`a-${colNum}`);
              return (
                <g key={`num-${colNum}`}>
                  {/* Top numbers */}
                  <text
                    x={coords.x}
                    y="92"
                    fill="#9CA3AF"
                    fontSize="9.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {colNum}
                  </text>
                  {/* Bottom numbers */}
                  <text
                    x={coords.x}
                    y="298"
                    fill="#9CA3AF"
                    fontSize="9.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {colNum}
                  </text>
                </g>
              );
            })}

            {/* Row Letter coordinates: A, B, C, D, E & F, G, H, I, J on both Left & Right borders */}
            {['A', 'B', 'C', 'D', 'E'].map((letter, idx) => (
              <g key={`letter-upper-${letter}`}>
                <text x="40" y={114 + idx * 16} fill="#9CA3AF" fontSize="10.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{letter}</text>
                <text x="1424" y={114 + idx * 16} fill="#9CA3AF" fontSize="10.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{letter}</text>
              </g>
            ))}

            {['F', 'G', 'H', 'I', 'J'].map((letter, idx) => (
              <g key={`letter-lower-${letter}`}>
                <text x="40" y={224 + idx * 16} fill="#9CA3AF" fontSize="10.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{letter}</text>
                <text x="1424" y={224 + idx * 16} fill="#9CA3AF" fontSize="10.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{letter}</text>
              </g>
            ))}

            {/* 3. DRAW HOLES */}
            {holes.map((hole) => {
              const { x, y } = getHoleCoords(hole.id);
              const isSelected = selectedHoleId === hole.id;
              const isHovered = hoveredHoleId === hole.id;
              const isElectricallyConnected = isHoleElectricallyConnected(hole.id);
              
              // Device pins overlay colors
              const pinDetail = getPinForHole(hole.id);

              let strokeColor = '#9CA3AF'; // standard grey hole border
              let fillColor = '#1F2937';   // dark metal internal contact
              let radius = 3.2;            // standard size

              if (isElectricallyConnected) {
                strokeColor = '#10B981';   // Emerald glow for electrical net trace
                fillColor = '#D1FAE5';     // Soft green inside
                radius = 4.2;
              }

              if (isSelected) {
                strokeColor = '#3B82F6';   // Blue glow for selected hole
                fillColor = '#DBEAFE';     // soft blue inside
                radius = 4.5;
              } else if (isHovered) {
                strokeColor = '#F59E0B';   // Amber glow on hover
                fillColor = '#FEF3C7';
                radius = 4.2;
              } else if (pinDetail) {
                // If a device pin is mapped here, give it the device color border
                strokeColor = pinDetail.deviceColor;
                fillColor = '#E5E7EB';
                radius = 3.8;
              }

              return (
                <g key={hole.id}>
                  {/* Invisible larger hover zone for easy tapping/clicking */}
                  <circle
                    cx={x}
                    cy={y}
                    r={9}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredHoleId(hole.id)}
                    onMouseLeave={() => setHoveredHoleId(null)}
                    onClick={() => onHoleClick(hole.id)}
                  />

                  {/* Visual Hole outer boundary (metallic ring) */}
                  <rect
                    x={x - radius}
                    y={y - radius}
                    width={radius * 2}
                    height={radius * 2}
                    rx="1"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected || isHovered || isElectricallyConnected ? 1.5 : 1}
                    className="transition-all duration-150 pointer-events-none"
                  />

                  {/* Center square cavity for depth */}
                  <rect
                    x={x - (radius * 0.45)}
                    y={y - (radius * 0.45)}
                    width={(radius * 0.9)}
                    height={(radius * 0.9)}
                    rx="0.5"
                    fill={isElectricallyConnected || isSelected || isHovered ? '#059669' : '#111827'}
                    className="pointer-events-none"
                  />

                  {/* Miniature Pin labels if mapped to a device */}
                  {pinDetail && !isSelected && !isHovered && !isElectricallyConnected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={1.8}
                      fill={pinDetail.deviceColor}
                      className="pointer-events-none"
                    />
                  )}
                </g>
              );
            })}

            {/* 4. DRAW WIRES (on top of holes) */}
            {wires.map(renderWirePath)}

          </g>
        </svg>

        {/* Dynamic Tooltip following hovered hole */}
        {hoveredHoleId && (
          <div
            className="absolute z-10 bg-slate-950 text-white p-2 rounded-lg border border-slate-800 shadow-xl text-xs max-w-xs pointer-events-none font-sans"
            style={{
              left: '12px',
              bottom: '12px',
            }}
          >
            <div className="font-semibold text-amber-400 flex items-center justify-between gap-4 mb-0.5">
              <span>Furo {hoveredHoleId.toUpperCase().replace('TOP-OUTER-', 'Power Top (-) ').replace('TOP-INNER-', 'Power Top (+) ').replace('BOTTOM-INNER-', 'Power Bottom (+) ').replace('BOTTOM-OUTER-', 'Power Bottom (-) ')}</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 rounded uppercase font-mono">
                {getHoleNetId(hoveredHoleId)}
              </span>
            </div>
            
            {/* Show electrical connections */}
            {getPinForHole(hoveredHoleId) ? (
              <div className="text-emerald-400 text-[11px] font-medium mt-1">
                Pino Conectado: <span className="font-bold">{getPinForHole(hoveredHoleId)?.deviceName}</span> &rarr; <span className="underline">{getPinForHole(hoveredHoleId)?.pinName}</span>
              </div>
            ) : (
              <div className="text-slate-400 text-[10px] italic">Nenhum dispositivo encaixado diretamente.</div>
            )}

            {/* Show bridges */}
            {(() => {
              const compId = holeToComponentMap.get(hoveredHoleId);
              const mappedWire = wires.find(w => w.sourceId === hoveredHoleId || w.destId === hoveredHoleId);
              if (mappedWire) {
                return (
                  <div className="text-sky-300 text-[10px] mt-1 border-t border-slate-800/60 pt-1">
                    Ligado ao pino <span className="font-mono">{mappedWire.sourceId === hoveredHoleId ? mappedWire.destId.toUpperCase() : mappedWire.sourceId.toUpperCase()}</span> (Cabo {mappedWire.color})
                    {mappedWire.notes && <div className="text-slate-400 italic text-[9px]">&ldquo;{mappedWire.notes}&rdquo;</div>}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}
      </div>

      {/* Visual Instruction Banner */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-400 inline-block"></span> Furo Vazio</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span> Apontado</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block"></span> Selecionado</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> Canal Conectado</span>
        </div>
        <div className="text-[11px] text-slate-500 italic">
          Arraste o fundo da protoboard para mover. Clique em dois furos para puxar um fio!
        </div>
      </div>
    </div>
  );
};
