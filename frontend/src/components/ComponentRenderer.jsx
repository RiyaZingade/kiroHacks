import { Group, Rect, Circle, Line, Text, Ellipse } from 'react-konva'

// P3 owns this file
// Maps component type → Konva shape fallback (geometric shapes)
// Fritzing SVGs deferred per 45-min rule — shapes ship first

const CELL = 20

// Type → visual config + pin definitions
// ALL pin offsets are INTEGER cell units so they land exactly on grid dots.
// Components are drawn centered around their pin axis.
const COMPONENT_DEFS = {
  // === EXISTING 6 ===
  resistor: { color: '#a47149', width: 3, height: 1, label: 'R', pins: { pin1: [0, 0], pin2: [3, 0] } },
  led: { color: '#ef4444', width: 1, height: 3, label: 'LED', pins: { anode: [0, 0], cathode: [0, 2] } },
  capacitor: { color: '#3b82f6', width: 3, height: 1, label: 'C', pins: { pin1: [0, 0], pin2: [3, 0] } },
  button: { color: '#8b5cf6', width: 2, height: 1, label: 'BTN', pins: { pin1: [0, 0], pin2: [2, 0] } },
  power_rail: { color: '#dc2626', width: 4, height: 1, label: 'PWR', pins: { pin1: [0, 0], pin2: [4, 0] } },
  wire: { color: '#6b7280', width: 2, height: 1, label: 'W', pins: { pin1: [0, 0], pin2: [2, 0] } },

  // === POWER ===
  power_supply: { color: '#dc2626', width: 3, height: 2, label: 'PS', pins: { positive: [0, 0], negative: [3, 0] } },
  battery_9v: { color: '#f59e0b', width: 2, height: 2, label: '9V', pins: { positive: [0, 0], negative: [2, 0] } },
  battery_coin: { color: '#d4d4d4', width: 2, height: 2, label: '3V', pins: { positive: [0, 0], negative: [2, 0] } },

  // === BASIC COMPONENTS ===
  capacitor_elec: { color: '#1d4ed8', width: 3, height: 1, label: 'CE', pins: { positive: [0, 0], negative: [3, 0] } },
  inductor: { color: '#059669', width: 3, height: 1, label: 'L', pins: { pin1: [0, 0], pin2: [3, 0] } },
  potentiometer: { color: '#0891b2', width: 3, height: 2, label: 'POT', pins: { pin1: [0, 1], wiper: [1, 0], pin2: [3, 1] } },
  photoresistor: { color: '#84cc16', width: 2, height: 1, label: 'LDR', pins: { pin1: [0, 0], pin2: [2, 0] } },
  thermistor: { color: '#f97316', width: 2, height: 1, label: 'TH', pins: { pin1: [0, 0], pin2: [2, 0] } },

  // === INPUT ===
  switch_slide: { color: '#7c3aed', width: 3, height: 1, label: 'SW', pins: { pin1: [0, 0], common: [1, 0], pin2: [3, 0] } },
  switch_toggle: { color: '#7c3aed', width: 2, height: 1, label: 'SW', pins: { pin1: [0, 0], pin2: [2, 0] } },
  keypad: { color: '#6366f1', width: 4, height: 4, label: 'KP', pins: { r1: [0, 0], r2: [0, 1], r3: [0, 2], r4: [0, 3], c1: [4, 0], c2: [4, 1], c3: [4, 2], c4: [4, 3] } },

  // === OUTPUT ===
  led_rgb: { color: '#a855f7', width: 2, height: 3, label: 'RGB', pins: { red: [0, 0], green: [1, 0], blue: [2, 0], cathode: [1, 2] } },
  display_7seg: { color: '#ef4444', width: 4, height: 3, label: '7SEG', pins: { a: [0, 0], b: [1, 0], c: [2, 0], d: [3, 0], e: [0, 3], f: [1, 3], g: [2, 3], common: [4, 1] } },
  lcd_16x2: { color: '#22c55e', width: 6, height: 3, label: 'LCD', pins: { vss: [0, 0], vdd: [1, 0], rs: [2, 0], e: [3, 0], d4: [0, 3], d5: [1, 3], d6: [2, 3], d7: [3, 3] } },
  buzzer: { color: '#eab308', width: 2, height: 2, label: 'BUZ', pins: { positive: [0, 0], negative: [2, 0] } },
  motor_dc: { color: '#64748b', width: 3, height: 2, label: 'M', pins: { pin1: [0, 1], pin2: [3, 1] } },
  servo: { color: '#f97316', width: 3, height: 2, label: 'SRV', pins: { signal: [0, 0], vcc: [1, 0], gnd: [3, 0] } },
  motor_stepper: { color: '#64748b', width: 4, height: 2, label: 'STP', pins: { a1: [0, 0], a2: [1, 0], b1: [3, 0], b2: [4, 0] } },

  // === MICROCONTROLLERS ===
  arduino_uno: { color: '#0284c7', width: 6, height: 4, label: 'UNO', pins: {
    D0: [0, 0], D1: [1, 0], D2: [2, 0], D3: [3, 0], D4: [4, 0], D5: [5, 0], D6: [6, 0],
    D7: [0, 4], D8: [1, 4], D9: [2, 4], D10: [3, 4], D11: [4, 4], D12: [5, 4], D13: [6, 4],
    A0: [0, 2], A1: [1, 2], A2: [2, 2], A3: [3, 2], A4: [4, 2], A5: [5, 2],
    '5V': [6, 1], '3.3V': [6, 2], GND: [6, 3], VIN: [6, 0],
  }},
  arduino_nano: { color: '#0369a1', width: 5, height: 3, label: 'NANO', pins: {
    D0: [0, 0], D1: [1, 0], D2: [2, 0], D3: [3, 0], D4: [4, 0], D5: [5, 0],
    D6: [0, 3], D7: [1, 3], D8: [2, 3], D9: [3, 3], D10: [4, 3], D11: [5, 3],
    A0: [0, 1], A1: [1, 1], A2: [2, 1], '5V': [5, 1], GND: [5, 2],
  }},

  // === ICs ===
  ic_555: { color: '#374151', width: 3, height: 3, label: '555', pins: {
    gnd: [0, 0], trigger: [0, 1], output: [0, 3], reset: [3, 3], control: [3, 2], threshold: [3, 1], discharge: [3, 0], vcc: [1, 0],
  }},
  ic_shift_reg: { color: '#374151', width: 3, height: 4, label: '595', pins: {
    qa: [0, 0], qb: [0, 1], qc: [0, 2], qd: [0, 3], qe: [3, 3], qf: [3, 2], qg: [3, 1], qh: [3, 0],
    ser: [0, 4], vcc: [3, 0], gnd: [0, 0],
  }},
  ic_logic_and: { color: '#374151', width: 2, height: 2, label: 'AND', pins: { a: [0, 0], b: [0, 2], out: [2, 1] } },
  ic_logic_or: { color: '#374151', width: 2, height: 2, label: 'OR', pins: { a: [0, 0], b: [0, 2], out: [2, 1] } },
  ic_logic_not: { color: '#374151', width: 2, height: 1, label: 'NOT', pins: { in: [0, 0], out: [2, 0] } },
  ic_opamp: { color: '#374151', width: 3, height: 2, label: 'OA', pins: { inv: [0, 0], noninv: [0, 2], out: [3, 1], vcc: [1, 0], gnd: [1, 2] } },

  // === SENSORS ===
  sensor_ultrasonic: { color: '#06b6d4', width: 4, height: 2, label: 'US', pins: { vcc: [0, 0], trig: [1, 0], echo: [3, 0], gnd: [4, 0] } },
  sensor_pir: { color: '#10b981', width: 3, height: 2, label: 'PIR', pins: { vcc: [0, 0], out: [1, 0], gnd: [3, 0] } },
  sensor_temp: { color: '#f43f5e', width: 2, height: 2, label: 'TMP', pins: { vcc: [0, 0], out: [1, 0], gnd: [2, 0] } },
  sensor_light: { color: '#84cc16', width: 2, height: 1, label: 'LDR', pins: { pin1: [0, 0], pin2: [2, 0] } },
  sensor_tilt: { color: '#a3a3a3', width: 2, height: 1, label: 'TILT', pins: { pin1: [0, 0], pin2: [2, 0] } },
  sensor_hall: { color: '#8b5cf6', width: 2, height: 2, label: 'HALL', pins: { vcc: [0, 0], out: [1, 0], gnd: [2, 0] } },

  // === POWER & CONTROL ===
  voltage_reg: { color: '#1e40af', width: 2, height: 2, label: 'VR', pins: { vin: [0, 0], gnd: [1, 2], vout: [2, 0] } },
  transistor_npn: { color: '#475569', width: 2, height: 2, label: 'NPN', pins: { base: [0, 1], collector: [2, 0], emitter: [2, 2] } },
  transistor_pnp: { color: '#475569', width: 2, height: 2, label: 'PNP', pins: { base: [0, 1], collector: [2, 0], emitter: [2, 2] } },
  mosfet: { color: '#475569', width: 2, height: 2, label: 'FET', pins: { gate: [0, 1], drain: [2, 0], source: [2, 2] } },
  relay: { color: '#78716c', width: 3, height: 2, label: 'RL', pins: { coil1: [0, 0], coil2: [0, 2], com: [3, 0], no: [3, 1], nc: [3, 2] } },

  // === MODULES ===
  hbridge: { color: '#991b1b', width: 4, height: 3, label: 'H-BR', pins: {
    en1: [0, 0], in1: [0, 1], in2: [0, 2], out1: [4, 0], out2: [4, 1], vcc: [2, 0], gnd: [2, 3],
  }},
  ir_receiver: { color: '#581c87', width: 2, height: 2, label: 'IR', pins: { vcc: [0, 0], out: [1, 0], gnd: [2, 0] } },
}

// Get the definition for a component type, with a generic fallback
export function getComponentDef(type) {
  return COMPONENT_DEFS[type] ?? {
    color: '#6b7280',
    width: 2,
    height: 1,
    label: '?',
    pins: { pin1: [0, 0], pin2: [2, 0] },
  }
}

// Rotate a pin offset [col, row] by the given angle (0, 90, 180, 270)
function rotateOffset(offCol, offRow, rotation) {
  switch (rotation) {
    case 90:  return [-offRow, offCol]
    case 180: return [-offCol, -offRow]
    case 270: return [offRow, -offCol]
    default:  return [offCol, offRow]
  }
}

// Get effective width/height after rotation
export function getRotatedSize(type, rotation = 0) {
  const def = getComponentDef(type)
  if (rotation === 90 || rotation === 270) {
    return { width: def.height, height: def.width }
  }
  return { width: def.width, height: def.height }
}

// Resolve a pin's absolute pixel position given a component (with rotation)
// Adds CELL offset to match the grid padding (grid dots start at CELL, not 0)
export function getPinPosition(component) {
  const def = getComponentDef(component.type)
  const [col, row] = component.position
  const rotation = component.rotation ?? 0
  const result = {}
  for (const [pinName, [offCol, offRow]] of Object.entries(def.pins)) {
    const [rCol, rRow] = rotateOffset(offCol, offRow, rotation)
    result[pinName] = {
      x: (col + rCol) * CELL + CELL,
      y: (row + rRow) * CELL + CELL,
    }
  }
  return result
}

// Resistor color band lookup
const BAND_COLORS = ['#000', '#8B4513', '#f00', '#f90', '#ff0', '#0a0', '#00f', '#808', '#888', '#fff']
// Multiplier bands: 1, 10, 100, 1k, 10k, 100k, 1M
const MULT_COLORS = ['#000', '#8B4513', '#f00', '#f90', '#ff0', '#0a0', '#00f']
const TOLERANCE_GOLD = '#DAA520'

function getResistorBands(value) {
  if (!value) return [BAND_COLORS[1], BAND_COLORS[0], BAND_COLORS[3], TOLERANCE_GOLD] // default 10kΩ
  // Parse value string like "220", "10k", "4.7kΩ", "10kΩ"
  const cleaned = value.replace(/[Ωω\s]/gi, '').toLowerCase()
  let ohms = parseFloat(cleaned)
  if (cleaned.endsWith('k')) ohms = parseFloat(cleaned) * 1000
  else if (cleaned.endsWith('m')) ohms = parseFloat(cleaned) * 1000000
  if (isNaN(ohms) || ohms <= 0) return [BAND_COLORS[1], BAND_COLORS[0], BAND_COLORS[3], TOLERANCE_GOLD]

  // Normalize to 2 significant digits
  let mult = 0
  let sig = ohms
  while (sig >= 100) { sig /= 10; mult++ }
  while (sig < 10 && mult > 0) { sig *= 10; mult-- }
  const d1 = Math.floor(sig / 10) % 10
  const d2 = Math.round(sig) % 10
  return [
    BAND_COLORS[d1] || '#000',
    BAND_COLORS[d2] || '#000',
    MULT_COLORS[mult] || '#000',
    TOLERANCE_GOLD,
  ]
}

export default function ComponentRenderer({
  component,
  isSelected,
  selectedPin,
  onSelect,
  onPinClick,
  onMove,
  mode,
  isLit,
}) {
  const def = getComponentDef(component.type)
  const [col, row] = component.position
  const x = col * CELL + CELL
  const y = row * CELL + CELL
  const w = def.width * CELL
  const h = def.height * CELL
  const rotation = component.rotation ?? 0
  const isDraggable = mode === 'manual'

  // Determine LED fill color from component data
  const fillColor =
    component.type === 'led' && component.color
      ? component.color
      : def.color

  // Calculate label position: fixed 6px gap above the top edge of the component body
  const LABEL_GAP = 6
  const FONT_SIZE = 10
  const topEdge = (() => {
    const halfCell = CELL / 2
    switch (component.type) {
      case 'led':       return 0
      case 'capacitor': return -halfCell
      case 'button':    return -halfCell
      case 'power_rail': return -2
      case 'wire':      return -2
      default:
        // Multi-row components start at y=0, single-row at -halfCell
        return def.height > 1 ? -4 : -halfCell
    }
  })()
  const labelY = topEdge - LABEL_GAP - FONT_SIZE

  const renderShape = () => {
    // All shapes drawn in their DEFAULT (0°) orientation.
    // The Group handles rotation via Konva's rotation prop.
    const halfCell = CELL / 2

    switch (component.type) {
      case 'led':
        // Vertical 1×3: dome-shaped LED with two pin legs
        {
          const ledColor = fillColor
          const dimColor = fillColor + '60'
          return (
            <>
              {/* Pin legs */}
              <Line points={[-3, 0, -3, CELL * 0.4]} stroke="#9ca3af" strokeWidth={1.5} />
              <Line points={[3, 0, 3, CELL * 0.4]} stroke="#9ca3af" strokeWidth={1.5} />
              {/* Anode leg longer marker */}
              <Line points={[-5, -2, -1, -2]} stroke="#9ca3af" strokeWidth={1} />
              {/* Flat base */}
              <Rect
                x={-halfCell + 2}
                y={CELL * 0.4}
                width={CELL - 4}
                height={4}
                fill={ledColor}
                opacity={0.8}
              />
              {/* LED dome body */}
              <Circle
                x={0}
                y={CELL * 0.9}
                radius={halfCell - 1}
                fill={ledColor}
                stroke={isSelected ? '#facc15' : '#ffffff30'}
                strokeWidth={isSelected ? 2 : 1}
                opacity={isLit ? 1.0 : 0.9}
                shadowColor={isLit ? fillColor : undefined}
                shadowBlur={isLit ? 20 : 0}
                shadowOpacity={isLit ? 0.8 : 0}
              />
              {/* Inner glow highlight */}
              <Circle
                x={-2}
                y={CELL * 0.75}
                radius={3}
                fill="#ffffff"
                opacity={0.35}
                listening={false}
              />
              {/* Cathode pin at bottom */}
              <Line points={[-3, CELL * 1.5, -3, CELL * 2]} stroke="#9ca3af" strokeWidth={1.5} />
              <Line points={[3, CELL * 1.5, 3, CELL * 2]} stroke="#9ca3af" strokeWidth={1.5} />
            </>
          )
        }
      case 'capacitor':
        // Horizontal 3×1: two vertical parallel plates in the middle
        {
          const midX = (3 * CELL) / 2
          return (
            <>
              <Line
                points={[midX - 3, -halfCell + 2, midX - 3, halfCell - 2]}
                stroke={fillColor}
                strokeWidth={3}
              />
              <Line
                points={[midX + 3, -halfCell + 2, midX + 3, halfCell - 2]}
                stroke={fillColor}
                strokeWidth={3}
              />
              <Line
                points={[0, 0, midX - 3, 0]}
                stroke={fillColor}
                strokeWidth={1.5}
              />
              <Line
                points={[midX + 3, 0, 3 * CELL, 0]}
                stroke={fillColor}
                strokeWidth={1.5}
              />
              {isSelected && (
                <Rect
                  x={-2}
                  y={-halfCell}
                  width={3 * CELL + 4}
                  height={CELL}
                  stroke="#facc15"
                  strokeWidth={2}
                  cornerRadius={2}
                />
              )}
            </>
          )
        }
      case 'button':
        // Round tactile push button with pin legs
        return (
          <>
            {/* Pin legs */}
            <Line points={[0, 0, CELL * 0.3, 0]} stroke="#9ca3af" strokeWidth={1.5} />
            <Line points={[2 * CELL - CELL * 0.3, 0, 2 * CELL, 0]} stroke="#9ca3af" strokeWidth={1.5} />
            {/* Button base */}
            <Circle
              x={CELL}
              y={0}
              radius={halfCell}
              fill="#4b5563"
              stroke={isSelected ? '#facc15' : '#6b7280'}
              strokeWidth={isSelected ? 2 : 1.5}
            />
            {/* Button cap */}
            <Circle
              x={CELL}
              y={0}
              radius={halfCell - 4}
              fill="#9ca3af"
              stroke="#d1d5db"
              strokeWidth={1}
            />
            {/* Highlight */}
            <Circle
              x={CELL - 2}
              y={-2}
              radius={3}
              fill="#ffffff"
              opacity={0.25}
              listening={false}
            />
          </>
        )
      case 'power_rail':
        return (
          <Line
            points={[0, 0, 4 * CELL, 0]}
            stroke={fillColor}
            strokeWidth={3}
            dash={[6, 3]}
          />
        )
      case 'wire':
        return (
          <Line
            points={[0, 0, 2 * CELL, 0]}
            stroke={fillColor}
            strokeWidth={2}
          />
        )

      // === MICROCONTROLLERS — large labeled rect with pin dots ===
      case 'arduino_uno':
      case 'arduino_nano':
        {
          const bw = def.width * CELL, bh = def.height * CELL
          return (
            <>
              {/* PCB board */}
              <Rect x={0} y={0} width={bw} height={bh} fill="#006d77" stroke={isSelected ? '#facc15' : '#0ea5e9'} strokeWidth={isSelected ? 2 : 1.5} cornerRadius={3} />
              {/* USB port */}
              <Rect x={bw / 2 - 8} y={-2} width={16} height={8} fill="#a3a3a3" stroke="#737373" strokeWidth={1} cornerRadius={1} />
              {/* Chip */}
              <Rect x={bw / 2 - 12} y={bh / 2 - 6} width={24} height={12} fill="#1a1a1a" cornerRadius={1} />
              <Circle x={bw / 2 - 8} y={bh / 2 - 2} radius={1.5} fill="#404040" listening={false} />
              {/* Reset button */}
              <Circle x={bw - 10} y={10} radius={3} fill="#d4d4d4" stroke="#a3a3a3" strokeWidth={0.5} />
              {/* Power LED */}
              <Circle x={8} y={bh - 8} radius={2} fill="#22c55e" listening={false} />
              {/* Pin headers - top */}
              {Array.from({ length: Math.min(7, def.width + 1) }, (_, i) => (
                <Rect key={`pt${i}`} x={i * CELL - 1} y={-1} width={3} height={4} fill="#fbbf24" listening={false} />
              ))}
              {/* Pin headers - bottom */}
              {Array.from({ length: Math.min(7, def.width + 1) }, (_, i) => (
                <Rect key={`pb${i}`} x={i * CELL - 1} y={bh - 3} width={3} height={4} fill="#fbbf24" listening={false} />
              ))}
              {/* Label */}
              <Text x={bw / 2 - 12} y={bh / 2 + 10} text={def.label} fontSize={9} fill="#67e8f9" fontStyle="bold" listening={false} />
            </>
          )
        }

      // === ICs — DIP-style rect with notch ===
      case 'ic_555':
      case 'ic_shift_reg':
      case 'ic_opamp':
        {
          const iw = def.width * CELL, ih = def.height * CELL
          const pinCount = Math.floor(ih / CELL)
          return (
            <>
              {/* IC body */}
              <Rect x={CELL * 0.4} y={0} width={iw - CELL * 0.8} height={ih} fill="#1a1a1a" stroke={isSelected ? '#facc15' : '#525252'} strokeWidth={isSelected ? 2 : 1} cornerRadius={1} />
              {/* Notch */}
              <Circle x={iw / 2} y={3} radius={3} fill="#1a1a1a" stroke="#525252" strokeWidth={0.5} />
              {/* Left pins */}
              {Array.from({ length: pinCount }, (_, i) => (
                <Rect key={`lp${i}`} x={0} y={i * CELL + CELL * 0.3} width={CELL * 0.4} height={3} fill="#c0c0c0" listening={false} />
              ))}
              {/* Right pins */}
              {Array.from({ length: pinCount }, (_, i) => (
                <Rect key={`rp${i}`} x={iw - CELL * 0.4} y={i * CELL + CELL * 0.3} width={CELL * 0.4} height={3} fill="#c0c0c0" listening={false} />
              ))}
              {/* Label */}
              <Text x={CELL * 0.6} y={ih / 2 - 4} text={def.label} fontSize={8} fill="#a3a3a3" fontStyle="bold" listening={false} />
            </>
          )
        }

      // === LOGIC GATES — triangle/shape with label ===
      case 'ic_logic_and':
      case 'ic_logic_or':
      case 'ic_logic_not':
        return (
          <>
            <Rect x={0} y={0} width={def.width * CELL} height={def.height * CELL}
              fill="#1f2937" stroke={isSelected ? '#facc15' : '#4b5563'} strokeWidth={isSelected ? 2 : 1} cornerRadius={2} />
            <Text x={CELL * 0.3} y={def.height * CELL / 2 - 5} text={def.label} fontSize={9} fill="#9ca3af" fontStyle="bold" listening={false} />
          </>
        )

      // === SENSORS — colored rect with label ===
      case 'sensor_ultrasonic':
        {
          const sw = def.width * CELL, sh = def.height * CELL
          return (
            <>
              <Rect x={0} y={0} width={sw} height={sh} fill="#164e63" stroke={isSelected ? '#facc15' : '#06b6d4'} strokeWidth={isSelected ? 2 : 1} cornerRadius={3} />
              {/* Two ultrasonic transducers */}
              <Circle x={sw * 0.3} y={sh / 2} radius={7} fill="#0e7490" stroke="#22d3ee" strokeWidth={1} />
              <Circle x={sw * 0.7} y={sh / 2} radius={7} fill="#0e7490" stroke="#22d3ee" strokeWidth={1} />
              {/* Pin header */}
              {[0, 1, 2, 3].map(i => (
                <Rect key={i} x={i * CELL + 2} y={sh - 3} width={3} height={5} fill="#fbbf24" listening={false} />
              ))}
              <Text x={2} y={2} text="HC-SR04" fontSize={6} fill="#67e8f9" listening={false} />
            </>
          )
        }
      case 'sensor_pir':
        {
          const sw = def.width * CELL, sh = def.height * CELL
          return (
            <>
              <Rect x={2} y={sh * 0.3} width={sw - 4} height={sh * 0.7} fill="#064e3b" stroke={isSelected ? '#facc15' : '#10b981'} strokeWidth={isSelected ? 2 : 1} cornerRadius={2} />
              {/* Fresnel lens dome */}
              <Circle x={sw / 2} y={sh * 0.35} radius={CELL * 0.7} fill="#d1fae5" stroke="#10b981" strokeWidth={1} opacity={0.6} />
              <Text x={4} y={sh - 10} text="PIR" fontSize={7} fill="#6ee7b7" listening={false} />
            </>
          )
        }
      case 'sensor_temp':
        {
          const sw = def.width * CELL, sh = def.height * CELL
          return (
            <>
              {/* TO-92 style */}
              <Rect x={sw / 2 - 8} y={2} width={16} height={sh - 8} fill="#1a1a1a" stroke={isSelected ? '#facc15' : '#f43f5e'} strokeWidth={isSelected ? 2 : 1} cornerRadius={[8, 8, 2, 2]} />
              <Line points={[sw * 0.2, sh - 6, sw * 0.2, sh + 2]} stroke="#c0c0c0" strokeWidth={2} />
              <Line points={[sw * 0.5, sh - 6, sw * 0.5, sh + 2]} stroke="#c0c0c0" strokeWidth={2} />
              <Line points={[sw * 0.8, sh - 6, sw * 0.8, sh + 2]} stroke="#c0c0c0" strokeWidth={2} />
              <Text x={sw / 2 - 8} y={sh / 2 - 6} text="TMP" fontSize={6} fill="#fda4af" listening={false} />
            </>
          )
        }
      case 'sensor_light':
      case 'sensor_tilt':
      case 'sensor_hall':
        return (
          <>
            <Circle x={CELL} y={CELL / 2} radius={CELL / 2 + 2} fill={fillColor + '30'} stroke={isSelected ? '#facc15' : fillColor} strokeWidth={isSelected ? 2 : 1.5} />
            <Line points={[CELL - 4, CELL + 4, CELL - 4, CELL + 10]} stroke="#c0c0c0" strokeWidth={1.5} />
            <Line points={[CELL + 4, CELL + 4, CELL + 4, CELL + 10]} stroke="#c0c0c0" strokeWidth={1.5} />
            <Text x={CELL - 8} y={CELL / 2 - 4} text={def.label} fontSize={6} fill={fillColor} fontStyle="bold" listening={false} />
          </>
        )

      // === MOTORS — circle with label ===
      case 'motor_dc':
      case 'motor_stepper':
        {
          const mw = def.width * CELL, mh = def.height * CELL
          return (
            <>
              <Rect x={CELL * 0.3} y={2} width={mw - CELL * 0.6} height={mh - 4} fill="#71717a" stroke={isSelected ? '#facc15' : '#a1a1aa'} strokeWidth={isSelected ? 2 : 1} cornerRadius={6} />
              <Rect x={mw - 4} y={mh / 2 - 2} width={8} height={4} fill="#d4d4d8" cornerRadius={1} />
              <Rect x={-2} y={mh * 0.25} width={5} height={3} fill="#fbbf24" listening={false} />
              <Rect x={-2} y={mh * 0.65} width={5} height={3} fill="#fbbf24" listening={false} />
              <Text x={mw / 2 - 4} y={mh / 2 - 4} text="M" fontSize={10} fill="#e4e4e7" fontStyle="bold" listening={false} />
            </>
          )
        }

      case 'servo':
        {
          const sw = def.width * CELL, sh = def.height * CELL
          return (
            <>
              <Rect x={0} y={2} width={sw} height={sh - 4} fill="#1e293b" stroke={isSelected ? '#facc15' : '#475569'} strokeWidth={isSelected ? 2 : 1} cornerRadius={2} />
              <Rect x={-3} y={sh / 2 - 3} width={3} height={6} fill="#334155" cornerRadius={1} />
              <Rect x={sw} y={sh / 2 - 3} width={3} height={6} fill="#334155" cornerRadius={1} />
              <Circle x={sw * 0.7} y={sh / 2} radius={6} fill="#475569" stroke="#64748b" strokeWidth={1} />
              <Circle x={sw * 0.7} y={sh / 2} radius={2} fill="#94a3b8" listening={false} />
              <Line points={[CELL * 0.3, sh - 2, CELL * 0.3, sh + 4]} stroke="#f97316" strokeWidth={1.5} />
              <Line points={[CELL * 0.6, sh - 2, CELL * 0.6, sh + 4]} stroke="#ef4444" strokeWidth={1.5} />
              <Line points={[CELL * 0.9, sh - 2, CELL * 0.9, sh + 4]} stroke="#854d0e" strokeWidth={1.5} />
              <Text x={4} y={4} text="SRV" fontSize={7} fill="#94a3b8" listening={false} />
            </>
          )
        }

      // === DISPLAYS ===
      case 'display_7seg':
        return (
          <>
            <Rect x={0} y={0} width={def.width * CELL} height={def.height * CELL}
              fill="#1c1917" stroke={isSelected ? '#facc15' : '#ef4444'} strokeWidth={isSelected ? 2 : 1.5} cornerRadius={3} />
            <Text x={CELL * 0.8} y={CELL} text="8." fontSize={20} fill="#ef4444" fontStyle="bold" listening={false} />
          </>
        )
      case 'lcd_16x2':
        return (
          <>
            <Rect x={0} y={0} width={def.width * CELL} height={def.height * CELL}
              fill="#064e3b" stroke={isSelected ? '#facc15' : '#22c55e'} strokeWidth={isSelected ? 2 : 1.5} cornerRadius={3} />
            <Rect x={CELL * 0.3} y={CELL * 0.4} width={def.width * CELL - CELL * 0.6} height={def.height * CELL - CELL * 0.8}
              fill="#166534" cornerRadius={2} />
            <Text x={CELL * 0.5} y={CELL * 0.7} text="Hello" fontSize={9} fill="#4ade80" listening={false} />
            <Text x={CELL * 0.5} y={CELL * 1.4} text="World" fontSize={9} fill="#4ade80" listening={false} />
          </>
        )

      // === BUZZER — circle with + ===
      case 'buzzer':
        return (
          <>
            <Circle x={CELL} y={CELL} radius={CELL - 2}
              fill="#854d0e" stroke={isSelected ? '#facc15' : '#eab308'} strokeWidth={isSelected ? 2 : 1.5} />
            <Text x={CELL - 4} y={CELL - 5} text="♪" fontSize={11} fill="#fde68a" listening={false} />
          </>
        )

      // === BATTERIES ===
      case 'battery_9v':
        {
          const bw = def.width * CELL, bh = def.height * CELL
          return (
            <>
              <Rect x={2} y={4} width={bw - 4} height={bh - 4} fill="#27272a" stroke={isSelected ? '#facc15' : '#52525b'} strokeWidth={isSelected ? 2 : 1} cornerRadius={3} />
              {/* Snap connectors */}
              <Circle x={bw * 0.3} y={2} radius={4} fill="#a3a3a3" stroke="#737373" strokeWidth={1} />
              <Circle x={bw * 0.7} y={2} radius={3} fill="#a3a3a3" stroke="#737373" strokeWidth={1} />
              <Text x={bw / 2 - 6} y={bh / 2 - 2} text="9V" fontSize={9} fill="#fbbf24" fontStyle="bold" listening={false} />
            </>
          )
        }
      case 'battery_coin':
        {
          const bw = def.width * CELL, bh = def.height * CELL
          return (
            <>
              <Circle x={bw / 2} y={bh / 2} radius={CELL - 1} fill="#d4d4d8" stroke={isSelected ? '#facc15' : '#a1a1aa'} strokeWidth={isSelected ? 2 : 1} />
              <Circle x={bw / 2} y={bh / 2} radius={CELL - 5} fill="#e4e4e7" listening={false} />
              <Text x={bw / 2 - 5} y={bh / 2 - 4} text="3V" fontSize={7} fill="#525252" fontStyle="bold" listening={false} />
              <Text x={bw / 2 + 4} y={bh / 2 - 8} text="+" fontSize={7} fill="#ef4444" listening={false} />
            </>
          )
        }

      // === TRANSISTORS / MOSFET ===
      case 'transistor_npn':
      case 'transistor_pnp':
      case 'mosfet':
        {
          const tw = def.width * CELL, th = def.height * CELL
          return (
            <>
              {/* TO-92 package - flat side + rounded */}
              <Rect x={tw / 2 - 8} y={2} width={16} height={th - 8} fill="#1a1a1a" stroke={isSelected ? '#facc15' : '#525252'} strokeWidth={isSelected ? 2 : 1} cornerRadius={[8, 8, 2, 2]} />
              {/* Three legs */}
              <Line points={[tw * 0.2, th - 6, tw * 0.2, th + 2]} stroke="#c0c0c0" strokeWidth={2} />
              <Line points={[tw * 0.5, th - 6, tw * 0.5, th + 2]} stroke="#c0c0c0" strokeWidth={2} />
              <Line points={[tw * 0.8, th - 6, tw * 0.8, th + 2]} stroke="#c0c0c0" strokeWidth={2} />
              {/* Flat face marking */}
              <Line points={[tw / 2 - 6, 4, tw / 2 + 6, 4]} stroke="#404040" strokeWidth={1} />
              <Text x={tw / 2 - 8} y={th / 2 - 6} text={def.label} fontSize={7} fill="#a3a3a3" fontStyle="bold" listening={false} />
            </>
          )
        }

      // === RELAY ===
      case 'relay':
        return (
          <>
            <Rect x={0} y={0} width={def.width * CELL} height={def.height * CELL}
              fill="#44403c" stroke={isSelected ? '#facc15' : '#78716c'} strokeWidth={isSelected ? 2 : 1.5} cornerRadius={3} />
            <Rect x={CELL * 0.3} y={CELL * 0.3} width={CELL * 1.4} height={CELL * 1.4}
              fill="#292524" cornerRadius={2} />
            <Text x={CELL * 0.4} y={CELL * 0.7} text="RL" fontSize={9} fill="#a8a29e" fontStyle="bold" listening={false} />
          </>
        )

      // === MODULES ===
      case 'hbridge':
        return (
          <>
            <Rect x={0} y={0} width={def.width * CELL} height={def.height * CELL}
              fill="#450a0a" stroke={isSelected ? '#facc15' : '#dc2626'} strokeWidth={isSelected ? 2 : 1.5} cornerRadius={3} />
            <Text x={CELL * 0.5} y={CELL * 1.2} text="H-Bridge" fontSize={8} fill="#fca5a5" fontStyle="bold" listening={false} />
          </>
        )
      case 'ir_receiver':
        return (
          <>
            <Rect x={0} y={0} width={def.width * CELL} height={def.height * CELL}
              fill="#3b0764" stroke={isSelected ? '#facc15' : '#a855f7'} strokeWidth={isSelected ? 2 : 1.5} cornerRadius={CELL} />
            <Text x={CELL * 0.4} y={CELL * 0.7} text="IR" fontSize={9} fill="#d8b4fe" fontStyle="bold" listening={false} />
          </>
        )

      // === GENERIC FALLBACK for new 2-pin types ===
      case 'power_supply':
        {
          const pw = def.width * CELL, ph = def.height * CELL
          return (
            <>
              <Rect x={0} y={0} width={pw} height={ph} fill="#450a0a" stroke={isSelected ? '#facc15' : '#dc2626'} strokeWidth={isSelected ? 2 : 1} cornerRadius={3} />
              <Text x={4} y={4} text="+" fontSize={10} fill="#ef4444" fontStyle="bold" listening={false} />
              <Text x={pw - 12} y={4} text="−" fontSize={12} fill="#3b82f6" fontStyle="bold" listening={false} />
              <Text x={pw / 2 - 8} y={ph / 2} text="DC" fontSize={8} fill="#fca5a5" listening={false} />
            </>
          )
        }
      case 'voltage_reg':
        {
          const vw = def.width * CELL, vh = def.height * CELL
          return (
            <>
              <Rect x={vw / 2 - 10} y={2} width={20} height={vh - 8} fill="#1a1a1a" stroke={isSelected ? '#facc15' : '#1e40af'} strokeWidth={isSelected ? 2 : 1} cornerRadius={[6, 6, 1, 1]} />
              {/* Metal tab */}
              <Rect x={vw / 2 - 12} y={2} width={24} height={6} fill="#a3a3a3" cornerRadius={[3, 3, 0, 0]} />
              <Circle x={vw / 2} y={5} radius={2} fill="#737373" listening={false} />
              <Line points={[vw * 0.2, vh - 6, vw * 0.2, vh + 2]} stroke="#c0c0c0" strokeWidth={2} />
              <Line points={[vw * 0.5, vh - 6, vw * 0.5, vh + 2]} stroke="#c0c0c0" strokeWidth={2} />
              <Line points={[vw * 0.8, vh - 6, vw * 0.8, vh + 2]} stroke="#c0c0c0" strokeWidth={2} />
            </>
          )
        }
      case 'inductor':
        {
          const iw = 3 * CELL
          return (
            <>
              <Line points={[0, 0, CELL * 0.4, 0]} stroke="#9ca3af" strokeWidth={1.5} />
              <Line points={[iw - CELL * 0.4, 0, iw, 0]} stroke="#9ca3af" strokeWidth={1.5} />
              {/* Coil humps */}
              {[0.4, 0.55, 0.7, 0.85].map((p, i) => (
                <Circle key={i} x={iw * p} y={0} radius={CELL * 0.18} fill="none" stroke="#059669" strokeWidth={2} listening={false} />
              ))}
            </>
          )
        }
      case 'potentiometer':
        {
          const pw = def.width * CELL, ph = def.height * CELL
          return (
            <>
              <Rect x={CELL * 0.3} y={CELL * 0.5} width={pw - CELL * 0.6} height={ph - CELL} fill="#155e75" stroke={isSelected ? '#facc15' : '#0891b2'} strokeWidth={isSelected ? 2 : 1} cornerRadius={3} />
              {/* Knob */}
              <Circle x={pw / 2} y={CELL * 0.3} radius={5} fill="#a3a3a3" stroke="#737373" strokeWidth={1} />
              <Line points={[pw / 2, CELL * 0.3 - 3, pw / 2, CELL * 0.3 + 3]} stroke="#525252" strokeWidth={1.5} />
              <Text x={CELL * 0.5} y={ph - CELL * 0.3} text="POT" fontSize={7} fill="#67e8f9" listening={false} />
            </>
          )
        }
      case 'photoresistor':
        return (
          <>
            <Circle x={CELL} y={0} radius={CELL / 2 + 2} fill="#365314" stroke={isSelected ? '#facc15' : '#84cc16'} strokeWidth={isSelected ? 2 : 1.5} />
            {/* Squiggle pattern */}
            <Line points={[CELL - 4, -3, CELL + 4, 3]} stroke="#a3e635" strokeWidth={1} />
            <Line points={[CELL - 4, 3, CELL + 4, -3]} stroke="#a3e635" strokeWidth={1} />
            <Line points={[CELL - 4, CELL / 2 + 4, CELL - 4, CELL + 4]} stroke="#c0c0c0" strokeWidth={1.5} />
            <Line points={[CELL + 4, CELL / 2 + 4, CELL + 4, CELL + 4]} stroke="#c0c0c0" strokeWidth={1.5} />
          </>
        )
      case 'thermistor':
        return (
          <>
            <Rect x={CELL * 0.3} y={-CELL / 2} width={CELL * 1.4} height={CELL} fill="#431407" stroke={isSelected ? '#facc15' : '#f97316'} strokeWidth={isSelected ? 2 : 1} cornerRadius={3} />
            <Line points={[0, 0, CELL * 0.3, 0]} stroke="#c0c0c0" strokeWidth={1.5} />
            <Line points={[CELL * 1.7, 0, 2 * CELL, 0]} stroke="#c0c0c0" strokeWidth={1.5} />
            <Text x={CELL * 0.5} y={-3} text="NTC" fontSize={6} fill="#fdba74" listening={false} />
          </>
        )
      case 'switch_slide':
      case 'switch_toggle':
        {
          const sw = def.width * CELL
          return (
            <>
              <Rect x={CELL * 0.2} y={-CELL / 2} width={sw - CELL * 0.4} height={CELL} fill="#3f3f46" stroke={isSelected ? '#facc15' : '#71717a'} strokeWidth={isSelected ? 2 : 1} cornerRadius={CELL / 2} />
              {/* Slider knob */}
              <Circle x={CELL} y={0} radius={CELL / 2 - 2} fill="#a1a1aa" stroke="#d4d4d8" strokeWidth={1} />
              <Line points={[0, 0, CELL * 0.2, 0]} stroke="#c0c0c0" strokeWidth={1.5} />
              <Line points={[sw - CELL * 0.2, 0, sw, 0]} stroke="#c0c0c0" strokeWidth={1.5} />
            </>
          )
        }
      case 'keypad':
        {
          const kw = def.width * CELL, kh = def.height * CELL
          return (
            <>
              <Rect x={0} y={0} width={kw} height={kh} fill="#27272a" stroke={isSelected ? '#facc15' : '#52525b'} strokeWidth={isSelected ? 2 : 1} cornerRadius={3} />
              {/* 4x4 button grid */}
              {Array.from({ length: 4 }, (_, r) =>
                Array.from({ length: 4 }, (_, c) => (
                  <Rect key={`${r}${c}`} x={c * CELL + 3} y={r * CELL + 3} width={CELL - 6} height={CELL - 6} fill="#3f3f46" cornerRadius={2} listening={false} />
                ))
              )}
            </>
          )
        }
      case 'led_rgb':
        {
          const rw = def.width * CELL
          return (
            <>
              <Circle x={rw / 2} y={CELL} radius={CELL - 2} fill="#ffffff20" stroke={isSelected ? '#facc15' : '#a855f7'} strokeWidth={isSelected ? 2 : 1.5} />
              <Circle x={rw / 2 - 3} y={CELL - 2} radius={3} fill="#ef4444" opacity={0.7} listening={false} />
              <Circle x={rw / 2 + 3} y={CELL - 2} radius={3} fill="#22c55e" opacity={0.7} listening={false} />
              <Circle x={rw / 2} y={CELL + 3} radius={3} fill="#3b82f6" opacity={0.7} listening={false} />
              {/* 4 legs */}
              {[0, 1, 2].map(i => (
                <Line key={i} points={[i * CELL * 0.5 + 4, 0, i * CELL * 0.5 + 4, -4]} stroke="#c0c0c0" strokeWidth={1.5} listening={false} />
              ))}
              <Line points={[rw / 2, CELL * 2, rw / 2, CELL * 2 + 4]} stroke="#c0c0c0" strokeWidth={1.5} />
            </>
          )
        }
      default:
        // resistor: 3×1 body with color bands
        {
          const bands = getResistorBands(component.value)
          const bodyW = 3 * CELL
          const bodyH = CELL
          const bandW = 4
          const bandPositions = [0.2, 0.35, 0.5, 0.75] // relative positions along body
          return (
            <>
              {/* Lead wires */}
              <Line points={[0, 0, bodyW * 0.1, 0]} stroke="#9ca3af" strokeWidth={1.5} />
              <Line points={[bodyW * 0.9, 0, bodyW, 0]} stroke="#9ca3af" strokeWidth={1.5} />
              {/* Body */}
              <Rect
                x={bodyW * 0.1}
                y={-halfCell}
                width={bodyW * 0.8}
                height={bodyH}
                fill="#d2b48c"
                stroke={isSelected ? '#facc15' : '#b8956a'}
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={3}
              />
              {/* Color bands */}
              {bands.map((color, i) => (
                <Rect
                  key={i}
                  x={bodyW * bandPositions[i] - bandW / 2}
                  y={-halfCell + 2}
                  width={bandW}
                  height={bodyH - 4}
                  fill={color}
                  cornerRadius={1}
                  listening={false}
                />
              ))}
            </>
          )
        }
    }
  }

  // Render pin dots — in default orientation, Group rotation handles the rest
  const renderPins = () => {
    return Object.entries(def.pins).map(([pinName, [offCol, offRow]]) => {
      const px = offCol * CELL
      const py = offRow * CELL
      const isThisPinSelected =
        selectedPin &&
        selectedPin.componentId === component.id &&
        selectedPin.pinName === pinName
      return (
        <Circle
          key={pinName}
          x={px}
          y={py}
          radius={4}
          fill={isThisPinSelected ? '#facc15' : '#e5e7eb'}
          stroke={isThisPinSelected ? '#facc15' : '#9ca3af'}
          strokeWidth={1}
          onMouseEnter={(e) => {
            e.target.to({ radius: 6, duration: 0.1 })
            const container = e.target.getStage().container()
            container.style.cursor = mode === 'manual' ? 'crosshair' : 'pointer'
          }}
          onMouseLeave={(e) => {
            e.target.to({ radius: 4, duration: 0.1 })
            const container = e.target.getStage().container()
            container.style.cursor = 'default'
          }}
          onClick={(e) => {
            e.cancelBubble = true
            if (onPinClick) onPinClick(component.id, pinName)
          }}
        />
      )
    })
  }

  return (
    <Group
      x={x}
      y={y}
      rotation={rotation}
      draggable={isDraggable}
      onDragEnd={(e) => {
        if (!onMove) return
        const node = e.target
        const newCol = Math.round((node.x() - CELL) / CELL)
        const newRow = Math.round((node.y() - CELL) / CELL)
        onMove(component.id, component.type, newCol, newRow, component.rotation)
        node.position({ x, y })
      }}
      onClick={() => onSelect && onSelect(component.id)}
      onMouseEnter={(e) => {
        const container = e.target.getStage().container()
        container.style.cursor = isDraggable ? 'grab' : 'pointer'
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage().container()
        container.style.cursor = 'default'
      }}
    >
      {renderShape()}
      {renderPins()}
      <Text
        x={0}
        y={labelY}
        text={`${component.id}${component.value ? ` (${component.value})` : ''}`}
        fontSize={10}
        fill="#9ca3af"
        listening={false}
      />
    </Group>
  )
}
