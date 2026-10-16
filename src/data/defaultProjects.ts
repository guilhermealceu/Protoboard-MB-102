import { Project } from '../types';

export const LOCAL_STORAGE_KEY = 'mb102_breadboard_projects_v1';
export const ACTIVE_PROJECT_ID_KEY = 'mb102_breadboard_active_id_v1';

// Initial dummy project to show off capabilities immediately!
export const DEFAULT_PROJECTS: Project[] = [
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
