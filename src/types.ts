export interface Hole {
  id: string;
  type: 'power' | 'terminal';
  group: 'top-outer' | 'top-inner' | 'bottom-inner' | 'bottom-outer' | 'terminal-upper' | 'terminal-lower';
  row: string; // 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', '+' or '-'
  col: number; // 1 to 63
}

export interface Wire {
  id: string;
  sourceId: string;
  destId: string;
  color: string;
  label?: string;
  notes?: string;
}

export interface DevicePin {
  id: string;
  name: string;
  type?: 'power_vcc' | 'power_gnd' | 'digital' | 'analog' | 'other';
  holeId: string | null; // null if not connected
}

export interface Device {
  id: string;
  name: string;
  type: string; // 'sensor', 'microcontroller', 'display', 'led', 'resistor', 'custom'
  color: string; // hex representation for highlighting
  pins: DevicePin[];
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  wires: Wire[];
  devices: Device[];
  createdAt: string;
  updatedAt: string;
}

export interface DeviceTemplate {
  name: string;
  type: string;
  color: string;
  pins: { name: string; type?: 'power_vcc' | 'power_gnd' | 'digital' | 'analog' | 'other' }[];
  description: string;
}
