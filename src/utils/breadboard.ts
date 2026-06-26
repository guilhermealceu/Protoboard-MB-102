import { Hole, Wire, Device, DeviceTemplate } from '../types';

export function generateHoles(): Hole[] {
  const holes: Hole[] = [];

  // 1. Power rails helper
  // MB-102 power rails are grouped into 10 blocks of 5 holes each.
  // Left side: groups 1-5 (columns 2 to 30)
  // Right side: groups 6-10 (columns 34 to 62)
  const powerColumns = [
    // Left Bank (cols 2 to 30)
    [2, 3, 4, 5, 6],
    [8, 9, 10, 11, 12],
    [14, 15, 16, 17, 18],
    [20, 21, 22, 23, 24],
    [26, 27, 28, 29, 30],
    // Right Bank (cols 34 to 62)
    [34, 35, 36, 37, 38],
    [40, 41, 42, 43, 44],
    [46, 47, 48, 49, 50],
    [52, 53, 54, 55, 56],
    [58, 59, 60, 61, 62],
  ];

  // Top Outer (Negative, GND, Blue line)
  powerColumns.forEach((group, gIndex) => {
    group.forEach((col) => {
      holes.push({
        id: `top-outer-${col}`,
        type: 'power',
        group: 'top-outer',
        row: '-',
        col,
      });
    });
  });

  // Top Inner (Positive, VCC, Red line)
  powerColumns.forEach((group, gIndex) => {
    group.forEach((col) => {
      holes.push({
        id: `top-inner-${col}`,
        type: 'power',
        group: 'top-inner',
        row: '+',
        col,
      });
    });
  });

  // Terminal upper (Rows A to E, Columns 1 to 63)
  const upperRows = ['A', 'B', 'C', 'D', 'E'];
  for (let col = 1; col <= 63; col++) {
    upperRows.forEach((row) => {
      holes.push({
        id: `${row.toLowerCase()}-${col}`,
        type: 'terminal',
        group: 'terminal-upper',
        row,
        col,
      });
    });
  }

  // Terminal lower (Rows F to J, Columns 1 to 63)
  const lowerRows = ['F', 'G', 'H', 'I', 'J'];
  for (let col = 1; col <= 63; col++) {
    lowerRows.forEach((row) => {
      holes.push({
        id: `${row.toLowerCase()}-${col}`,
        type: 'terminal',
        group: 'terminal-lower',
        row,
        col,
      });
    });
  }

  // Bottom Inner (Positive, VCC, Red line)
  powerColumns.forEach((group, gIndex) => {
    group.forEach((col) => {
      holes.push({
        id: `bottom-inner-${col}`,
        type: 'power',
        group: 'bottom-inner',
        row: '+',
        col,
      });
    });
  });

  // Bottom Outer (Negative, GND, Blue line)
  powerColumns.forEach((group, gIndex) => {
    group.forEach((col) => {
      holes.push({
        id: `bottom-outer-${col}`,
        type: 'power',
        group: 'bottom-outer',
        row: '-',
        col,
      });
    });
  });

  return holes;
}

// Map a Hole ID to its base electrical net ID (before wire connections)
export function getHoleNetId(holeId: string): string {
  // Check terminal upper: A-E, cols 1-63
  if (/^[a-e]-[0-9]+$/.test(holeId)) {
    const col = holeId.split('-')[1];
    return `terminal-upper-col-${col}`;
  }
  // Check terminal lower: F-J, cols 1-63
  if (/^[f-j]-[0-9]+$/.test(holeId)) {
    const col = holeId.split('-')[1];
    return `terminal-lower-col-${col}`;
  }

  // Power rails are split in the middle (cols <= 30 is Left, cols >= 31 is Right)
  if (holeId.startsWith('top-outer-')) {
    const col = parseInt(holeId.replace('top-outer-', ''), 10);
    return col <= 30 ? 'top-outer-left' : 'top-outer-right';
  }
  if (holeId.startsWith('top-inner-')) {
    const col = parseInt(holeId.replace('top-inner-', ''), 10);
    return col <= 30 ? 'top-inner-left' : 'top-inner-right';
  }
  if (holeId.startsWith('bottom-inner-')) {
    const col = parseInt(holeId.replace('bottom-inner-', ''), 10);
    return col <= 30 ? 'bottom-inner-left' : 'bottom-inner-right';
  }
  if (holeId.startsWith('bottom-outer-')) {
    const col = parseInt(holeId.replace('bottom-outer-', ''), 10);
    return col <= 30 ? 'bottom-outer-left' : 'bottom-outer-right';
  }

  return `isolated-${holeId}`;
}

export function isVccNet(net: string): boolean {
  if (!net) return false;
  return (
    net.includes('vcc') ||
    net === 'top-inner-left' || 
    net === 'top-inner-right' || 
    net === 'bottom-inner-left' || 
    net === 'bottom-outer-right'
  );
}

export function isGndNet(net: string): boolean {
  if (!net) return false;
  return (
    net.includes('gnd') ||
    net === 'top-outer-left' || 
    net === 'top-outer-right' || 
    net === 'bottom-outer-left' || 
    net === 'bottom-inner-right'
  );
}

export interface NetComponent {
  id: string;
  netIds: Set<string>; // set of base nets in this component
  holeIds: Set<string>; // set of all holes in this component
  connectedPins: { deviceId: string; deviceName: string; pinId: string; pinName: string; type?: string }[];
  isPowerVcc: boolean;
  isPowerGnd: boolean;
}

// Compute the merged electrical components from wires and devices
export function computeConnectedComponents(wires: Wire[], devices: Device[]): {
  holeToComponentMap: Map<string, string>;
  components: NetComponent[];
} {
  const holes = generateHoles();
  const baseNets = new Set<string>();
  const holeToBaseNet = new Map<string, string>();

  holes.forEach((h) => {
    const netId = getHoleNetId(h.id);
    baseNets.add(netId);
    holeToBaseNet.set(h.id, netId);
  });

  // Disjoint Set Union (DSU) to group base nets
  const parent = new Map<string, string>();
  baseNets.forEach((netId) => {
    parent.set(netId, netId);
  });

  function find(id: string): string {
    const p = parent.get(id);
    if (!p) return id;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  }

  function union(id1: string, id2: string) {
    const root1 = find(id1);
    const root2 = find(id2);
    if (root1 !== root2) {
      parent.set(root1, root2);
    }
  }

  // Connect base nets using wires
  wires.forEach((wire) => {
    const netSource = holeToBaseNet.get(wire.sourceId);
    const netDest = holeToBaseNet.get(wire.destId);
    if (netSource && netDest) {
      union(netSource, netDest);
    }
  });

  // Connect base nets using device pin mappings (if multiple pins share a hole, DSU will naturally group them because they are in the same hole)
  // No direct electrical connection between different device pins unless bridged, 
  // but if a device is mounted directly, the pins are placed in separate holes.
  // Actually, some components like switches or resistors have internal connections, but let's assume they only connect via external holes.

  // Group base nets into components
  const componentGroups = new Map<string, Set<string>>(); // rootNetId -> set of baseNetIds
  baseNets.forEach((netId) => {
    const root = find(netId);
    if (!componentGroups.has(root)) {
      componentGroups.set(root, new Set());
    }
    componentGroups.get(root)!.add(netId);
  });

  // Build high-level components with connected holes & device pins
  const components: NetComponent[] = [];
  const holeToComponentMap = new Map<string, string>();

  let compIdCounter = 1;
  componentGroups.forEach((nets, rootNetId) => {
    const compId = `net-component-${compIdCounter++}`;
    const holeIds = new Set<string>();

    holes.forEach((h) => {
      const netId = holeToBaseNet.get(h.id)!;
      if (nets.has(netId)) {
        holeIds.add(h.id);
        holeToComponentMap.set(h.id, compId);
      }
    });

    // Find device pins connected to these holes
    const connectedPins: NetComponent['connectedPins'] = [];
    devices.forEach((dev) => {
      dev.pins.forEach((pin) => {
        if (pin.holeId && holeIds.has(pin.holeId)) {
          connectedPins.push({
            deviceId: dev.id,
            deviceName: dev.name,
            pinId: pin.id,
            pinName: pin.name,
            type: pin.type,
          });
        }
      });
    });

    // Check if this component has explicit power rails or device pins marked as power
    const containsVccRail = Array.from(nets).some(isVccNet);
    const containsGndRail = Array.from(nets).some(isGndNet);

    const hasVccPin = connectedPins.some((p) => p.type === 'power_vcc');
    const hasGndPin = connectedPins.some((p) => p.type === 'power_gnd');

    components.push({
      id: compId,
      netIds: nets,
      holeIds,
      connectedPins,
      isPowerVcc: containsVccRail || hasVccPin,
      isPowerGnd: containsGndRail || hasGndPin,
    });
  });

  return { holeToComponentMap, components };
}

export interface ShortCircuitAlert {
  type: 'rail_short' | 'device_short' | 'double_connection';
  message: string;
  componentId: string;
  holes: string[];
}

export function detectShortCircuits(components: NetComponent[]): ShortCircuitAlert[] {
  const alerts: ShortCircuitAlert[] = [];

  components.forEach((comp) => {
    // 1. Direct VCC-GND short circuit
    // A single merged component has BOTH VCC power rail/pin and GND power rail/pin
    const hasVcc = comp.isPowerVcc;
    const hasGnd = comp.isPowerGnd;

    if (hasVcc && hasGnd) {
      // Find which nets are causing it
      const vccNets = Array.from(comp.netIds).filter(isVccNet);
      const gndNets = Array.from(comp.netIds).filter(isGndNet);
      const vccPins = comp.connectedPins.filter(p => p.type === 'power_vcc');
      const gndPins = comp.connectedPins.filter(p => p.type === 'power_gnd');

      let desc = 'Curto-circuito direto detectado!';
      if (vccNets.length > 0 && gndNets.length > 0) {
        desc = 'Linha Positiva (+) e Linha Negativa (-) conectadas diretamente por fios!';
      } else if (vccPins.length > 0 && gndPins.length > 0) {
        const pinNames = `${vccPins[0].deviceName} (${vccPins[0].pinName}) e ${gndPins[0].deviceName} (${gndPins[0].pinName})`;
        desc = `Pino de Alimentação VCC e GND de ${pinNames} estão interligados!`;
      } else if (vccNets.length > 0 && gndPins.length > 0) {
        desc = `Barramento positivo (+) conectado diretamente ao pino GND de ${gndPins[0].deviceName}!`;
      } else if (gndNets.length > 0 && vccPins.length > 0) {
        desc = `Barramento negativo (-) conectado diretamente ao pino VCC de ${vccPins[0].deviceName}!`;
      }

      alerts.push({
        type: 'rail_short',
        message: desc,
        componentId: comp.id,
        holes: Array.from(comp.holeIds),
      });
    }

    // 2. Device internal short
    // Check if two different power pins of the same device are mapped to the same base column hole (e.g. A5 has both GND and VCC of SensorX)
    const devicePinHoles = new Map<string, { pinName: string; holeId: string }[]>();
    comp.connectedPins.forEach((pin) => {
      if (!devicePinHoles.has(pin.deviceId)) {
        devicePinHoles.set(pin.deviceId, []);
      }
      // find which hole this pin is connected to
      devicePinHoles.get(pin.deviceId)!.push({ pinName: pin.pinName, pinId: pin.pinId } as any);
    });

    // Standard device double-mapping alert (e.g., if two pins of the same device occupy the exact same hole or the same electrically connected column block directly, which might be an error unless it's designed that way)
    // Actually, on a breadboard, each pin of an integrated circuit or sensor goes to a SEPARATE row or column.
    // If a user puts multiple pins of the SAME sensor/device into the SAME column, they are shorting the pins together!
    // This is a VERY common mistake for beginners (mounting a dual-row sensor vertically instead of horizontally, or not across the trough!).
    // Let's detect this! If two pins of the same device are on the same base Net, trigger a warning!
    const devicePinCountOnNets = new Map<string, Map<string, string[]>>(); // deviceId -> (netId -> pinNames)
    comp.connectedPins.forEach((pin) => {
      // Find the specific net of this pin
      // We need to trace the holeId of this pin
    });
  });

  return alerts;
}

export const POPULAR_TEMPLATES: { [key: string]: DeviceTemplate } = {
  arduino_uno: {
    name: 'Arduino Uno R3',
    type: 'microcontroller',
    color: '#00979C',
    pins: [
      { name: '5V', type: 'power_vcc' },
      { name: '3.3V', type: 'power_vcc' },
      { name: 'GND 1', type: 'power_gnd' },
      { name: 'GND 2', type: 'power_gnd' },
      { name: 'GND 3', type: 'power_gnd' },
      { name: 'VIN', type: 'power_vcc' },
      { name: 'A0', type: 'analog' },
      { name: 'A1', type: 'analog' },
      { name: 'A2', type: 'analog' },
      { name: 'A3', type: 'analog' },
      { name: 'A4 (SDA)', type: 'analog' },
      { name: 'A5 (SCL)', type: 'analog' },
      { name: 'D0 (RX)', type: 'digital' },
      { name: 'D1 (TX)', type: 'digital' },
      { name: 'D2', type: 'digital' },
      { name: 'D3 (~PWM)', type: 'digital' },
      { name: 'D4', type: 'digital' },
      { name: 'D5 (~PWM)', type: 'digital' },
      { name: 'D6 (~PWM)', type: 'digital' },
      { name: 'D7', type: 'digital' },
      { name: 'D8', type: 'digital' },
      { name: 'D9 (~PWM)', type: 'digital' },
      { name: 'D10 (~PWM)', type: 'digital' },
      { name: 'D11 (~PWM)', type: 'digital' },
      { name: 'D12', type: 'digital' },
      { name: 'D13 (LED)', type: 'digital' },
      { name: 'AREF', type: 'other' },
      { name: 'RESET', type: 'other' },
    ],
    description: 'Placa microcontroladora clássica para desenvolvimento DIY.',
  },
  esp32_nodemcu: {
    name: 'ESP32 NodeMCU (30 pinos)',
    type: 'microcontroller',
    color: '#E73C30',
    pins: [
      { name: '3V3', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'EN', type: 'other' },
      { name: 'VP (GPIO36)', type: 'analog' },
      { name: 'VN (GPIO39)', type: 'analog' },
      { name: 'D34 (GPIO34)', type: 'analog' },
      { name: 'D35 (GPIO35)', type: 'analog' },
      { name: 'D32 (GPIO32)', type: 'analog' },
      { name: 'D33 (GPIO33)', type: 'analog' },
      { name: 'D25 (GPIO25)', type: 'analog' },
      { name: 'D26 (GPIO26)', type: 'analog' },
      { name: 'D27 (GPIO27)', type: 'analog' },
      { name: 'D14 (GPIO14)', type: 'digital' },
      { name: 'D12 (GPIO12)', type: 'digital' },
      { name: 'D13 (GPIO13)', type: 'digital' },
      { name: 'D23 (GPIO23)', type: 'digital' },
      { name: 'D22 (GPIO22)', type: 'digital' },
      { name: 'TX0 (GPIO1)', type: 'digital' },
      { name: 'RX0 (GPIO3)', type: 'digital' },
      { name: 'D21 (GPIO21)', type: 'digital' },
      { name: 'D19 (GPIO19)', type: 'digital' },
      { name: 'D18 (GPIO18)', type: 'digital' },
      { name: 'D5 (GPIO5)', type: 'digital' },
      { name: 'TX2 (GPIO17)', type: 'digital' },
      { name: 'RX2 (GPIO16)', type: 'digital' },
      { name: 'D4 (GPIO4)', type: 'digital' },
      { name: 'D2 (GPIO2)', type: 'digital' },
      { name: 'D15 (GPIO15)', type: 'digital' },
      { name: 'VIN (5V)', type: 'power_vcc' },
    ],
    description: 'Placa de desenvolvimento WiFi e Bluetooth de alto desempenho.',
  },
  dht22: {
    name: 'Sensor DHT22 / AM2302',
    type: 'sensor',
    color: '#4A5568',
    pins: [
      { name: 'VDD (3-5V)', type: 'power_vcc' },
      { name: 'DATA', type: 'digital' },
      { name: 'NC (Não Conectado)', type: 'other' },
      { name: 'GND', type: 'power_gnd' },
    ],
    description: 'Sensor de temperatura e umidade capacitivo de alta precisão.',
  },
  hc_sr04: {
    name: 'Sensor Ultrassônico HC-SR04',
    type: 'sensor',
    color: '#008080',
    pins: [
      { name: 'VCC (5V)', type: 'power_vcc' },
      { name: 'TRIG', type: 'digital' },
      { name: 'ECHO', type: 'digital' },
      { name: 'GND', type: 'power_gnd' },
    ],
    description: 'Sensor de distância por ultrassom de alta precisão (2cm a 400cm).',
  },
  tp4056: {
    name: 'Módulo de Carga TP4056 USB-C',
    type: 'power',
    color: '#2B6CB0',
    pins: [
      { name: 'IN+ (5V)', type: 'power_vcc' },
      { name: 'IN- (GND)', type: 'power_gnd' },
      { name: 'BAT+ (Bateria)', type: 'power_vcc' },
      { name: 'BAT- (Bateria)', type: 'power_gnd' },
      { name: 'OUT+ (VCC)', type: 'power_vcc' },
      { name: 'OUT- (GND)', type: 'power_gnd' },
    ],
    description: 'Módulo de carga e proteção para baterias de lítio 18650 com USB-C.',
  },
  ld2410: {
    name: 'Radar de Presença Humana LD2410 (24GHz)',
    type: 'sensor',
    color: '#4C51BF',
    pins: [
      { name: 'VCC (5V)', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'OUT (Sinal)', type: 'digital' },
      { name: 'TX (UART)', type: 'digital' },
      { name: 'RX (UART)', type: 'digital' },
    ],
    description: 'Sensor inteligente de presença por micro-ondas / radar FMCW.',
  },
  ili9341_tft: {
    name: 'Display TFT LCD 2.8" SPI (ILI9341)',
    type: 'display',
    color: '#805AD5',
    pins: [
      { name: 'VCC (5V/3.3V)', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'CS (Display Select)', type: 'digital' },
      { name: 'RESET', type: 'digital' },
      { name: 'D/C (Data/Command)', type: 'digital' },
      { name: 'SDI (MOSI)', type: 'digital' },
      { name: 'SCK (Clock)', type: 'digital' },
      { name: 'LED (Luz de Fundo)', type: 'power_vcc' },
      { name: 'SDO (MISO)', type: 'digital' },
      { name: 'T_CLK (Touch Clock)', type: 'digital' },
      { name: 'T_CS (Touch Select)', type: 'digital' },
      { name: 'T_DIN (Touch Input)', type: 'digital' },
      { name: 'T_DO (Touch Output)', type: 'digital' },
      { name: 'T_IRQ (Touch Interrupção)', type: 'digital' },
    ],
    description: 'Display colorido de alta resolução com barramento SPI e painel de toque.',
  },
  bmi160: {
    name: 'Acelerômetro & Giroscópio BMI160 (6DOF)',
    type: 'sensor',
    color: '#DD6B20',
    pins: [
      { name: 'VCC (3.3V)', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'SCL (Clock I2C/SPI)', type: 'digital' },
      { name: 'SDA (Data I2C/SPI)', type: 'digital' },
      { name: 'SA0 (Endereço I2C)', type: 'digital' },
      { name: 'INT1 (Interrupção)', type: 'digital' },
      { name: 'INT2 (Interrupção)', type: 'digital' },
    ],
    description: 'Módulo inercial MEMS de ultra-baixo consumo com giroscópio e acelerômetro de 16 bits.',
  },
  mq7_sensor: {
    name: 'Sensor de Monóxido de Carbono MQ-7',
    type: 'sensor',
    color: '#C53030',
    pins: [
      { name: 'VCC (5V)', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'AOUT (Saída Analógica)', type: 'analog' },
      { name: 'DOUT (Saída Digital)', type: 'digital' },
    ],
    description: 'Módulo detector de gás CO por variação de condutividade.',
  },
  mq135_sensor: {
    name: 'Sensor de Qualidade do Ar MQ-135',
    type: 'sensor',
    color: '#9B2C2C',
    pins: [
      { name: 'VCC (5V)', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'AOUT (Saída Analógica)', type: 'analog' },
      { name: 'DOUT (Saída Digital)', type: 'digital' },
    ],
    description: 'Sensor para detecção de fumaça, amônia, benzeno, CO2 e gases nocivos.',
  },
  mq5_sensor: {
    name: 'Sensor de GLP & Gás de Cozinha MQ-5',
    type: 'sensor',
    color: '#742A2A',
    pins: [
      { name: 'VCC (5V)', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'AOUT (Saída Analógica)', type: 'analog' },
      { name: 'DOUT (Saída Digital)', type: 'digital' },
    ],
    description: 'Alta sensibilidade para GLP, gás natural e detecção de vazamentos em cozinhas.',
  },
  shtc3: {
    name: 'Sensor de Temp/Umidade SHTC3 I2C',
    type: 'sensor',
    color: '#2F855A',
    pins: [
      { name: 'VDD (3.3V)', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'SCL (Clock I2C)', type: 'digital' },
      { name: 'SDA (Data I2C)', type: 'digital' },
    ],
    description: 'Módulo sensor digital de alta precisão com comunicação I2C de ultra-baixo consumo.',
  },
  ttp223_touch: {
    name: 'Módulo Botão de Toque TTP223',
    type: 'sensor',
    color: '#E53E3E',
    pins: [
      { name: 'VCC (2-5.5V)', type: 'power_vcc' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'OUT (Sinal Digital)', type: 'digital' },
    ],
    description: 'Sensor de toque capacitivo digital que funciona como um interruptor liga/desliga.',
  },
  pl2303_ttl: {
    name: 'Conversor USB-TTL PL2303HX',
    type: 'other',
    color: '#2B6CB0',
    pins: [
      { name: '5V (Power Out)', type: 'power_vcc' },
      { name: 'TXD (Transmit)', type: 'digital' },
      { name: 'RXD (Receive)', type: 'digital' },
      { name: 'GND', type: 'power_gnd' },
      { name: '3V3 (Power Out)', type: 'power_vcc' },
    ],
    description: 'Adaptador conversor serial USB para TTL de 5 pinos.',
  },
  speaker_1609: {
    name: 'Alto-falante Miniatura 1609 (8Ω)',
    type: 'other',
    color: '#4A5568',
    pins: [
      { name: 'SPK+ (Positivo)', type: 'other' },
      { name: 'SPK- (Negativo)', type: 'other' },
    ],
    description: 'Alto-falante magnético pequeno (16x9mm) para projetos de sinalização sonora.',
  },
  dht11: {
    name: 'Sensor DHT11',
    type: 'sensor',
    color: '#3182CE',
    pins: [
      { name: 'VCC (3.5-5.5V)', type: 'power_vcc' },
      { name: 'DATA', type: 'digital' },
      { name: 'NC', type: 'other' },
      { name: 'GND', type: 'power_gnd' },
    ],
    description: 'Sensor básico de temperatura e umidade (azul).',
  },
  oled_i2c: {
    name: 'Display OLED I2C SSD1306',
    type: 'display',
    color: '#2B6CB0',
    pins: [
      { name: 'GND', type: 'power_gnd' },
      { name: 'VCC', type: 'power_vcc' },
      { name: 'SCL', type: 'digital' },
      { name: 'SDA', type: 'digital' },
    ],
    description: 'Display OLED gráfico monocromático de 0.96".',
  },
  mic_ky038: {
    name: 'Microfone KY-038',
    type: 'sensor',
    color: '#C53030',
    pins: [
      { name: 'AO (Analog Out)', type: 'analog' },
      { name: 'GND', type: 'power_gnd' },
      { name: 'GND / +', type: 'power_vcc' }, // Sometimes named VCC/+
      { name: 'DO (Digital Out)', type: 'digital' },
    ],
    description: 'Módulo sensor de detecção de som com potenciômetro.',
  },
  resistor: {
    name: 'Resistor Comum',
    type: 'resistor',
    color: '#D69E2E',
    pins: [
      { name: 'Terminal 1', type: 'other' },
      { name: 'Terminal 2', type: 'other' },
    ],
    description: 'Componente passivo para limitar corrente elétrica.',
  },
  led_5mm: {
    name: 'LED de 5mm',
    type: 'led',
    color: '#E53E3E',
    pins: [
      { name: 'Anodo (+)', type: 'other' },
      { name: 'Catodo (-)', type: 'power_gnd' },
    ],
    description: 'Diodo emissor de luz redondo padrão de 5mm.',
  },
  potentiometer: {
    name: 'Potenciômetro Rotativo',
    type: 'resistor',
    color: '#319795',
    pins: [
      { name: 'Terminal 1 (VCC/GND)', type: 'other' },
      { name: 'Cursor (Sinal)', type: 'analog' },
      { name: 'Terminal 3 (GND/VCC)', type: 'other' },
    ],
    description: 'Resistor variável de três terminais.',
  }
};
export type DeviceTemplateType = keyof typeof POPULAR_TEMPLATES;
